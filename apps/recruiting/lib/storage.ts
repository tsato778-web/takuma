import { captureError } from "@/lib/observability";

/**
 * 受信メディアの保存先。
 * Supabase Storage が未設定の場合は保存せず null を返す（トーク履歴自体は残る）。
 */

const BUCKET = process.env.SUPABASE_MEDIA_BUCKET ?? "line-media";

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export async function saveMedia(
  path: string,
  body: Buffer,
  contentType: string,
): Promise<string | null> {
  if (!isStorageConfigured()) return null;

  const url = `${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: new Uint8Array(body),
    });

    if (!res.ok) {
      throw new Error(`Storage への保存に失敗: ${res.status} ${await res.text()}`);
    }

    return `${BUCKET}/${path}`;
  } catch (error) {
    captureError(error, { scope: "storage.saveMedia", path });
    return null;
  }
}
