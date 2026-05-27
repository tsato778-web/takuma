"use client";

import * as React from "react";
import { Search, Stethoscope, Camera, ChevronRight, ClipboardList } from "lucide-react";

import { cn } from "@/lib/utils";
import { STAFF } from "@/lib/mock-data";
import { jpDate, TODAY } from "@/lib/customer-data";
import { allCharts, CHART_STATUS_STYLE, type ChartRecord, type ChartStatus } from "@/lib/charts";
import { ChartDetailDialog } from "@/components/chart/chart-detail-dialog";

const STATUS_OPTIONS: (ChartStatus | "all" | "pending")[] = ["all", "pending", "未記入", "下書き", "記入済"];
const STATUS_LABEL: Record<string, string> = {
  all: "すべて",
  pending: "記入待ち（未記入+下書き）",
  未記入: "未記入",
  下書き: "下書き",
  記入済: "記入済",
};

export default function RecordsPage() {
  const [records, setRecords] = React.useState<ChartRecord[]>(() => allCharts());
  const [open, setOpen] = React.useState<ChartRecord | null>(null);
  const [q, setQ] = React.useState("");
  const [staff, setStaff] = React.useState("");
  const [status, setStatus] = React.useState<(typeof STATUS_OPTIONS)[number]>("all");

  const kpi = React.useMemo(() => {
    const total = records.length;
    const pending = records.filter((r) => r.status !== "記入済").length;
    const today = records.filter((r) => r.date === TODAY).length;
    const done = total - pending;
    return { total, pending, today, doneRate: total ? Math.round((done / total) * 100) : 0 };
  }, [records]);

  const list = React.useMemo(() => {
    const query = q.trim();
    return records.filter((r) => {
      if (query && !r.customerName.includes(query) && !r.menus.includes(query)) return false;
      if (staff && r.staffId !== staff) return false;
      if (status === "pending" && r.status === "記入済") return false;
      if (status !== "all" && status !== "pending" && r.status !== status) return false;
      return true;
    });
  }, [records, q, staff, status]);

  function save(u: ChartRecord) {
    setRecords((rs) => rs.map((r) => (r.id === u.id ? u : r)));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-card px-5 py-3">
        <h1 className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardList className="h-4 w-4 text-muted-foreground" /> カルテ
        </h1>
        <span className="text-xs text-muted-foreground">{list.length}件</span>
        <div className="relative ml-auto w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="顧客名・メニューで検索"
            className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto thin-scrollbar p-5">
        {/* KPI */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="本日の施術" value={`${kpi.today}件`} />
          <Kpi label="記入待ち" value={`${kpi.pending}件`} tone="warn" />
          <Kpi label="カルテ記入率" value={`${kpi.doneRate}%`} tone="primary" />
          <Kpi label="総カルテ数" value={`${kpi.total}件`} />
        </div>

        {/* フィルター */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as (typeof STATUS_OPTIONS)[number])}
            className="h-8 rounded-full border border-border bg-card px-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <select
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
            className={cn(
              "h-8 rounded-full border bg-card px-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              staff ? "border-primary text-primary" : "border-border"
            )}
          >
            <option value="">担当者（すべて）</option>
            {STAFF.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* 一覧 */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">日付</th>
                <th className="px-4 py-2.5 font-medium">顧客</th>
                <th className="px-4 py-2.5 font-medium">メニュー</th>
                <th className="px-4 py-2.5 font-medium">担当</th>
                <th className="px-4 py-2.5 font-medium">状態</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setOpen(r)}
                  className={cn(
                    "cursor-pointer border-b border-border/60 transition-colors last:border-0",
                    r.status === "未記入" ? "bg-rose-50/50 hover:bg-rose-50" : "hover:bg-secondary/40"
                  )}
                >
                  <td className="px-4 py-2.5 text-xs tabular-nums">{jpDate(r.date)}</td>
                  <td className="px-4 py-2.5 font-medium">{r.customerName}</td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                      {r.menus}
                      {r.hasPhotos && <Camera className="h-3 w-3 text-muted-foreground" />}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs">{r.staffName}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", CHART_STATUS_STYLE[r.status])}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    該当するカルテがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">行をクリックでカルテを表示・編集できます。未記入は赤背景で表示されます。</p>
      </div>

      <ChartDetailDialog record={open} onOpenChange={(o) => !o && setOpen(null)} onSave={save} />
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "warn" | "primary" }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", tone === "warn" ? "border-amber-200 bg-amber-50/50" : "border-border")}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "warn" && "text-amber-700", tone === "primary" && "text-primary")}>
        {value}
      </div>
    </div>
  );
}
