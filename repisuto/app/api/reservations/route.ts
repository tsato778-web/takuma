// GET  /api/reservations?dateKey=YYYY-MM-DD[&storeId=...]  → 一覧
// POST /api/reservations                                   → 新規作成
//
// 予約は kind=RESERVATION|BREAK|MEETING|BLOCK|OTHER を単一テーブルで扱う（現行モックと同じ）。
// Assignment[] は一括作成。UI 側はフラットな Reservation { assignments?: Assignment[] } で受渡し。

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dateKey = url.searchParams.get("dateKey");
  const storeId = url.searchParams.get("storeId");
  const where: Record<string, unknown> = {};
  if (dateKey) where.dateKey = dateKey;
  if (storeId) where.storeId = storeId;

  try {
    const items = await prisma.reservation.findMany({
      where,
      include: { assignments: true },
      orderBy: { start: "asc" },
    });
    return NextResponse.json(items);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const { assignments, ...rest } = body ?? {};
  if (!rest.id || !rest.storeId || !rest.dateKey || !rest.staffId) {
    return NextResponse.json({ error: "id / storeId / dateKey / staffId は必須です" }, { status: 400 });
  }
  try {
    const created = await prisma.reservation.create({
      data: {
        id: rest.id,
        storeId: rest.storeId,
        dateKey: rest.dateKey,
        kind: rest.kind ?? "RESERVATION",
        customerId: rest.customerId ?? null,
        staffId: rest.staffId,
        menuIds: rest.menuIds ?? [],
        label: rest.label ?? null,
        start: rest.start,
        end: rest.end,
        intervalMin: rest.intervalMin ?? 0,
        status: rest.status ?? "CONFIRMED",
        cancelType: rest.cancelType ?? null,
        source: rest.source ?? "MANUAL",
        isNominated: rest.isNominated ?? false,
        paid: rest.paid ?? false,
        hasChart: rest.hasChart ?? false,
        assignments:
          Array.isArray(assignments) && assignments.length > 0
            ? {
                create: assignments.map((a: { staffId: string; role: string; label: string; start: number; end: number; share?: number | null }) => ({
                  staffId: a.staffId,
                  role: a.role,
                  label: a.label,
                  start: a.start,
                  end: a.end,
                  share: a.share ?? null,
                })),
              }
            : undefined,
      },
      include: { assignments: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
