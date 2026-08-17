import { prisma } from "@/lib/db";
import { cancelPendingJobsForCandidate, enqueue } from "@/lib/jobs/queue";
import { captureError, captureMessage } from "@/lib/observability";
import { setCandidateStage } from "@/lib/pipeline/stage";
import { saveMedia } from "@/lib/storage";
import { addTagById, addTagByName } from "@/lib/tags";
import { getMessageContent, getProfile, isDryRun, pushMessages } from "./client";
import { getTemplateIdBySetting, renderTemplate } from "./templates";
import {
  hasDownloadableContent,
  parsePostbackData,
  toMessageType,
  type LineEvent,
} from "./types";

/**
 * Webhook イベントの処理本体。
 * Webhook 受信時は保存のみを行い、実際の処理はここで（ジョブ経由で）実行する。
 */

/** 友だち追加時に付与するタグ */
const TAG_LINE_REGISTERED = "LINE登録";

/** 初回挨拶テンプレートの設定キー */
const SETTING_GREETING_TEMPLATE = "line.greeting_template_id";

// ------------------------------------------------------------
// 候補者の解決
// ------------------------------------------------------------

/**
 * LINE ユーザーIDから候補者を取得する。無ければ作成する。
 * 友だち追加の時点で候補者レコードを作り、フェーズ「LINE登録」から管理する。
 */
export async function ensureCandidateForLineUser(
  lineUserId: string,
  options: { syncProfile?: boolean } = {},
): Promise<{ candidateId: string; created: boolean }> {
  const existing = await prisma.lineFriend.findUnique({
    where: { lineUserId },
    select: { candidateId: true },
  });

  if (existing) {
    if (options.syncProfile) await syncProfile(lineUserId);
    return { candidateId: existing.candidateId, created: false };
  }

  const stage = await prisma.pipelineStage.findUnique({
    where: { code: "line_registered" },
    select: { id: true },
  });

  if (!stage) {
    throw new Error(
      "選考フェーズの初期データがありません。npm run db:seed を実行してください",
    );
  }

  const profile = await getProfile(lineUserId).catch((error) => {
    // プロフィール取得に失敗しても登録自体は進める（後で同期できる）
    captureError(error, { scope: "line.getProfile", lineUserId });
    return null;
  });

  const now = new Date();

  const candidate = await prisma.candidate.create({
    data: {
      displayName: profile?.displayName ?? null,
      stageId: stage.id,
      stageChangedAt: now,
      registrationSource: "line",
      source: "line",
      lineFriendAt: now,
      lineFriend: {
        create: {
          lineUserId,
          displayName: profile?.displayName ?? null,
          pictureUrl: profile?.pictureUrl ?? null,
          statusMessage: profile?.statusMessage ?? null,
          language: profile?.language ?? null,
          followedAt: now,
          profileSyncedAt: profile ? now : null,
        },
      },
      stageHistories: {
        create: {
          toStageId: stage.id,
          changedVia: "system",
          note: "LINE友だち追加",
          changedAt: now,
        },
      },
      // 受信メッセージが来るまでは「未対応」にしない（トーク一覧を汚さないため）
      conversation: { create: { handlingStatus: "done" } },
    },
    select: { id: true },
  });

  return { candidateId: candidate.id, created: true };
}

/** プロフィールを取り直して保存する */
export async function syncProfile(lineUserId: string): Promise<void> {
  try {
    const profile = await getProfile(lineUserId);
    await prisma.lineFriend.update({
      where: { lineUserId },
      data: {
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl ?? null,
        statusMessage: profile.statusMessage ?? null,
        language: profile.language ?? null,
        profileSyncedAt: new Date(),
        candidate: { update: { displayName: profile.displayName } },
      },
    });
  } catch (error) {
    captureError(error, { scope: "line.syncProfile", lineUserId });
  }
}

// ------------------------------------------------------------
// 送信（履歴を必ず残す）
// ------------------------------------------------------------

export async function sendTemplateToCandidate(
  candidateId: string,
  templateId: string,
  options: {
    sourceKind?: string;
    sourceId?: string | null;
    sentByUserId?: string | null;
    retryKey?: string;
  } = {},
): Promise<{ sent: boolean; dryRun: boolean; messageCount: number }> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: {
      displayName: true,
      fullName: true,
      lineFriend: { select: { lineUserId: true, isBlocked: true } },
    },
  });

  if (!candidate?.lineFriend) {
    throw new Error("LINE 未連携の候補者には送信できません");
  }

  if (candidate.lineFriend.isBlocked) {
    captureMessage("ブロック済みのため送信しません", { candidateId });
    return { sent: false, dryRun: isDryRun(), messageCount: 0 };
  }

  const messages = await renderTemplate(templateId, {
    name: candidate.fullName ?? candidate.displayName ?? "",
  });

  if (messages.length === 0) {
    return { sent: false, dryRun: isDryRun(), messageCount: 0 };
  }

  const result = await pushMessages(
    candidate.lineFriend.lineUserId,
    messages,
    { retryKey: options.retryKey },
  );

  const now = new Date();
  await prisma.$transaction([
    prisma.message.createMany({
      data: messages.map((message) => ({
        candidateId,
        direction: "outbound",
        messageType: message.type,
        text: message.type === "text" ? message.text : null,
        templateId,
        sendChannel: "push",
        sourceKind: options.sourceKind ?? "auto",
        sourceId: options.sourceId ?? null,
        sentByUserId: options.sentByUserId ?? null,
        status: "sent",
        error: result.dryRun ? "DRY_RUN（実送信なし）" : null,
        sentAt: now,
      })),
    }),
    prisma.conversation.upsert({
      where: { candidateId },
      create: { candidateId, lastMessageAt: now },
      update: { lastMessageAt: now },
    }),
    prisma.candidate.update({
      where: { id: candidateId },
      data: { lastContactAt: now },
    }),
  ]);

  return { ...result, messageCount: messages.length };
}

// ------------------------------------------------------------
// イベント別の処理
// ------------------------------------------------------------

export async function handleFollow(event: LineEvent): Promise<void> {
  const lineUserId = event.source?.userId;
  if (!lineUserId) return;

  const { candidateId, created } = await ensureCandidateForLineUser(lineUserId, {
    syncProfile: true,
  });

  // ブロック解除で再度友だちになった場合は配信対象へ戻す
  await prisma.lineFriend.update({
    where: { lineUserId },
    data: { isBlocked: false, unfollowedAt: null },
  });

  await addTagByName(candidateId, TAG_LINE_REGISTERED, "system");

  // 挨拶 → アンケート案内。フェーズは「アンケート未回答」へ進める
  const greetingTemplateId = await getTemplateIdBySetting(
    SETTING_GREETING_TEMPLATE,
  );

  if (greetingTemplateId) {
    await enqueue(
      "push",
      { candidateId, templateId: greetingTemplateId, sourceKind: "auto" },
      {
        candidateId,
        // 同じ友だちに挨拶を二重送信しない
        idempotencyKey: `greeting:${lineUserId}`,
        priority: 10,
      },
    );
  } else {
    captureMessage("挨拶テンプレートが未設定のため送信しません", { candidateId });
  }

  await setCandidateStage(candidateId, "survey_pending", {
    changedVia: "system",
    note: created ? "友だち追加" : "ブロック解除",
    onlyForward: true,
  });
}

export async function handleUnfollow(event: LineEvent): Promise<void> {
  const lineUserId = event.source?.userId;
  if (!lineUserId) return;

  const friend = await prisma.lineFriend.findUnique({
    where: { lineUserId },
    select: { candidateId: true },
  });
  if (!friend) return;

  await prisma.lineFriend.update({
    where: { lineUserId },
    data: { isBlocked: true, unfollowedAt: new Date() },
  });

  // 送信待ちのジョブは無駄打ちになるため取り消す
  await cancelPendingJobsForCandidate(friend.candidateId, "ブロックされたため");
}

export async function handleMessage(
  event: LineEvent,
  webhookEventId: string,
): Promise<void> {
  const lineUserId = event.source?.userId;
  if (!lineUserId || !event.message) return;

  const { candidateId } = await ensureCandidateForLineUser(lineUserId);

  const messageType = toMessageType(event.message.type);
  const sentAt = event.timestamp ? new Date(event.timestamp) : new Date();

  let mediaPath: string | null = null;
  if (hasDownloadableContent(event.message.type)) {
    mediaPath = await downloadMedia(event.message.id, event.message.type);
  }

  const text =
    event.message.type === "text"
      ? (event.message.text ?? null)
      : placeholderText(event.message.type);

  await prisma.$transaction([
    prisma.message.create({
      data: {
        candidateId,
        direction: "inbound",
        messageType,
        text,
        mediaPath,
        lineMessageId: event.message.id,
        webhookEventId,
        status: "sent",
        sentAt,
      },
    }),
    prisma.conversation.upsert({
      where: { candidateId },
      create: {
        candidateId,
        lastMessageAt: sentAt,
        lastInboundAt: sentAt,
        unreadCount: 1,
        handlingStatus: "unhandled",
      },
      update: {
        lastMessageAt: sentAt,
        lastInboundAt: sentAt,
        unreadCount: { increment: 1 },
        handlingStatus: "unhandled",
      },
    }),
    prisma.candidate.update({
      where: { id: candidateId },
      data: { lastContactAt: sentAt },
    }),
  ]);
}

export async function handlePostback(event: LineEvent): Promise<void> {
  const lineUserId = event.source?.userId;
  if (!lineUserId || !event.postback) return;

  const { candidateId } = await ensureCandidateForLineUser(lineUserId);
  const data = parsePostbackData(event.postback.data);

  if (!data) {
    captureMessage("解釈できない postback を受信しました", {
      candidateId,
      data: event.postback.data.slice(0, 200),
    });
    return;
  }

  switch (data.a) {
    case "add_tag":
      if (data.id) await addTagById(candidateId, data.id, "rich_menu");
      break;
    case "send_template":
      if (data.id) {
        await enqueue(
          "push",
          { candidateId, templateId: data.id, sourceKind: "rich_menu" },
          { candidateId, priority: 20 },
        );
      }
      break;
    // start_scenario / switch_rich_menu / open_form は Phase 2 以降で実装する
    default:
      captureMessage("未実装の postback アクションです", {
        candidateId,
        action: data.a,
      });
  }
}

async function downloadMedia(
  messageId: string,
  lineType: string | undefined,
): Promise<string | null> {
  try {
    const { buffer, contentType } = await getMessageContent(messageId);
    const extension = contentType.split("/")[1]?.split(";")[0] ?? "bin";
    return await saveMedia(
      `inbound/${messageId}.${extension}`,
      buffer,
      contentType,
    );
  } catch (error) {
    captureError(error, { scope: "line.downloadMedia", messageId, lineType });
    return null;
  }
}

function placeholderText(lineType: string | undefined): string {
  switch (lineType) {
    case "image":
      return "[画像]";
    case "video":
      return "[動画]";
    case "audio":
      return "[音声]";
    case "file":
      return "[ファイル]";
    case "sticker":
      return "[スタンプ]";
    case "location":
      return "[位置情報]";
    default:
      return `[${lineType ?? "不明なメッセージ"}]`;
  }
}

// ------------------------------------------------------------
// ディスパッチ
// ------------------------------------------------------------

export async function processWebhookEvent(webhookEventId: string): Promise<void> {
  const record = await prisma.webhookEvent.findUnique({
    where: { id: webhookEventId },
  });

  if (!record) return;
  if (record.processedAt) return; // 二重処理を防ぐ

  const event = record.payload as LineEvent;

  switch (record.type) {
    case "follow":
      await handleFollow(event);
      break;
    case "unfollow":
      await handleUnfollow(event);
      break;
    case "message":
      await handleMessage(event, record.id);
      break;
    case "postback":
      await handlePostback(event);
      break;
    default:
      // 記録のみ（join / leave / beacon など）
      break;
  }

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { processedAt: new Date(), processError: null },
  });
}
