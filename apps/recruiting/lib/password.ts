import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * 共通管理者アカウントのパスワード照合。
 *
 * - 推奨：ADMIN_PASSWORD_HASH にハッシュ（`npm run auth:hash -- <パスワード>` で生成）
 * - 簡易：ADMIN_PASSWORD に平文（Vercel の環境変数は暗号化保管されるため実用上は可）
 *
 * 比較は毎回同じ時間で行い（timingSafeEqual）、入力からパスワードを推測されにくくする。
 */

const SCRYPT_PREFIX = "scrypt";
const KEY_LENGTH = 64;

// 区切りは ":"。".env" では "$" が変数展開として解釈されてしまうため使わない
const SEP = ":";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return [SCRYPT_PREFIX, salt, hash].join(SEP);
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!password || !stored) return false;

  if (stored.startsWith(`${SCRYPT_PREFIX}${SEP}`)) {
    const [, salt, expected] = stored.split(SEP);
    if (!salt || !expected) return false;
    const actual = scryptSync(password, salt, KEY_LENGTH);
    const expectedBuf = Buffer.from(expected, "hex");
    if (actual.length !== expectedBuf.length) return false;
    return timingSafeEqual(actual, expectedBuf);
  }

  // 平文で設定されている場合
  const a = Buffer.from(password);
  const b = Buffer.from(stored);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * ログイン試行の簡易スロットリング。
 * 共通パスワード運用では総当たりが現実的な脅威になるため、失敗が続いたら一時的に受け付けない。
 * サーバーインスタンスごとのメモリ上の制御のため完全ではないが、無いよりは大きく効く。
 */
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

const attempts = new Map<string, { count: number; firstAt: number }>();

export function isThrottled(key: string, now: number = Date.now()): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (now - entry.firstAt > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailure(key: string, now: number = Date.now()): void {
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return;
  }
  entry.count += 1;
}

export function clearFailures(key: string): void {
  attempts.delete(key);
}
