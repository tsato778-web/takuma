import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { captureError } from "@/lib/observability";

/**
 * 送信・後処理のジョブキュー。
 *
 * LINE への送信と Webhook の後処理をすべてここに集約し、
 * 「取りこぼさない・二重に実行しない・失敗したら再試行する」を1箇所で担保する。
 */

export type JobKind =
  | "process_webhook"
  | "push"
  | "scenario_step"
  | "broadcast_chunk";

export type QueuedJob = {
  id: string;
  kind: string;
  payload: Prisma.JsonValue;
  candidateId: string | null;
  attempts: number;
};

/** 再試行の待ち時間（分）。回数が増えるほど間隔を空ける */
const BACKOFF_MINUTES = [1, 5, 30, 120, 360];
export const MAX_ATTEMPTS = 5;

export function backoffMinutes(attempts: number): number {
  const index = Math.min(Math.max(attempts - 1, 0), BACKOFF_MINUTES.length - 1);
  return BACKOFF_MINUTES[index];
}

/** 処理中のまま放置されたジョブを戻すまでの時間 */
const STALE_LOCK_MINUTES = 5;

export async function enqueue(
  kind: JobKind,
  payload: Record<string, unknown>,
  options: {
    candidateId?: string | null;
    runAt?: Date;
    idempotencyKey?: string;
    priority?: number;
  } = {},
): Promise<string | null> {
  try {
    const job = await prisma.messageJob.create({
      data: {
        kind,
        payload: payload as Prisma.InputJsonValue,
        candidateId: options.candidateId ?? null,
        runAt: options.runAt ?? new Date(),
        idempotencyKey: options.idempotencyKey,
        priority: options.priority ?? 100,
      },
      select: { id: true },
    });
    return job.id;
  } catch (error) {
    // idempotencyKey の重複 = 既に登録済みなので正常系として扱う
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * 実行対象のジョブを取り出す。
 * FOR UPDATE SKIP LOCKED により、Cron と Webhook が同時に動いても
 * 同じジョブを二重に処理しない。
 */
export async function claimJobs(limit: number): Promise<QueuedJob[]> {
  const rows = await prisma.$queryRaw<QueuedJob[]>`
    UPDATE "MessageJob" AS j
    SET status = 'processing',
        "lockedAt" = NOW(),
        attempts = j.attempts + 1,
        "updatedAt" = NOW()
    FROM (
      SELECT id FROM "MessageJob"
      WHERE status = 'pending' AND "runAt" <= NOW()
      ORDER BY priority ASC, "runAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    ) AS picked
    WHERE j.id = picked.id
    RETURNING j.id, j.kind, j.payload, j."candidateId", j.attempts
  `;
  return rows;
}

export async function completeJob(id: string): Promise<void> {
  await prisma.messageJob.update({
    where: { id },
    data: { status: "done", lastError: null, lockedAt: null },
  });
}

/**
 * 失敗を記録する。
 * 恒久エラー（permanent）と試行回数超過は failed にし、それ以外は待ってから再試行する。
 */
export async function failJob(
  id: string,
  error: unknown,
  options: { permanent?: boolean } = {},
): Promise<void> {
  const job = await prisma.messageJob.findUnique({
    where: { id },
    select: { attempts: true },
  });
  const attempts = job?.attempts ?? MAX_ATTEMPTS;
  const message = error instanceof Error ? error.message : String(error);
  const giveUp = options.permanent || attempts >= MAX_ATTEMPTS;

  await prisma.messageJob.update({
    where: { id },
    data: giveUp
      ? { status: "failed", lastError: message, lockedAt: null }
      : {
          status: "pending",
          lastError: message,
          lockedAt: null,
          runAt: new Date(Date.now() + backoffMinutes(attempts) * 60_000),
        },
  });

  captureError(error, { scope: "jobs.fail", jobId: id, attempts, giveUp });
}

/** 処理中のまま止まったジョブを pending に戻す */
export async function recoverStaleJobs(): Promise<number> {
  const threshold = new Date(Date.now() - STALE_LOCK_MINUTES * 60_000);
  const result = await prisma.messageJob.updateMany({
    where: { status: "processing", lockedAt: { lt: threshold } },
    data: { status: "pending", lockedAt: null },
  });
  return result.count;
}

/** 候補者に紐づく未実行ジョブを取り消す（ブロックされた場合など） */
export async function cancelPendingJobsForCandidate(
  candidateId: string,
  reason: string,
): Promise<number> {
  const result = await prisma.messageJob.updateMany({
    where: { candidateId, status: "pending", kind: { not: "process_webhook" } },
    data: { status: "canceled", lastError: reason },
  });
  return result.count;
}
