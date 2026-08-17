import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { enqueue } from "@/lib/jobs/queue";
import { processInline } from "@/lib/jobs/runner";
import { verifyLineSignature } from "@/lib/line/signature";
import { lineWebhookBodySchema } from "@/lib/line/types";
import { captureError, captureMessage } from "@/lib/observability";

export const dynamic = "force-dynamic";

/**
 * LINE Webhook の受信口。
 *
 *   署名検証 → 生ログ保存（重複排除）→ ジョブ登録 → 即 200
 *
 * 重い処理はジョブ側で行う。応答が遅れると LINE 側で配信エラー扱いになるため、
 * ここでは DB への書き込み以外を行わない（短時間の処理だけ試みる）。
 */
export async function POST(request: Request): Promise<Response> {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  // 署名検証には生のボディが必要（パース後に再生成すると一致しない）
  const rawBody = await request.text();

  if (!channelSecret) {
    captureMessage("LINE_CHANNEL_SECRET が未設定のため Webhook を処理できません");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const signature = request.headers.get("x-line-signature");
  if (!verifyLineSignature(rawBody, signature, channelSecret)) {
    captureMessage("LINE Webhook の署名が一致しませんでした");
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const parsed = lineWebhookBodySchema.safeParse(JSON.parse(rawBody || "{}"));
  if (!parsed.success) {
    captureError(parsed.error, { scope: "line.webhook.parse" });
    // 形式が想定外でも 200 を返す（LINE 側の再送を無限に受けないため）
    return NextResponse.json({ ok: true, ignored: true });
  }

  let accepted = 0;

  for (const event of parsed.data.events) {
    try {
      const record = await prisma.webhookEvent.create({
        data: {
          lineEventId: event.webhookEventId ?? null,
          type: event.type,
          lineUserId: event.source?.userId ?? null,
          payload: event as unknown as Prisma.InputJsonValue,
          signatureValid: true,
        },
        select: { id: true },
      });

      await enqueue(
        "process_webhook",
        { webhookEventId: record.id },
        {
          idempotencyKey: event.webhookEventId
            ? `webhook:${event.webhookEventId}`
            : undefined,
          priority: 10,
        },
      );
      accepted++;
    } catch (error) {
      // 同じ webhookEventId は再送。既に受け付けているので何もしない
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      captureError(error, { scope: "line.webhook.store", type: event.type });
    }
  }

  // 挨拶の到着を待たせないよう、短時間だけその場で処理する（残りは Cron が拾う）
  if (accepted > 0) await processInline();

  return NextResponse.json({ ok: true, accepted });
}

/** ブラウザ等からの疎通確認用 */
export async function GET(): Promise<Response> {
  return NextResponse.json({
    ok: true,
    message: "LINE Webhook エンドポイントです（POST のみ処理します）",
  });
}
