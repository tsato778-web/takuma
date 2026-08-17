import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/** Prisma に依存しない基本設定（Edge でも読み込める） */
export const authConfig = {
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
} satisfies NextAuthConfig;
