"use client";

import * as React from "react";
import { TrendingUp, CalendarCheck, Repeat, Wallet, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import { staffById, menuById } from "@/lib/mock-data";
import { mediaStat } from "@/lib/customer-data";
import { DatePicker } from "@/components/reservation/date-picker";
import { txnsInRange, aggregate, groupBy, dailySeries, type Txn } from "@/lib/analytics";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const md = (s: string) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;

type Mode = "day" | "week" | "month" | "custom";
const MODES: { id: Mode; label: string }[] = [
  { id: "day", label: "日別" },
  { id: "week", label: "週別" },
  { id: "month", label: "月別" },
  { id: "custom", label: "任意期間" },
];

type Axis = "store" | "staff" | "menu" | "media" | "new";
const AXES: { id: Axis; label: string }[] = [
  { id: "store", label: "店舗全体" },
  { id: "staff", label: "担当者別" },
  { id: "menu", label: "メニュー別" },
  { id: "media", label: "媒体別" },
  { id: "new", label: "新規/再来" },
];

export default function AnalyticsPage() {
  const [mode, setMode] = React.useState<Mode>("month");
  const [anchor, setAnchor] = React.useState(new Date(2026, 4, 27));
  const [rStart, setRStart] = React.useState(new Date(2026, 4, 1));
  const [rEnd, setREnd] = React.useState(new Date(2026, 4, 27));
  const [axis, setAxis] = React.useState<Axis>("store");

  const { from, to, label } = React.useMemo(() => {
    if (mode === "day") return { from: iso(anchor), to: iso(anchor), label: `${anchor.getMonth() + 1}/${anchor.getDate()} の集計` };
    if (mode === "week") {
      const d = new Date(anchor);
      const day = (d.getDay() + 6) % 7; // Mondayを週初に
      const s = new Date(d); s.setDate(d.getDate() - day);
      const e = new Date(s); e.setDate(s.getDate() + 6);
      return { from: iso(s), to: iso(e), label: `${md(iso(s))}〜${md(iso(e))}（週次）` };
    }
    if (mode === "month") {
      const s = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const e = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      return { from: iso(s), to: iso(e), label: `${anchor.getFullYear()}年${anchor.getMonth() + 1}月（月次）` };
    }
    const s = rStart <= rEnd ? rStart : rEnd;
    const e = rStart <= rEnd ? rEnd : rStart;
    return { from: iso(s), to: iso(e), label: `${md(iso(s))}〜${md(iso(e))}` };
  }, [mode, anchor, rStart, rEnd]);

  const txns = React.useMemo(() => txnsInRange(from, to), [from, to]);
  const agg = React.useMemo(() => aggregate(txns), [txns]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-3">
        <h1 className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-muted-foreground" /> KPI分析
        </h1>
        <div className="flex overflow-hidden rounded-md border border-border">
          {MODES.map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)} className={cn("px-3 py-1.5 text-xs font-medium transition-colors", mode === m.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary")}>
              {m.label}
            </button>
          ))}
        </div>
        {mode === "custom" ? (
          <div className="flex items-center gap-1">
            <DatePicker value={rStart} onChange={setRStart} />
            <span className="text-muted-foreground">〜</span>
            <DatePicker value={rEnd} onChange={setREnd} />
          </div>
        ) : (
          <DatePicker value={anchor} onChange={setAnchor} />
        )}
        <span className="ml-auto text-xs font-medium text-muted-foreground">{label} ・ {agg.visits}来店</span>
      </div>

      <div className="flex-1 overflow-auto thin-scrollbar p-5">
        {/* KPIカード */}
        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={TrendingUp} label="総売上（収受+消化）" value={yen(agg.total)} tone="primary" />
          <Kpi icon={Wallet} label="会計済み売上" value={yen(agg.collected)} />
          <Kpi icon={CalendarCheck} label="次回予約率" value={`${agg.nextRate}%`} tone="accent" sub={`${agg.nextCount}/${agg.visits}名`} />
          <Kpi icon={Repeat} label="リピート率" value={`${agg.repeatRate}%`} sub={`再来 ${agg.repeatCount}名`} />
        </div>

        {/* 売上区分 + 次回予約 */}
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card title="売上区分">
            <Row l="会計済み売上（収受）" v={yen(agg.collected)} />
            <Row l="回数券消化売上（消化ベース）" v={yen(agg.redeem)} />
            <Row l="うち回数券購入売上" v={yen(agg.ticketBuy)} />
            <div className="my-1 border-t border-border/60" />
            <Row l="総売上（収受+消化）" v={yen(agg.total)} bold />
            <p className="mt-1 text-[11px] text-muted-foreground">※ 回数券は「購入売上」と「消化売上」を分けて計上しています。</p>
          </Card>
          <Card title="次回予約・リピート">
            <Row l="来店数" v={`${agg.visits}名`} />
            <Row l="次回予約取得" v={`${agg.nextCount}名`} />
            <Row l="次回予約率" v={`${agg.nextRate}%`} bold />
            <div className="my-1 border-t border-border/60" />
            <Row l="客単価（平均）" v={yen(agg.avgSpend)} />
            <Row l="リピート率" v={`${agg.repeatRate}%`} />
          </Card>
        </div>

        {/* 軸タブ */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {AXES.map((a) => (
            <button key={a.id} onClick={() => setAxis(a.id)} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", axis === a.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-secondary")}>
              {a.label}
            </button>
          ))}
        </div>

        {axis === "store" && <StoreView txns={txns} />}
        {axis === "staff" && <StaffView txns={txns} />}
        {axis === "menu" && <MenuView txns={txns} />}
        {axis === "media" && <MediaView txns={txns} />}
        {axis === "new" && <NewRepeatView txns={txns} />}
      </div>
    </div>
  );
}

// ===== 店舗全体: 推移グラフ + メニュー + 媒体 =====
function StoreView({ txns }: { txns: Txn[] }) {
  const series = dailySeries(txns);
  const max = Math.max(1, ...series.map((s) => s.total));
  return (
    <div className="space-y-4">
      <Card title="日別 売上推移">
        <div className="flex h-40 items-end gap-0.5">
          {series.map((s) => (
            <div key={s.date} className="group relative flex-1" title={`${md(s.date)}：${yen(s.total)}`}>
              <div className="mx-auto w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary" style={{ height: `${Math.max(2, (s.total / max) * 150)}px` }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{series[0] && md(series[0].date)}</span>
          <span>最大 {yen(max)}/日</span>
          <span>{series.length > 0 && md(series[series.length - 1].date)}</span>
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MenuView txns={txns} />
        <MediaView txns={txns} />
      </div>
    </div>
  );
}

// ===== 担当者別ランキング =====
function StaffView({ txns }: { txns: Txn[] }) {
  const rows = groupBy(txns, (t) => t.staffId).sort((a, b) => b.agg.total - a.agg.total);
  const max = Math.max(1, ...rows.map((r) => r.agg.total));
  return (
    <Card title="担当者別ランキング（売上）">
      <div className="space-y-2">
        {rows.map((r, i) => {
          const s = staffById(r.key);
          return (
            <div key={r.key} className="rounded-lg border border-border p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold", i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-700" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-secondary text-muted-foreground")}>
                  {i < 3 ? <Trophy className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="h-3 w-3 rounded-full" style={{ background: s?.color }} />
                <span className="text-sm font-semibold">{s?.name}</span>
                <span className="ml-auto text-sm font-bold tabular-nums">{yen(r.agg.total)}</span>
              </div>
              <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(r.agg.total / max) * 100}%` }} />
              </div>
              <div className="grid grid-cols-4 gap-1 text-center text-[11px]">
                <Mini l="客数" v={`${r.agg.visits}`} />
                <Mini l="客単価" v={yen(r.agg.avgSpend)} />
                <Mini l="次回予約率" v={`${r.agg.nextRate}%`} tone="accent" />
                <Mini l="リピート率" v={`${r.agg.repeatRate}%`} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ===== メニュー別 =====
function MenuView({ txns }: { txns: Txn[] }) {
  const rows = groupBy(txns, (t) => t.menuId).sort((a, b) => b.agg.total - a.agg.total);
  const max = Math.max(1, ...rows.map((r) => r.agg.total));
  return (
    <Card title="メニュー別売上">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="mb-0.5 flex justify-between text-xs">
              <span>{menuById(r.key)?.name ?? r.key}</span>
              <span className="tabular-nums text-muted-foreground">{yen(r.agg.total)} ・ {r.agg.visits}件 ・ 次回{r.agg.nextRate}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-accent" style={{ width: `${(r.agg.total / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ===== 媒体別(LTV含む) =====
function MediaView({ txns }: { txns: Txn[] }) {
  const rows = groupBy(txns, (t) => t.media).sort((a, b) => b.agg.total - a.agg.total);
  return (
    <Card title="媒体別売上・LTV">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] text-muted-foreground">
            <th className="py-1 font-medium">媒体</th>
            <th className="py-1 text-right font-medium">売上</th>
            <th className="py-1 text-right font-medium">来店</th>
            <th className="py-1 text-right font-medium">次回率</th>
            <th className="py-1 text-right font-medium">LTV</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-border/50">
              <td className="py-1.5">{r.key}</td>
              <td className="py-1.5 text-right tabular-nums">{yen(r.agg.total)}</td>
              <td className="py-1.5 text-right tabular-nums">{r.agg.visits}</td>
              <td className="py-1.5 text-right tabular-nums text-accent">{r.agg.nextRate}%</td>
              <td className="py-1.5 text-right tabular-nums">{mediaStat(r.key) ? yen(mediaStat(r.key)!.ltv) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ===== 新規/再来 =====
function NewRepeatView({ txns }: { txns: Txn[] }) {
  const news = aggregate(txns.filter((t) => t.isNew));
  const rep = aggregate(txns.filter((t) => !t.isNew));
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {[
        { label: "新規", a: news, tone: "new" as const },
        { label: "再来", a: rep, tone: "repeat" as const },
      ].map(({ label, a }) => (
        <Card key={label} title={label}>
          <Row l="来店数" v={`${a.visits}名`} />
          <Row l="売上" v={yen(a.total)} />
          <Row l="客単価" v={yen(a.avgSpend)} />
          <Row l="次回予約率" v={`${a.nextRate}%`} bold />
        </Card>
      ))}
    </div>
  );
}

// ===== UI部品 =====
function Kpi({ icon: Icon, label, value, sub, tone }: { icon: typeof TrendingUp; label: string; value: string; sub?: string; tone?: "primary" | "accent" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", tone === "accent" && "text-accent", tone === "primary" && "text-primary")} />
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "accent" && "text-accent", tone === "primary" && "text-primary")}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}
function Row({ l, v, bold }: { l: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-muted-foreground">{l}</span>
      <span className={cn("tabular-nums", bold ? "font-bold text-foreground" : "font-medium")}>{v}</span>
    </div>
  );
}
function Mini({ l, v, tone }: { l: string; v: string; tone?: "accent" }) {
  return (
    <div className="rounded-md bg-secondary/50 py-1">
      <div className="text-[9px] text-muted-foreground">{l}</div>
      <div className={cn("text-xs font-semibold tabular-nums", tone === "accent" && "text-accent")}>{v}</div>
    </div>
  );
}
