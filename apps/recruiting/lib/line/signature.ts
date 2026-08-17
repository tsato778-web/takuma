import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * LINE Webhook の署名検証。
 *
 * リクエストボディ（生の文字列）をチャネルシークレットで HMAC-SHA256 し、
 * Base64 にした値が x-line-signature ヘッダと一致するかを確認する。
 *
 * 注意：JSON.parse したオブジェクトを再度 stringify すると、キーの順序や
 * 空白の違いで署名が一致しなくなる。必ず生のボディ文字列を渡すこと。
 */
export function verifyLineSignature(
  rawBody: string,
  signature: string | null,
  channelSecret: string,
): boolean {
  if (!signature || !channelSecret) return false;

  const expected = createHmac("sha256", channelSecret)
    .update(rawBody, "utf8")
    .digest("base64");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** 開発・テスト用に署名を生成する */
export function signLineBody(rawBody: string, channelSecret: string): string {
  return createHmac("sha256", channelSecret).update(rawBody, "utf8").digest("base64");
}
