import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Prisma はサーバー側でのみ使う（バンドル対象から外す）
  serverExternalPackages: ["@prisma/client"],
  // 既存ダッシュボードと同居しているため、トレース対象をこのアプリに限定する
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
