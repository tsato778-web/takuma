import { NextResponse } from "next/server";
import { isDatabaseReachable } from "@/lib/db";
import { envStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

/** 死活監視用。DB へ到達できるかと、必要な環境変数が揃っているかを返す */
export async function GET() {
  const env = envStatus();
  const database = env.database ? await isDatabaseReachable() : false;
  const ok = database && env.auth;

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      checks: { database, auth: env.auth, line: env.line, lineDryRun: env.lineDryRun },
      at: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
