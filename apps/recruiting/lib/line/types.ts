import { z } from "zod";

/**
 * LINE Webhook イベントの型。
 * 受信データは外部入力のため、必要な項目だけを検証して取り出す
 * （未知のフィールドは無視し、LINE 側の仕様追加で壊れないようにする）。
 */

const sourceSchema = z.object({
  type: z.string(),
  userId: z.string().optional(),
  groupId: z.string().optional(),
  roomId: z.string().optional(),
});

const messageSchema = z.object({
  id: z.string(),
  type: z.string(),
  text: z.string().optional(),
  packageId: z.string().optional(),
  stickerId: z.string().optional(),
  fileName: z.string().optional(),
  title: z.string().optional(),
  address: z.string().optional(),
});

export const lineEventSchema = z.object({
  type: z.string(),
  webhookEventId: z.string().optional(),
  timestamp: z.number().optional(),
  mode: z.string().optional(),
  replyToken: z.string().optional(),
  source: sourceSchema.optional(),
  message: messageSchema.optional(),
  postback: z
    .object({
      data: z.string(),
      params: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  deliveryContext: z.object({ isRedelivery: z.boolean() }).optional(),
});

export const lineWebhookBodySchema = z.object({
  destination: z.string().optional(),
  events: z.array(lineEventSchema).default([]),
});

export type LineEvent = z.infer<typeof lineEventSchema>;
export type LineWebhookBody = z.infer<typeof lineWebhookBodySchema>;

export type LineProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
};

/** LINE へ送るメッセージオブジェクト（利用する種類のみ） */
export type LineMessage =
  | { type: "text"; text: string }
  | { type: "image"; originalContentUrl: string; previewImageUrl: string }
  | {
      type: "video";
      originalContentUrl: string;
      previewImageUrl: string;
      trackingId?: string;
    }
  | { type: "flex"; altText: string; contents: unknown }
  | { type: "template"; altText: string; template: unknown };

/**
 * リッチメニュー・postback に埋め込むデータ。
 * 例: {"a":"add_tag","id":"<tagId>"}
 */
export const postbackDataSchema = z.object({
  a: z.enum([
    "add_tag",
    "send_template",
    "open_form",
    "start_scenario",
    "switch_rich_menu",
  ]),
  id: z.string().optional(),
});

export type PostbackData = z.infer<typeof postbackDataSchema>;

export function parsePostbackData(data: string): PostbackData | null {
  try {
    return postbackDataSchema.parse(JSON.parse(data));
  } catch {
    return null;
  }
}

/** 受信メッセージの type を Message.messageType へ写像する */
export function toMessageType(lineType: string | undefined): string {
  switch (lineType) {
    case "text":
    case "image":
    case "video":
    case "audio":
    case "file":
    case "sticker":
    case "location":
      return lineType;
    default:
      return "text";
  }
}

/** メディア本体を取得すべき種類か */
export function hasDownloadableContent(lineType: string | undefined): boolean {
  return ["image", "video", "audio", "file"].includes(lineType ?? "");
}
