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

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">{children}</span>;
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

      {/* 上部一括調整 */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2">
        <span className="text-[11px] font-semibold text-muted-foreground">一括操作</span>
        {["店舗一括公開", "スタッフ一括変更", "今月分を一括反映", "翌月へコピー"].map((b) => (
          <span key={b} className="cursor-default rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground/80 hover:bg-secondary">{b}</span>
        ))}
        <span className="ml-auto text-[11px] text-muted-foreground">店舗営業時間：10:00 - 20:00</span>
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
      {/* 自動反映ルーチン(曜日ルール) */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">自動反映ルーチン（曜日ルール）</div>
          <p className="mb-2 text-[11px] text-muted-foreground">スタッフごとに曜日ルールを設定すると、月全体に自動反映されます。</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2"><span className="w-14 font-medium">田中</span><span className="flex flex-wrap gap-1"><Tag>毎週月曜 休み</Tag><Tag>毎週金曜 休み</Tag><Tag>水曜 12:00-18:00</Tag></span></div>
            <div className="flex items-center gap-2"><span className="w-14 font-medium">佐藤</span><span className="flex flex-wrap gap-1"><Tag>毎週火曜 休み</Tag><Tag>金曜 12:00-21:00</Tag></span></div>
            <div className="flex items-center gap-2"><span className="w-14 font-medium">鈴木</span><span className="flex flex-wrap gap-1"><Tag>毎週水曜 休み</Tag></span></div>
          </div>
          <span className="mt-3 inline-flex cursor-default items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-secondary">＋ 曜日ルールを追加</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">勤務時間のカスタマイズ</div>
          <p className="mb-2 text-[11px] text-muted-foreground">店舗営業時間を土台に、日・曜日・スタッフ単位で勤務時間を変更できます。</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between border-b border-border/50 py-1"><span className="text-muted-foreground">店舗営業時間</span><span className="font-medium tabular-nums">10:00 - 20:00</span></div>
            <div className="flex justify-between border-b border-border/50 py-1"><span className="text-muted-foreground">田中（月曜）</span><span className="tabular-nums">10:00 - 18:00</span></div>
            <div className="flex justify-between border-b border-border/50 py-1"><span className="text-muted-foreground">佐藤（金曜）</span><span className="tabular-nums">12:00 - 21:00</span></div>
            <div className="flex justify-between py-1"><span className="text-muted-foreground">高橋（水曜）</span><span className="tabular-nums">休み</span></div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">※ モックUIです。出勤していないスタッフは予約受付不可、台帳の表示スタッフからも自動で外れます（スタッフ一括変更にも対応予定）。</p>
    </PageShell>
  );
}
