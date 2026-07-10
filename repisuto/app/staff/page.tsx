"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { PageShell, MasterTable, AddButton, Chip } from "@/components/admin/page-shell";
import { STAFF, menuById } from "@/lib/mock-data";

const ROLES = ["店長", "スタイリスト", "スタイリスト", "アシスタント"];

// 退職（論理削除）の例。番号は保持
const RETIRED = { staffNo: "S0005", name: "中島 由紀", kana: "ナカジマ ユキ", role: "スタイリスト", color: "#94a3b8" };

export default function StaffMasterPage() {
  const [q, setQ] = React.useState("");

  const active = STAFF.map((s, i) => ({
    staffNo: s.staffNo,
    name: s.name,
    kana: s.kana,
    role: ROLES[i] ?? "スタッフ",
    color: s.color,
    nomination: s.acceptsNomination,
    menus: s.menuIds.map((id) => menuById(id)?.name ?? "").filter(Boolean),
    order: i + 1,
    active: true,
  }));
  const all = [...active, { staffNo: RETIRED.staffNo, name: RETIRED.name, kana: RETIRED.kana, role: RETIRED.role, color: RETIRED.color, nomination: false, menus: [] as string[], order: 0, active: false }];
  const query = q.trim();
  const list = all.filter((s) => !query || [s.staffNo, s.name, s.kana, s.role, ...s.menus].some((v) => v.includes(query)));

  return (
    <PageShell
      title="スタッフマスター"
      description="社員番号は登録時に自動発行（システム全体で一意・退職後も保持）。権限・対応メニュー・指名可否などを設定。"
      action={<AddButton label="スタッフ登録" />}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="番号・氏名・カナ・権限・対応メニューで検索" className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <span className="text-xs text-muted-foreground">{list.length}名</span>
      </div>

      <MasterTable
        columns={["No", "スタッフ", "権限", "指名", "対応メニュー", "所属店舗", "予約受付", "状態"]}
        rows={list.map((s) => [
          <span key="no" className="font-mono text-xs tabular-nums text-muted-foreground">{s.staffNo}</span>,
          <span key="n" className={cn("inline-flex items-center gap-1.5 font-medium", !s.active && "text-muted-foreground")}>
            <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>,
          s.role,
          s.nomination ? <Chip key="nm" tone="accent">指名可</Chip> : <Chip key="nm" tone="muted">指名不可</Chip>,
          <span key="m" className="text-[11px] text-muted-foreground">{s.menus.length ? `${s.menus.length}件（${s.menus.slice(0, 2).join("・")}…）` : "—"}</span>,
          "渋谷店",
          s.active ? <Chip key="rc" tone="ok">受付可</Chip> : <Chip key="rc" tone="muted">受付不可</Chip>,
          s.active ? <Chip key="st" tone="ok">在籍</Chip> : <Chip key="st" tone="muted">退職・非表示</Chip>,
        ])}
      />
      <div className="mt-4 rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
        <div className="mb-1 font-semibold text-foreground">設計メモ</div>
        社員番号（S0001…）は登録時に自動発行し、<b>システム全体で一意</b>。退職しても予約・会計・カルテ・売上に紐づくため<b>番号は削除せず</b>、退職済み／非表示／ログイン停止で状態管理します。表示は「{STAFF[0].staffNo}｜{STAFF[0].name}｜渋谷店｜施術スタッフ」のように所属店舗付き。
      </div>
    </PageShell>
  );
}
