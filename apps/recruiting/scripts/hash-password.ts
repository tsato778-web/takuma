/**
 * 管理者パスワードのハッシュを生成する。
 *
 *   npm run auth:hash -- "実際のパスワード"
 *
 * 出力された文字列を ADMIN_PASSWORD_HASH に設定する。
 */
import { hashPassword } from "../lib/password";

const password = process.argv[2];

if (!password) {
  console.error('使い方: npm run auth:hash -- "パスワード"');
  process.exit(1);
}

console.log(hashPassword(password));
