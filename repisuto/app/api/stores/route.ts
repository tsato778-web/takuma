// GET /api/stores → 店舗一覧（プロフィール含む）
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await prisma.store.findMany({ orderBy: { code: "asc" } });
    return NextResponse.json(items);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
