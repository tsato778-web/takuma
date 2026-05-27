"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { STAFF } from "@/lib/mock-data";
import { PageShell } from "@/components/admin/page-shell";

type S = "出" | "休" | "半" | "時";
const STYLE: Record<S, string> = {
  出: "bg-emerald-100 text-emerald-700",
  休: "bg-secondary text-muted-foreground",
  半: "bg-amber-100 text-amber-700",
  時: "bg-sky-100 text-sky-700",
};
const LEGEND: { s: S; label: string }[] = [
  { s: "出", label: "出勤" },
  { s: "休", label: "休み" },
  { s: "半", label: "半休" },
  { s: "時", label: "時間指定" },
];

function statusFor(staffIdx: number, date: Date): S {
  const dow = date.getDay();
  const seed = (staffIdx * 31 + date.getDate() * 7) % 10;
  if (dow === 0 && seed < 6) return "休";
  if (seed === 0) return "休";
  if (seed === 1) return "半";
  if (seed === 2) return "時";
  return "出";
}

export default function ShiftsPage() {
  const [month, setMonth] = React.useState(new Date(2026, 4, 1));
  const y = month.getFullYear();
  const m = month.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const list = Array.from({ length: days }, (_, i) => new Date(y, m, i + 1));
  const WD = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <PageShell
      title="出勤表"
      description="月単位でスタッフの出勤を設定。予約台帳の表示スタッフ・予約受付可否と連動します。"
      action={
        <div className="flex items-center gap-2">
          <span className="cursor-default rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground">店舗一括設定</span>
          <span className="cursor-default rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">保存</span>
        </div>
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => setMonth(new Date(y, m - 1, 1))} className="rounded-md border border-border p-1.5 hover:bg-secondary"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-semibold tabular-nums">{y}年{m + 1}月</span>
        <button onClick={() => setMonth(new Date(y, m + 1, 1))} className="rounded-md border border-border p-1.5 hover:bg-secondary"><ChevronRight className="h-4 w-4" /></button>
        <div className="ml-4 flex gap-2">
          {LEGEND.map((l) => (
            <span key={l.s} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className={cn("flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold", STYLE[l.s])}>{l.s}</span>
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-auto thin-scrollbar rounded-xl border border-border bg-card">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-28 border-b border-r border-border bg-card px-3 py-2 text-left font-medium text-muted-foreground">スタッフ ＼ 日</th>
              {list.map((d) => (
                <th key={d.getDate()} className={cn("w-8 border-b border-border px-0 py-1 text-center font-medium", d.getDay() === 0 ? "text-rose-500" : d.getDay() === 6 ? "text-sky-500" : "text-muted-foreground")}>
                  <div className="tabular-nums">{d.getDate()}</div>
                  <div className="text-[9px]">{WD[d.getDay()]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAFF.map((s, si) => (
              <tr key={s.id}>
                <td className="sticky left-0 z-10 border-b border-r border-border bg-card px-3 py-1.5">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.name.split(" ")[0]}</span>
                </td>
                {list.map((d) => {
                  const st = statusFor(si, d);
                  return (
                    <td key={d.getDate()} className="border-b border-border/40 p-0.5 text-center">
                      <span className={cn("flex h-6 w-7 items-center justify-center rounded text-[10px] font-bold", STYLE[st])}>{st}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">※ モックUIです。出勤していないスタッフは予約受付不可、台帳の表示スタッフからも自動で外れます（スタッフ一括変更にも対応予定）。</p>
    </PageShell>
  );
}
