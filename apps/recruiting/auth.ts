import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/db";
import { captureError } from "@/lib/observability";

/**
 * ログインは Google アカウント。
 * users テーブルに canLogin=true / isActive=true で登録済みのメールのみ許可する（A-3 / A-4）。
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      try {
        const allowed = await prisma.user.findFirst({
          where: { email, canLogin: true, isActive: true },
          select: { id: true },
        });
        return Boolean(allowed);
      } catch (error) {
        // DB 未接続時にログインを許可してしまわないよう、失敗時は拒否する
        captureError(error, { scope: "auth.signIn", email });
        return false;
      }
    },
    async jwt({ token, user }) {
      // サインイン時のみ DB を参照する（以降はトークンの値を使う）
      if (user?.email) {
        const record = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
          select: { id: true, name: true, role: true },
        });
        if (record) {
          token.userId = record.id;
          token.role = record.role;
          token.name = record.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string | undefined) ?? "";
        session.user.role = (token.role as string | undefined) ?? "member";
      }
      return session;
    },
  },
});
