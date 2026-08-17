import { randomUUID } from "node:crypto";
import { captureError, captureMessage } from "@/lib/observability";
import type { LineMessage, LineProfile } from "./types";

const API_BASE = "https://api.line.me";
const DATA_API_BASE = "https://api-data.line.me";

export class LineApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "LineApiError";
  }

  /** リトライしても回復しないエラーか（ブロック済み・不正なリクエスト等） */
  get isPermanent(): boolean {
    return this.status >= 400 && this.status < 500 && this.status !== 429;
  }
}

function accessToken(): string | null {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN || null;
}

/**
 * 実送信を行わないモード。
 * 既定は true（誤送信防止）。実送信テストのときだけ明示的に false にする。
 *
 * 送信のみを止める設定であり、プロフィール取得などの読み取りは通常どおり行う。
 */
export function isDryRun(): boolean {
  return process.env.LINE_DRY_RUN !== "false";
}

export function isLineConfigured(): boolean {
  return Boolean(process.env.LINE_CHANNEL_SECRET && accessToken());
}

async function callApi(
  path: string,
  init: RequestInit & { base?: string } = {},
): Promise<Response> {
  const token = accessToken();
  if (!token) {
    throw new LineApiError("LINE_CHANNEL_ACCESS_TOKEN が未設定です", 0);
  }

  const { base = API_BASE, headers, ...rest } = init;
  const res = await fetch(`${base}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      ...headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new LineApiError(
      `LINE API エラー: ${res.status} ${path}`,
      res.status,
      body.slice(0, 500),
    );
  }

  return res;
}

// ------------------------------------------------------------
// 読み取り系（DRY_RUN でも実行する）
// ------------------------------------------------------------

/**
 * 友だちのプロフィールを取得する。
 * アクセストークン未設定時は、動作確認できるよう仮のプロフィールを返す
 * （実データではないことが分かる表示名にする）。
 */
export async function getProfile(userId: string): Promise<LineProfile> {
  if (!accessToken()) {
    return {
      userId,
      displayName: `未連携ユーザー(${userId.slice(-6)})`,
    };
  }

  const res = await callApi(`/v2/bot/profile/${encodeURIComponent(userId)}`);
  const json = (await res.json()) as LineProfile;
  return { ...json, userId };
}

/** メッセージのメディア本体を取得する */
export async function getMessageContent(
  messageId: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await callApi(
    `/v2/bot/message/${encodeURIComponent(messageId)}/content`,
    { base: DATA_API_BASE },
  );
  const arrayBuffer = await res.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
  };
}

/** チャネルの疎通確認（設定画面の「接続確認」で使用） */
export async function getBotInfo(): Promise<{
  userId: string;
  basicId: string;
  displayName: string;
  pictureUrl?: string;
  chatMode: string;
  markAsReadMode: string;
}> {
  const res = await callApi("/v2/bot/info");
  return res.json();
}

/** 当月の無料メッセージ残数 */
export async function getMessageQuota(): Promise<{
  type: string;
  value?: number;
}> {
  const res = await callApi("/v2/bot/message/quota");
  return res.json();
}

export async function getMessageQuotaConsumption(): Promise<{
  totalUsage: number;
}> {
  const res = await callApi("/v2/bot/message/quota/consumption");
  return res.json();
}

// ------------------------------------------------------------
// 送信系（DRY_RUN では実際に送らない）
// ------------------------------------------------------------

export type SendResult = { sent: boolean; dryRun: boolean };

/**
 * push 送信。
 * X-Line-Retry-Key を付けることで、通信断で結果を取り逃した際に再送しても
 * LINE 側で二重送信が防がれる。
 */
export async function pushMessages(
  to: string,
  messages: LineMessage[],
  options: { retryKey?: string } = {},
): Promise<SendResult> {
  if (messages.length === 0) return { sent: false, dryRun: isDryRun() };

  if (isDryRun()) {
    captureMessage("DRY_RUN のため送信しません", {
      to,
      messageCount: messages.length,
      preview: messages[0],
    });
    return { sent: false, dryRun: true };
  }

  await callApi("/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Line-Retry-Key": options.retryKey ?? randomUUID(),
    },
    body: JSON.stringify({ to, messages: messages.slice(0, 5) }),
  });

  return { sent: true, dryRun: false };
}

/** reply 送信（replyToken は1回だけ・短時間で失効する） */
export async function replyMessages(
  replyToken: string,
  messages: LineMessage[],
): Promise<SendResult> {
  if (messages.length === 0) return { sent: false, dryRun: isDryRun() };

  if (isDryRun()) {
    captureMessage("DRY_RUN のため返信しません", {
      messageCount: messages.length,
      preview: messages[0],
    });
    return { sent: false, dryRun: true };
  }

  await callApi("/v2/bot/message/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ replyToken, messages: messages.slice(0, 5) }),
  });

  return { sent: true, dryRun: false };
}

/** 疎通確認の結果をまとめて返す（設定画面用） */
export async function checkConnection(): Promise<
  | { ok: true; botName: string; basicId: string; chatMode: string; quota?: number; used?: number }
  | { ok: false; message: string }
> {
  if (!isLineConfigured()) {
    return { ok: false, message: "LINE の環境変数が未設定です" };
  }

  try {
    const info = await getBotInfo();
    let quota: number | undefined;
    let used: number | undefined;
    try {
      const q = await getMessageQuota();
      quota = q.value;
      used = (await getMessageQuotaConsumption()).totalUsage;
    } catch {
      // 残数取得はプランによって失敗することがあるため、接続確認自体は成功扱いにする
    }
    return {
      ok: true,
      botName: info.displayName,
      basicId: info.basicId,
      chatMode: info.chatMode,
      quota,
      used,
    };
  } catch (error) {
    captureError(error, { scope: "line.checkConnection" });
    return {
      ok: false,
      message:
        error instanceof LineApiError
          ? `${error.message}${error.body ? ` / ${error.body}` : ""}`
          : "接続確認に失敗しました",
    };
  }
}
