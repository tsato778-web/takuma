import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/db";
import { captureError, captureMessage } from "@/lib/observability";
import {
  clearFailures,
  isThrottled,
  recordFailure,
  verifyPassword,
} from "@/lib/password";

/**
 * 認証は「NAORU 本部で共有する管理者アカウント1つ」のみ（2026-08-17 決定）。
 * ID とパスワードは環境変数で設定する。
 *
 *   ADMIN_USER_ID        ログインID
 *   ADMIN_PASSWORD_HASH  パスワードのハッシュ（推奨。npm run auth:hash で生成）
 *   ADMIN_PASSWORD       平文で設定する場合（ハッシュが未設定のときのみ使用）
 *
 * 個人別ログイン・権限管理は現時点では作らない。将来必要になった場合は
 * providers に別のプロバイダを追加し、users テーブルの canLogin で許可制にする
 * （users テーブルと監査ログの構造は変更不要）。
 */

/** 共通アカウントに対応する users レコード。監査ログや担当者の参照先として使う */
const SHARED_ACCOUNT_EMAIL =
  process.env.ADMIN_ACCOUNT_EMAIL ?? "admin@naoru.local";
const SHARED_ACCOUNT_NAME = process.env.ADMIN_ACCOUNT_NAME ?? "NAORU採用チーム";

async function resolveSharedUser() {
  return prisma.user.upsert({
    where: { email: SHARED_ACCOUNT_EMAIL },
    create: {
      email: SHARED_ACCOUNT_EMAIL,
      name: SHARED_ACCOUNT_NAME,
      role: "admin",
      kind: "headquarters",
      canLogin: true,
      isActive: true,
    },
    update: {},
    select: { id: true, name: true, email: true, role: true },
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "共通管理者アカウント",
      credentials: {
        userId: { label: "ID", type: "text" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        const userId = String(credentials?.userId ?? "").trim();
        const password = String(credentials?.password ?? "");

        const expectedId = process.env.ADMIN_USER_ID;
        const expectedSecret =
          process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD;

        if (!expectedId || !expectedSecret) {
          captureMessage("管理者アカウントの環境変数が未設定です");
          return null;
        }

        if (isThrottled(userId)) {
          captureMessage("ログイン試行が一時的に制限されました", { userId });
          return null;
        }

        const ok =
          userId === expectedId && verifyPassword(password, expectedSecret);

        if (!ok) {
          recordFailure(userId);
          return null;
        }

        clearFailures(userId);

        try {
          const user = await resolveSharedUser();
          return { id: user.id, name: user.name, email: user.email };
        } catch (error) {
          // DB へ到達できない状態でセッションを張ると、後続の画面がすべて壊れる
          captureError(error, { scope: "auth.authorize" });
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = "admin";
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string | undefined) ?? "";
        session.user.role = (token.role as string | undefined) ?? "admin";
      }
      return session;
    },
  },
});
