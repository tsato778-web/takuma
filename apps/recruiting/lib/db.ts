import { PrismaClient } from "@prisma/client";

// 開発時のホットリロードで接続が増え続けないようにグローバルへ保持する
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * DB へ到達できるかを確認する。
 * Supabase 未接続の状態でも画面が落ちないよう、呼び出し側で分岐するために使う。
 */
export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
