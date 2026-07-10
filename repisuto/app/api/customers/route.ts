// GET  /api/customers[?q=&storeId=&phone=]  → 顧客一覧（検索・電話重複チェック）
// POST /api/customers                       → 電話予約からの新規顧客作成（customerNo は連番採番）
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const storeId = url.searchParams.get("storeId");
  const phone = url.searchParams.get("phone");

  const where: Record<string, unknown> = {};
  if (storeId) where.storeId = storeId;
  if (phone) {
    // 数字だけで照合したいが、Prisma で正規化は難しいので生電話番号 like で
    where.phone = { contains: phone.replace(/[^0-9]/g, "") };
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { kana: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { lineName: { contains: q, mode: "insensitive" } },
    ];
  }
  try {
    const items = await prisma.customer.findMany({
      where,
      include: { tickets: true },
      orderBy: { customerNo: "asc" },
    });
    return NextResponse.json(items);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.storeId || !body?.name || !body?.phone) {
    return NextResponse.json({ error: "storeId / name / phone は必須です" }, { status: 400 });
  }
  try {
    // customerNo の中央採番（DB 内で最大値+1、欠番なし・永続）
    const maxNo = await prisma.customer.aggregate({ _max: { customerNo: true } });
    const nextNo = (maxNo._max.customerNo ?? 0) + 1;
    const id = body.id ?? `cus_${Date.now()}`;
    const created = await prisma.customer.create({
      data: {
        id,
        storeId: body.storeId,
        customerNo: nextNo,
        name: body.name,
        kana: body.kana ?? "",
        phone: body.phone,
        gender: body.gender ?? "F",
        birthday: body.birthday ?? null,
        firstSource: body.firstSource ?? "電話",
        registerMedia: body.registerMedia ?? "電話予約",
        funnel: body.funnel ?? `${body.firstSource ?? "電話"} → 電話予約`,
        tags: body.tags ?? ["新規"],
        messageTags: body.messageTags ?? [],
        ltv: body.ltv ?? 0,
        lastVisitDate: body.lastVisitDate ?? new Date().toISOString().slice(0, 10),
        nextVisitDate: body.nextVisitDate ?? null,
        nextVisitTime: body.nextVisitTime ?? null,
        mainStaffId: body.mainStaffId,
        firstStaffId: body.firstStaffId ?? body.mainStaffId,
        lastStaffId: body.lastStaffId ?? body.mainStaffId,
        monthlyMember: body.monthlyMember ?? { active: false },
        lineLinked: body.lineLinked ?? false,
        lineName: body.lineName ?? null,
        visitCount: body.visitCount ?? 0,
      },
      include: { tickets: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
