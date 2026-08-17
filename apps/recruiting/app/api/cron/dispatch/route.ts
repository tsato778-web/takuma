import { NextResponse } from "next/server";
import { processDueJobs } from "@/lib/jobs/runner";
import { captureError } from "@/lib/observability";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 送信キューの定期処理（Vercel Cron から毎分呼ばれる）。
 * CRON_SECRET を設定した場合は、その Bearer トークンが必要。
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET が未設定です" },
      { status: 503 },
    );
  }

  try {
    const result = await processDueJobs({ maxJobs: 50, budgetMs: 45_000 });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    captureError(error, { scope: "cron.dispatch" });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
