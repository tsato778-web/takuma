// Seed script: 現行モックデータ（lib/mock-data.ts）を DB に投入する。
// 既存レコードは upsert（マスタ）または全置換（予約）で更新。
// 実行: `npm run db:seed`（内部で tsx prisma/seed.ts）。

import { PrismaClient } from "@prisma/client";
import {
  COMPANIES,
  BRANDS,
  STORES,
  STAFF,
  MENUS,
  CUSTOMERS,
  SEED_RESERVATIONS,
} from "../lib/mock-data";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding リピスト database...");

  // 1. Companies
  for (const c of COMPANIES) {
    await prisma.company.upsert({
      where: { code: c.code },
      update: { name: c.name },
      create: { code: c.code, name: c.name },
    });
  }
  console.log(`  ✓ ${COMPANIES.length} companies`);

  // 2. Brands
  for (const b of BRANDS) {
    const brandData = {
      companyCode: b.companyCode,
      name: b.name,
      industryPreset: b.industryPreset ?? null,
      bookingConfig: b.bookingConfig as any,
      kpis: b.kpis as any,
    };
    await prisma.brand.upsert({
      where: { code: b.code },
      update: brandData,
      create: { code: b.code, ...brandData },
    });
  }
  console.log(`  ✓ ${BRANDS.length} brands`);

  // 3. Stores (プロフィールを展開列で保存)
  for (const s of STORES) {
    const storeData = {
      code: s.code,
      brandCode: s.brandCode,
      name: s.name,
      address: s.profile.address,
      nearestStation: s.profile.nearestStation,
      walkMin: s.profile.walkMin,
      phone: s.profile.phone,
      photoUrls: s.profile.photoUrls,
    };
    await prisma.store.upsert({
      where: { id: s.id },
      update: storeData,
      create: { id: s.id, ...storeData },
    });
  }
  console.log(`  ✓ ${STORES.length} stores`);

  // 4. Staff
  for (const st of STAFF) {
    const staffData = {
      storeId: st.storeId,
      staffNo: st.staffNo,
      name: st.name,
      kana: st.kana,
      color: st.color,
      acceptsNomination: st.acceptsNomination,
      active: st.active,
      menuIds: st.menuIds,
    };
    await prisma.staff.upsert({
      where: { id: st.id },
      update: staffData,
      create: { id: st.id, ...staffData },
    });
  }
  console.log(`  ✓ ${STAFF.length} staff`);

  // 5. Menus
  for (const m of MENUS) {
    const menuData = {
      storeId: m.storeId,
      name: m.name,
      durationMin: m.durationMin,
      intervalMin: m.intervalMin,
      price: m.price,
      color: m.color,
      capacity: m.capacity ?? null,
      nomination: m.nomination ?? null,
      forcedStaffId: m.forcedStaffId ?? null,
    };
    await prisma.menu.upsert({
      where: { id: m.id },
      update: menuData,
      create: { id: m.id, ...menuData },
    });
  }
  console.log(`  ✓ ${MENUS.length} menus`);

  // 6. Customers + Tickets
  for (const c of CUSTOMERS) {
    const custData = {
      storeId: c.storeId,
      customerNo: c.customerNo,
      name: c.name,
      kana: c.kana,
      phone: c.phone,
      gender: c.gender,
      birthday: c.birthday ?? null,
      firstSource: c.firstSource,
      registerMedia: c.registerMedia,
      funnel: c.funnel,
      tags: c.tags,
      messageTags: c.messageTags,
      ltv: c.ltv,
      lastVisitDate: c.lastVisitDate,
      nextVisitDate: c.nextVisitDate ?? null,
      nextVisitTime: c.nextVisitTime ?? null,
      mainStaffId: c.mainStaffId,
      firstStaffId: c.firstStaffId,
      lastStaffId: c.lastStaffId,
      monthlyMember: c.monthlyMember as any,
      lineLinked: c.lineLinked,
      lineName: c.lineName ?? null,
      visitCount: c.visitCount,
    };
    await prisma.customer.upsert({
      where: { id: c.id },
      update: custData,
      create: { id: c.id, ...custData },
    });
    // Tickets は全置換
    await prisma.ticket.deleteMany({ where: { customerId: c.id } });
    for (const t of c.tickets) {
      await prisma.ticket.create({
        data: {
          id: t.id,
          customerId: c.id,
          name: t.name,
          totalCount: t.totalCount,
          remaining: t.remaining,
          durationMin: t.durationMin,
          unitPrice: t.unitPrice,
          validUntil: t.validUntil,
          menus: t.menus,
        },
      });
    }
  }
  console.log(`  ✓ ${CUSTOMERS.length} customers with tickets`);

  // 7. Reservations（Assignments 含む・全置換）
  await prisma.assignment.deleteMany();
  await prisma.reservation.deleteMany();
  for (const r of SEED_RESERVATIONS) {
    await prisma.reservation.create({
      data: {
        id: r.id,
        storeId: r.storeId,
        dateKey: r.dateKey,
        kind: r.kind,
        customerId: r.customerId ?? null,
        staffId: r.staffId,
        menuIds: r.menuIds,
        label: r.label ?? null,
        start: r.start,
        end: r.end,
        intervalMin: r.intervalMin,
        status: r.status,
        cancelType: r.cancelType ?? null,
        source: r.source,
        isNominated: r.isNominated,
        paid: r.paid,
        hasChart: r.hasChart,
        assignments:
          r.assignments && r.assignments.length > 0
            ? {
                create: r.assignments.map((a) => ({
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
    });
  }
  console.log(`  ✓ ${SEED_RESERVATIONS.length} reservations`);

  console.log("🎉 Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
