import { z } from "zod";

/**
 * 環境変数の検証。
 * ビルド時に落とさないよう、参照された時点で検証する（遅延評価）。
 */
const schema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(16),
  ADMIN_USER_ID: z.string().min(1),
  // Sprint 1 以降で使用
  LINE_CHANNEL_SECRET: z.string().optional(),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().optional(),
  LINE_DRY_RUN: z.enum(["true", "false"]).optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`環境変数が不足しています: ${missing}`);
  }
  cached = parsed.data;
  return cached;
}

/** 検証はせず、設定済みかどうかだけを判定する（セットアップ案内の表示用） */
export function envStatus() {
  return {
    database: Boolean(process.env.DATABASE_URL),
    auth: Boolean(
      process.env.AUTH_SECRET &&
        process.env.ADMIN_USER_ID &&
        (process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD),
    ),
    line: Boolean(
      process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_ACCESS_TOKEN,
    ),
    lineDryRun: process.env.LINE_DRY_RUN !== "false",
  };
}
