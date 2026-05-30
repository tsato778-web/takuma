"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { PageShell, MockBadge } from "@/components/admin/page-shell";
import { repeatAll, repeatByStore, repeatByStaff, repeatByMedia, repeatByMenu, type RepeatRow } from "@/lib/repeat-rate";
import { useCurrentUser } from "@/lib/user-context";
import { hasMin } from "@/lib/permissions";

type AxisDef = { id: "store" | "staff" | "media" | "menu"; label: string };
const ALL_AXES: AxisDef[] = [
  { id: "store", label: "店舗別" },
  { id: "staff", label: "スタッフ別" },
  { id: "media", label: "媒体別" },
  { id: "menu", label: "メニュー別" },
];
type AxisId = AxisDef["id"];

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function RepeatPage() {
  const { role } = useCurrentUser();
  // スタッフ別比較は STORE_ADMIN 以上のみ（スタッフへのプレッシャー回避）
  const canSeeStaff = hasMin(role, "STORE_ADMIN");
  const axes = canSeeStaff ? ALL_AXES : ALL_AXES.filter((a) => a.id !== "staff");
  const initial: AxisId = canSeeStaff ? "staff" : "store";
  const [axis, setAxis] = React.useState<AxisId>(initial);
  React.useEffect(() => {
    // ロール降格時に staff タブから離脱
    if (axis === "staff" && !canSeeStaff) setAxis("store");
  }, [axis, canSeeStaff]);
  const all = repeatAll();
  const rows: RepeatRow[] =
    axis === "store" ? repeatByStore() :
    axis === "staff" ? repeatByStaff() :
    axis === "media" ? repeatByMedia() :
    repeatByMenu();
  const sorted = [...rows].sort((a, b) => b.rate - a.rate);

  return (
    <PageShell
      title="次回予約率ダッシュボード"
      description="店舗・スタッフ・媒体・メニューごとに、再来率（次回予約取得率）を可視化します。"
      action={<MockBadge />}
    >
      {/* 全店舗トップ */}
      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
        <div className="text-xs font-semibold text-emerald-700">全店舗（来店 {all.visits} 名 / 次回予約 {all.nextBooked} 名）</div>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <span className="text-4xl font-bold tabular-nums text-emerald-700">{pct(all.rate)}</span>
          <span className="text-xs text-muted-foreground">目標 {pct(all.target)} ／ 差分 <Diff v={all.diff} /></span>
          <span className="text-xs text-muted-foreground">前月 {pct(all.prevRate)}（<MoM v={all.rate - all.prevRate} />）</span>
        </div>
      </div>

      {/* 軸タブ */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex w-fit overflow-hidden rounded-md border border-border">
          {axes.map((a) => (
            <button
              key={a.id}
              onClick={() => setAxis(a.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                axis === a.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
        {!canSeeStaff && (
          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">スタッフ別比較は STORE_ADMIN 以上のみ閲覧可</span>
        )}
      </div>

      <div className="thin-scrollbar overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
              {[axisLabel(axis), "来店人数", "次回予約", "次回予約率", "前月", "目標", "差分"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.key} className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
                <td className="px-3 py-2 font-medium">{r.label}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.visits}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.nextBooked}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{pct(r.rate)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pct(r.prevRate)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pct(r.target)}</td>
                <td className="px-3 py-2 text-right"><Diff v={r.diff} /></td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={7}>該当データなし</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">※ モックUI。次回予約取得＝Customer.nextVisitDate あり。本実装では期間／店舗を選択し、会計・予約データから集計します。</p>
    </PageShell>
  );
}

function axisLabel(a: AxisId): string {
  return a === "store" ? "店舗" : a === "staff" ? "スタッフ" : a === "media" ? "媒体" : "メニュー";
}
function Diff({ v }: { v: number }) {
  const sign = v >= 0 ? "+" : "−";
  return <span className={`tabular-nums ${v >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{sign}{Math.abs(Math.round(v * 100))}%</span>;
}
function MoM({ v }: { v: number }) {
  const arrow = v >= 0 ? "↑" : "↓";
  return <span className={`tabular-nums ${v >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{arrow}{Math.abs(Math.round(v * 100))}%</span>;
}
