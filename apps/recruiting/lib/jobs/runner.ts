import { prisma } from "@/lib/db";
import { LineApiError } from "@/lib/line/client";
import { processWebhookEvent, sendTemplateToCandidate } from "@/lib/line/handlers";
import { captureError } from "@/lib/observability";
import {
  claimJobs,
  completeJob,
  failJob,
  recoverStaleJobs,
  type QueuedJob,
} from "./queue";

/**
 * ジョブの実行。
 * Webhook 受信直後にも短時間だけ呼び、Cron（毎分）でも呼ぶ。
 * どちらか一方が落ちても、もう一方が拾うため取りこぼさない。
 */

type JobPayload = Record<string, unknown>;

async function runJob(job: QueuedJob): Promise<void> {
  const payload = (job.payload ?? {}) as JobPayload;

  switch (job.kind) {
    case "process_webhook": {
      const webhookEventId = String(payload.webhookEventId ?? "");
      if (!webhookEventId) throw new Error("webhookEventId がありません");
      try {
        await processWebhookEvent(webhookEventId);
      } catch (error) {
        // 何が失敗したかを Webhook 側にも残しておく（再処理の手がかり）
        await prisma.webhookEvent
          .update({
            where: { id: webhookEventId },
            data: {
              processError: error instanceof Error ? error.message : String(error),
            },
          })
          .catch(() => undefined);
        throw error;
      }
      break;
    }

    case "push": {
      const candidateId = String(payload.candidateId ?? "");
      const templateId = String(payload.templateId ?? "");
      if (!candidateId || !templateId) {
        throw new Error("candidateId / templateId がありません");
      }
      await sendTemplateToCandidate(candidateId, templateId, {
        sourceKind: typeof payload.sourceKind === "string" ? payload.sourceKind : "auto",
        sourceId: typeof payload.sourceId === "string" ? payload.sourceId : null,
        // 通信断で結果を取り逃しても、LINE 側で二重送信にならないようにする
        retryKey: job.id,
      });
      break;
    }

    default:
      // scenario_step / broadcast_chunk は Phase 2 で実装する
      throw new Error(`未実装のジョブ種別です: ${job.kind}`);
  }
}

export async function processDueJobs(
  options: { maxJobs?: number; budgetMs?: number } = {},
): Promise<{ processed: number; failed: number; recovered: number }> {
  const maxJobs = options.maxJobs ?? 20;
  const budgetMs = options.budgetMs ?? 20_000;
  const deadline = Date.now() + budgetMs;

  const recovered = await recoverStaleJobs();

  let processed = 0;
  let failed = 0;

  while (processed + failed < maxJobs && Date.now() < deadline) {
    const jobs = await claimJobs(1);
    if (jobs.length === 0) break;

    for (const job of jobs) {
      try {
        await runJob(job);
        await completeJob(job.id);
        processed++;
      } catch (error) {
        const permanent =
          error instanceof LineApiError
            ? error.isPermanent
            : error instanceof Error && error.message.startsWith("未実装のジョブ種別");
        await failJob(job.id, error, { permanent });
        failed++;
      }
    }
  }

  return { processed, failed, recovered };
}

/** Webhook 応答を遅らせないよう、短い時間だけ処理を試みる */
export async function processInline(): Promise<void> {
  try {
    await processDueJobs({ maxJobs: 5, budgetMs: 2_500 });
  } catch (error) {
    // ここで失敗しても Cron が拾うため、記録のみ
    captureError(error, { scope: "jobs.processInline" });
  }
}
