// GET  /api/staff[?storeId=...&active=true]  → スタッフ一覧（在籍のみ絞り込み可）
// POST /api/staff                             → 新規追加（S00001 は staffNo が既に採番済み前提）
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const storeId = url.searchParams.get("storeId");
  const active = url.searchParams.get("active");
  const where: Record<string, unknown> = {};
  if (storeId) where.storeId = storeId;
  if (active === "true") where.active = true;
  try {
    const items = await prisma.staff.findMany({ where, orderBy: { staffNo: "asc" } });
    return NextResponse.json(items);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.id || !body?.storeId || !body?.staffNo || !body?.name) {
    return NextResponse.json({ error: "id / storeId / staffNo / name は必須です" }, { status: 400 });
  }
  try {
    const created = await prisma.staff.create({
      data: {
        id: body.id,
        storeId: body.storeId,
        staffNo: body.staffNo,
        name: body.name,
        kana: body.kana ?? "",
        color: body.color ?? "#888888",
        acceptsNomination: body.acceptsNomination ?? true,
        active: body.active ?? true,
        menuIds: body.menuIds ?? [],
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
