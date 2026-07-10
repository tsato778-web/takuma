// GET    /api/reservations/[id]  → 単一取得
// PATCH  /api/reservations/[id]  → 部分更新（ドラッグ移動・時間変更・ステータス変更 等）
// DELETE /api/reservations/[id]  → 削除
//
// PATCH のボディに assignments を含めた場合は「全置換」（Assignment を delete → 再作成）。
// 含めない場合は Assignment は保持。

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const item = await prisma.reservation.findUnique({
    where: { id: params.id },
    include: { assignments: true },
  });
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { assignments, id: _ignoreId, createdAt: _c, updatedAt: _u, ...patch } = body ?? {};

  try {
    // assignments が指定されていれば全置換
    if (Array.isArray(assignments)) {
      await prisma.assignment.deleteMany({ where: { reservationId: params.id } });
    }
    const updated = await prisma.reservation.update({
      where: { id: params.id },
      data: {
        ...patch,
        ...(Array.isArray(assignments) && assignments.length > 0
          ? {
              assignments: {
                create: assignments.map((a: { staffId: string; role: string; label: string; start: number; end: number; share?: number | null }) => ({
                  staffId: a.staffId,
                  role: a.role,
                  label: a.label,
                  start: a.start,
                  end: a.end,
                  share: a.share ?? null,
                })),
              },
            }
          : {}),
      },
      include: { assignments: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.reservation.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
