"use client";

import * as React from "react";
import Link from "next/link";
import { TrendingUp, CalendarCheck, Repeat, Wallet, Trophy, Ticket as TicketIcon, FileText, AlertTriangle, Star, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  CUSTOMERS,
  SEED_RESERVATIONS,
  STAFF,
  staffById,
  menuById,
  ticketRemainingTotal,
  isChurnRisk,
  formatCustomerNo,
} from "@/lib/mock-data";
import { mediaStat, nextVisitLabel } from "@/lib/customer-data";
import { allCharts } from "@/lib/charts";
import { DatePicker } from "@/components/reservation/date-picker";
import { txnsInRange, aggregate, groupBy, dailySeries, paymentBreakdown, repeatBreakdown, type Txn } from "@/lib/analytics";

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
  const [view, setView] = React.useState<"manager" | "field">("manager");
  const [mode, setMode] = React.useState<Mode>("month");
  const [anchor, setAnchor] = React.useState(new Date(2026, 4, 27));
  const [rStart, setRStart] = React.useState(new Date(2026, 4, 1));
  const [rEnd, setREnd] = React.useState(new Date(2026, 4, 27));
  const [axis, setAxis] = React.useState<Axis>("store");
  const [staff, setStaff] = React.useState("");

  const { from, to, label } = React.useMemo(() => {
    if (mode === "day") return { from: iso(anchor), to: iso(anchor), label: `${anchor.getMonth() + 1}/${anchor.getDate()} の集計` };
    if (mode === "week") {
      const d = new Date(anchor);
      const day = (d.getDay() + 6) % 7;
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

  const txns = React.useMemo(() => {
    const t = txnsInRange(from, to);
    return staff ? t.filter((x) => x.staffId === staff) : t;
  }, [from, to, staff]);
  const agg = React.useMemo(() => aggregate(txns), [txns]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-3">
        <h1 className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-muted-foreground" /> KPI分析
        </h1>
        <div className="flex overflow-hidden rounded-md border border-border">
          {(["manager", "field"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cn("px-3 py-1.5 text-xs font-medium transition-colors", view === v ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-secondary")}>
              {v === "manager" ? "経営者ビュー" : "現場ビュー"}
            </button>
          ))}
        </div>
        {view === "manager" && (
          <>
            <div className="flex overflow-hidden rounded-md border border-border">
              {MODES.map((m) => (
                <button key={m.id} onClick={() => setMode(m.id)} className={cn("px-3 py-1.5 text-xs font-medium transition-colors", mode === m.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary")}>{m.label}</button>
              ))}
            </div>
            {mode === "custom" ? (
              <div className="flex items-center gap-1"><DatePicker value={rStart} onChange={setRStart} /><span className="text-muted-foreground">〜</span><DatePicker value={rEnd} onChange={setREnd} /></div>
            ) : (
              <DatePicker value={anchor} onChange={setAnchor} />
            )}
            <select value={staff} onChange={(e) => setStaff(e.target.value)} className={cn("h-8 rounded-md border bg-card px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", staff ? "border-primary text-primary" : "border-border")}>
              <option value="">店舗全体</option>
              {STAFF.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <span className="ml-auto text-xs font-medium text-muted-foreground">{label} ・ {agg.visits}来店</span>
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto thin-scrollbar p-5">
        {view === "field" ? <FieldView /> : <ManagerView txns={txns} agg={agg} axis={axis} setAxis={setAxis} />}
      </div>
    </div>
  );
}

function ManagerView({ txns, agg, axis, setAxis }: { txns: Txn[]; agg: ReturnType<typeof aggregate>; axis: Axis; setAxis: (a: Axis) => void }) {
  const pays = paymentBreakdown(txns).filter((p) => p.amount > 0);
  const rep = repeatBreakdown(txns);
  // 回数券の現在残高(店舗スナップショット)
  const unredeemed = CUSTOMERS.reduce((s, c) => s + c.tickets.reduce((a, t) => a + t.remaining * t.unitPrice, 0), 0);
  const remainTotal = CUSTOMERS.reduce((s, c) => s + ticketRemainingTotal(c), 0);

  return (
    <>
      <ForecastSection />
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={TrendingUp} label="総売上（収受+消化）" value={yen(agg.total)} tone="primary" />
        <Kpi icon={Wallet} label="会計済み売上" value={yen(agg.collected)} sub={`消化ベース ${yen(agg.redeem)}`} />
        <Kpi icon={CalendarCheck} label="次回予約率" value={`${agg.nextRate}%`} tone="accent" sub={`${agg.nextCount}/${agg.visits}名`} />
        <Kpi icon={Repeat} label="リピート率" value={`${agg.repeatRate}%`} sub={`再来 ${agg.repeatCount}名`} />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card title="売上区分（総売上ベース / 消化ベース）">
          <Row l="会計済み売上（収受・キャッシュ）" v={yen(agg.collected)} />
          <Row l="回数券消化売上（消化ベース・役務）" v={yen(agg.redeem)} />
          <Row l="うち回数券購入売上" v={yen(agg.ticketBuy)} />
          <div className="my-1 border-t border-border/60" />
          <Row l="総売上（収受+消化）" v={yen(agg.total)} bold />
        </Card>
        <Card title="決済種別の内訳（複合決済対応）">
          {pays.length === 0 ? <p className="text-sm text-muted-foreground">データなし</p> : pays.map((p) => <Row key={p.method} l={p.method} v={yen(p.amount)} />)}
        </Card>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card title="リピート率の切り口">
          <Row l="全体リピート率" v={`${rep.overall}%`} bold />
          <Row l={`初回来店者（${rep.firstN}名）`} v={`${rep.first}%`} />
          <Row l={`再来店者（${rep.repeatN}名）`} v={`${rep.repeat}%`} />
          <p className="mt-1 text-[11px] text-muted-foreground">※ 担当者別・メニュー別・媒体別は下の軸タブで切替できます。</p>
        </Card>
        <Card title="回数券の状況">
          <Row l="回数券販売額（期間）" v={yen(agg.ticketBuy)} />
          <Row l="回数券消化額（期間）" v={yen(agg.redeem)} />
          <div className="my-1 border-t border-border/60" />
          <Row l="未消化残高（現在）" v={yen(unredeemed)} bold />
          <Row l="回数券残数合計（現在）" v={`${remainTotal}回`} />
        </Card>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {AXES.map((a) => (
          <button key={a.id} onClick={() => setAxis(a.id)} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", axis === a.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-secondary")}>{a.label}</button>
        ))}
      </div>

      {axis === "store" && <StoreView txns={txns} />}
      {axis === "staff" && <StaffView txns={txns} />}
      {axis === "menu" && <MenuView txns={txns} />}
      {axis === "media" && <MediaView txns={txns} />}
      {axis === "new" && <NewRepeatView txns={txns} />}
    </>
  );
}

// ===== 現場ビュー =====
function FieldView() {
  const today = SEED_RESERVATIONS[0]?.dateKey;
  const waiting = SEED_RESERVATIONS.filter((r) => r.kind === "RESERVATION" && r.dateKey === today && r.status !== "CANCELED" && !r.paid).length;
  const noChart = allCharts().filter((c) => c.status !== "記入済").length;
  const noNext = CUSTOMERS.filter((c) => !c.nextVisitDate).length;
  const remain1 = CUSTOMERS.filter((c) => ticketRemainingTotal(c) === 1).length;
  const follow = CUSTOMERS.filter((c) => isChurnRisk(c) || (ticketRemainingTotal(c) === 1 && !c.nextVisitDate));
  const google = CUSTOMERS.filter((c) => c.tags.includes("Google口コミ済")).length;
  const hpb = CUSTOMERS.filter((c) => c.tags.includes("HPB口コミ済")).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Wallet} label="本日の会計待ち" value={`${waiting}件`} tone="warn" />
        <Kpi icon={FileText} label="未カルテ" value={`${noChart}件`} tone="warn" />
        <Kpi icon={CalendarCheck} label="次回予約 未取得" value={`${noNext}名`} />
        <Kpi icon={TicketIcon} label="回数券 残1" value={`${remain1}名`} tone="accent" />
      </div>

      <Card title="要フォロー顧客（回数券残わずか・次回予約なし）">
        {follow.length === 0 ? (
          <p className="text-sm text-muted-foreground">該当なし</p>
        ) : (
          <div className="space-y-1.5">
            {follow.map((c) => {
              const remain = ticketRemainingTotal(c);
              const reasons: string[] = [];
              if (remain === 0) reasons.push("回数券なし");
              else if (remain === 1) reasons.push("回数券残1");
              if (!c.nextVisitDate) reasons.push("次回予約なし");
              return (
                <Link key={c.id} href={`/customers/${c.id}`} className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2 text-sm transition-colors hover:bg-rose-50">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span className="font-medium">{c.name}</span>
                  <span className="text-[11px] text-muted-foreground">No.{formatCustomerNo(c.customerNo)}</span>
                  <span className="ml-1 text-[11px] text-muted-foreground">{nextVisitLabel(c) ? `次回 ${nextVisitLabel(c)}` : "次回未定"}</span>
                  <div className="ml-auto flex gap-1">
                    {reasons.map((r) => <span key={r} className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">{r}</span>)}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="口コミ取得状況">
        <div className="grid grid-cols-3 gap-3">
          <Mini l="口コミ取得 合計" v={`${google + hpb}件`} />
          <Mini l="Google口コミ" v={`${google}件`} />
          <Mini l="ホットペッパー口コミ" v={`${hpb}件`} />
        </div>
      </Card>
    </div>
  );
}

// ===== 店舗全体 =====
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

function StaffView({ txns }: { txns: Txn[] }) {
  const rows = groupBy(txns, (t) => t.staffId).sort((a, b) => b.agg.total - a.agg.total);
  const max = Math.max(1, ...rows.map((r) => r.agg.total));
  return (
    <Card title="担当者別ランキング">
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
              <div className="mb-1 text-[11px] text-muted-foreground">会計済 {yen(r.agg.collected)} ・ 消化 {yen(r.agg.redeem)} ・ 回数券販売 {yen(r.agg.ticketBuy)}</div>
              <div className="grid grid-cols-5 gap-1 text-center text-[11px]">
                <Mini l="客数" v={`${r.agg.visits}`} />
                <Mini l="客単価" v={yen(r.agg.avgSpend)} />
                <Mini l="次回予約率" v={`${r.agg.nextRate}%`} tone="accent" />
                <Mini l="リピート率" v={`${r.agg.repeatRate}%`} />
                <Mini l="回数券販売率" v={`${r.agg.ticketBuyRate}%`} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

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
              <span className="tabular-nums text-muted-foreground">{yen(r.agg.total)} ・ {r.agg.visits}件 ・ 次回{r.agg.nextRate}% ・ ﾘﾋﾟ{r.agg.repeatRate}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-accent" style={{ width: `${(r.agg.total / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MediaView({ txns }: { txns: Txn[] }) {
  const rows = groupBy(txns, (t) => t.media).sort((a, b) => b.agg.total - a.agg.total);
  return (
    <Card title="媒体別売上・回数券率・LTV">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] text-muted-foreground">
            <th className="py-1 font-medium">媒体</th>
            <th className="py-1 text-right font-medium">売上</th>
            <th className="py-1 text-right font-medium">来店</th>
            <th className="py-1 text-right font-medium">次回率</th>
            <th className="py-1 text-right font-medium">回数券率</th>
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
              <td className="py-1.5 text-right tabular-nums">{r.agg.ticketBuyRate}%</td>
              <td className="py-1.5 text-right tabular-nums">{mediaStat(r.key) ? yen(mediaStat(r.key)!.ltv) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function NewRepeatView({ txns }: { txns: Txn[] }) {
  const news = aggregate(txns.filter((t) => t.isNew));
  const rep = aggregate(txns.filter((t) => !t.isNew));
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {[{ label: "新規", a: news }, { label: "再来", a: rep }].map(({ label, a }) => (
        <Card key={label} title={label}>
          <Row l="来店数" v={`${a.visits}名`} />
          <Row l="売上" v={yen(a.total)} />
          <Row l="客単価" v={yen(a.avgSpend)} />
          <Row l="次回予約率" v={`${a.nextRate}%`} />
          <Row l="リピート率" v={`${a.repeatRate}%`} bold />
        </Card>
      ))}
    </div>
  );
}

// ===== 月末着地予測（経営者向け） =====
const MONTH = { start: "2026-05-01", end: "2026-05-31", today: "2026-05-27", elapsed: 27, total: 31 };
const TARGET_SALES = 3_000_000; // 目標売上(モック・本来は店舗設定)

function ForecastSection() {
  const all = txnsInRange(MONTH.start, MONTH.end);
  const upto = all.filter((t) => t.date <= MONTH.today);
  const future = all.filter((t) => t.date > MONTH.today);
  const actual = aggregate(upto);
  const futureAgg = aggregate(future);
  const proj = (v: number) => Math.round((v / MONTH.elapsed) * MONTH.total);

  const totalForecast = proj(actual.total);
  const redeemForecast = proj(actual.redeem);
  const newActual = actual.visits - actual.repeatCount;
  const newForecast = proj(newActual);
  const newCollected = upto.filter((t) => t.isNew).reduce((s, t) => s + t.collected, 0);
  const newAvg = newActual ? Math.round(newCollected / newActual) : 50000;

  const achieve = Math.round((totalForecast / TARGET_SALES) * 100);
  const shortfall = Math.max(0, TARGET_SALES - totalForecast);
  const needNew = Math.ceil(shortfall / Math.max(1, newAvg));
  const needTicket = Math.ceil(shortfall / 40000);
  const needNext = Math.ceil(shortfall / Math.max(1, actual.avgSpend));

  return (
    <div className="mb-4 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-semibold">今月の着地予測（2026年5月）</span>
        <span className="text-[11px] text-muted-foreground">{MONTH.today.slice(5).replace("-", "/")}時点 ・ 経過{MONTH.elapsed}/{MONTH.total}日</span>
      </div>

      {/* 目標 vs 着地 */}
      <div className="mb-3 rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div><span className="text-[11px] text-muted-foreground">目標売上</span> <span className="font-semibold tabular-nums">{yen(TARGET_SALES)}</span></div>
          <div><span className="text-[11px] text-muted-foreground">月末予測（総売上）</span> <span className="text-xl font-bold tabular-nums text-primary">{yen(totalForecast)}</span></div>
          <div><span className="text-[11px] text-muted-foreground">達成率</span> <span className={cn("font-bold tabular-nums", achieve >= 100 ? "text-emerald-600" : "text-amber-600")}>{achieve}%</span></div>
          <div><span className="text-[11px] text-muted-foreground">不足額</span> <span className="font-semibold tabular-nums text-rose-600">{shortfall > 0 ? yen(shortfall) : "達成見込み"}</span></div>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary">
          <div className={cn("h-full rounded-full", achieve >= 100 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${Math.min(100, achieve)}%` }} />
        </div>
      </div>

      {/* 予測内訳 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Fc label="総売上ベース 着地" v={yen(totalForecast)} accent />
        <Fc label="消化売上ベース 着地" v={yen(redeemForecast)} />
        <Fc label="会計済み売上（実績）" v={yen(actual.collected)} />
        <Fc label="予約済み売上見込み" v={yen(futureAgg.collected)} />
        <Fc label="回数券購入見込み" v={yen(proj(actual.ticketBuy))} />
        <Fc label="回数券消化見込み" v={yen(redeemForecast)} />
        <Fc label="新規数 着地予測" v={`${newForecast}名`} />
        <Fc label="次回予約率 予測" v={`${actual.nextRate}%`} />
        <Fc label="リピート率 予測" v={`${actual.repeatRate}%`} />
        <Fc label="客単価 予測" v={yen(actual.avgSpend)} />
      </div>

      {/* 必要アクション */}
      {shortfall > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs">
          <span className="font-semibold text-amber-800">目標達成に必要なアクション（目安）：</span>
          <span className="rounded-full bg-card px-2 py-0.5 font-medium">新規 あと{needNew}名</span>
          <span className="rounded-full bg-card px-2 py-0.5 font-medium">回数券 あと{needTicket}件</span>
          <span className="rounded-full bg-card px-2 py-0.5 font-medium">次回予約 あと{needNext}件</span>
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">※ 実績ペース＋予約予定から算出（モック）。新規数×平均初回単価、リピート率からの再来見込みも本実装で接続します。</p>
    </div>
  );
}
function Fc({ label, v, accent }: { label: string; v: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-semibold tabular-nums", accent && "text-primary")}>{v}</div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: { icon: typeof TrendingUp; label: string; value: string; sub?: string; tone?: "primary" | "accent" | "warn" }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", tone === "warn" ? "border-amber-200 bg-amber-50/50" : "border-border")}>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", tone === "accent" && "text-accent", tone === "primary" && "text-primary", tone === "warn" && "text-amber-500")} />
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "accent" && "text-accent", tone === "primary" && "text-primary", tone === "warn" && "text-amber-700")}>{value}</div>
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
    <div className="rounded-md bg-secondary/50 py-1 text-center">
      <div className="text-[9px] text-muted-foreground">{l}</div>
      <div className={cn("text-xs font-semibold tabular-nums", tone === "accent" && "text-accent")}>{v}</div>
    </div>
  );
}
