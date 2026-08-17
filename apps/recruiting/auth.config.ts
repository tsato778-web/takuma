import type { NextAuthConfig } from "next-auth";

/** プロバイダ以外の基本設定 */
export const authConfig = {
  providers: [],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
} satisfies NextAuthConfig;
