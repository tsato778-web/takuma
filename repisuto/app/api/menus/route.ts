// GET /api/menus[?storeId=...] → メニュー一覧
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const storeId = url.searchParams.get("storeId");
  const where: Record<string, unknown> = {};
  if (storeId) where.storeId = storeId;
  try {
    const items = await prisma.menu.findMany({ where, orderBy: { name: "asc" } });
    return NextResponse.json(items);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}
