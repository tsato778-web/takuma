"use client";

import * as React from "react";
import { Search, Crown, AlertTriangle, Ticket as TicketIcon, ChevronRight, Users } from "lucide-react";

import {
  CUSTOMERS,
  MEDIA_OPTIONS,
  formatCustomerNo,
  ticketRemainingTotal,
  isChurnRisk,
  isNewCustomer,
  type Customer,
} from "@/lib/mock-data";
import { jpDate, nextVisitLabel } from "@/lib/customer-data";
import { CustomerDrawer } from "@/components/customer/customer-drawer";
import { cn } from "@/lib/utils";

const yen = (n: number) => `¥${n.toLocaleString()}`;

const SORTS = [
  { id: "no", label: "会員番号順" },
  { id: "ltv", label: "LTVが高い順" },
  { id: "recent", label: "最終来店が新しい順" },
  { id: "old", label: "最終来店が古い順" },
  { id: "ticket", label: "回数券残数が多い順" },
  { id: "next", label: "次回予約が近い順" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

const TOGGLE_FILTERS = [
  { id: "ticketYes", label: "回数券あり" },
  { id: "ticketNo", label: "回数券なし" },
  { id: "nextYes", label: "次回予約あり" },
  { id: "nextNo", label: "次回予約なし" },
  { id: "risk", label: "離反リスク" },
  { id: "vip", label: "VIP" },
  { id: "new", label: "新規" },
] as const;
type ToggleId = (typeof TOGGLE_FILTERS)[number]["id"];

const ALL_TAGS = Array.from(
  new Set(CUSTOMERS.flatMap((c) => [...c.tags, ...c.messageTags]))
);

function lastVisitTs(c: Customer) {
  return new Date(c.lastVisitDate).getTime();
}
function nextTs(c: Customer) {
  return c.nextVisitDate ? new Date(`${c.nextVisitDate}T${c.nextVisitTime ?? "00:00"}`).getTime() : Infinity;
}

export default function CustomersPage() {
  const [selected, setSelected] = React.useState<Customer | null>(null);
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<SortId>("no");
  const [toggles, setToggles] = React.useState<Set<ToggleId>>(new Set());
  const [media, setMedia] = React.useState("");
  const [tag, setTag] = React.useState("");

  function toggle(id: ToggleId) {
    setToggles((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ---- 店舗KPI (全顧客ベース) ----
  const kpi = React.useMemo(() => {
    const total = CUSTOMERS.length;
    const withNext = CUSTOMERS.filter((c) => c.nextVisitDate).length;
    const withTicket = CUSTOMERS.filter((c) => ticketRemainingTotal(c) > 0).length;
    const risk = CUSTOMERS.filter(isChurnRisk).length;
    return {
      total,
      nextRate: Math.round((withNext / total) * 100),
      ticketRate: Math.round((withTicket / total) * 100),
      risk,
    };
  }, []);

  const list = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    let arr = CUSTOMERS.filter((c) => {
      if (query) {
        const hay = [
          String(c.customerNo),
          formatCustomerNo(c.customerNo),
          c.name,
          c.kana,
          c.phone,
          c.lineName ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(query)) return false;
      }
      const tickets = ticketRemainingTotal(c);
      if (toggles.has("ticketYes") && tickets === 0) return false;
      if (toggles.has("ticketNo") && tickets > 0) return false;
      if (toggles.has("nextYes") && !c.nextVisitDate) return false;
      if (toggles.has("nextNo") && c.nextVisitDate) return false;
      if (toggles.has("risk") && !isChurnRisk(c)) return false;
      if (toggles.has("vip") && !c.tags.includes("VIP")) return false;
      if (toggles.has("new") && !isNewCustomer(c)) return false;
      if (media && c.firstSource !== media) return false;
      if (tag && !c.tags.includes(tag) && !c.messageTags.includes(tag)) return false;
      return true;
    });

    arr = [...arr].sort((a, b) => {
      switch (sort) {
        case "ltv":
          return b.ltv - a.ltv;
        case "recent":
          return lastVisitTs(b) - lastVisitTs(a);
        case "old":
          return lastVisitTs(a) - lastVisitTs(b);
        case "ticket":
          return ticketRemainingTotal(b) - ticketRemainingTotal(a);
        case "next":
          return nextTs(a) - nextTs(b);
        default:
          return a.customerNo - b.customerNo;
      }
    });
    return arr;
  }, [q, sort, toggles, media, tag]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-card px-5 py-3">
        <h1 className="text-sm font-semibold">顧客</h1>
        <span className="text-xs text-muted-foreground">{list.length}名</span>
        <div className="relative ml-auto w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="No・氏名・カナ・電話・LINE名で検索"
            className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto thin-scrollbar p-5">
        {/* KPIカード */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard icon={Users} label="総顧客数" value={`${kpi.total}名`} />
          <KpiCard label="次回予約率" value={`${kpi.nextRate}%`} tone="primary" />
          <KpiCard icon={TicketIcon} label="回数券保有率" value={`${kpi.ticketRate}%`} tone="accent" />
          <KpiCard icon={AlertTriangle} label="離反リスク" value={`${kpi.risk}名`} tone="risk" />
        </div>

        {/* フィルター + 並び替え */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {TOGGLE_FILTERS.map((f) => {
            const on = toggles.has(f.id);
            return (
              <button
                key={f.id}
                onClick={() => toggle(f.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  on
                    ? f.id === "risk"
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                )}
              >
                {f.label}
              </button>
            );
          })}
          <select
            value={media}
            onChange={(e) => setMedia(e.target.value)}
            className="h-8 rounded-full border border-border bg-card px-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">媒体（すべて）</option>
            {MEDIA_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="h-8 rounded-full border border-border bg-card px-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">タグ（すべて）</option>
            {ALL_TAGS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">並び替え</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortId)}
              className="h-8 rounded-md border border-border bg-card px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* テーブル */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">No</th>
                <th className="px-4 py-2.5 font-medium">氏名</th>
                <th className="px-4 py-2.5 font-medium">初回媒体</th>
                <th className="px-4 py-2.5 text-right font-medium">LTV</th>
                <th className="px-4 py-2.5 font-medium">最終来店</th>
                <th className="px-4 py-2.5 font-medium">次回予約</th>
                <th className="px-4 py-2.5 font-medium">回数券</th>
                <th className="px-4 py-2.5 font-medium">状態</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const tickets = ticketRemainingTotal(c);
                const risk = isChurnRisk(c);
                const next = nextVisitLabel(c);
                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={cn(
                      "cursor-pointer border-b border-border/60 transition-colors last:border-0",
                      risk ? "bg-rose-50/60 hover:bg-rose-50" : "hover:bg-secondary/40"
                    )}
                  >
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{formatCustomerNo(c.customerNo)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5 font-medium">
                        {c.name}
                        {c.tags.slice(0, 1).map((t) => (
                          <span key={t} className="rounded bg-secondary px-1 py-px text-[10px] font-medium text-secondary-foreground">{t}</span>
                        ))}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{c.lineName ? `LINE: ${c.lineName}` : c.kana}</div>
                    </td>
                    <td className="px-4 py-2.5 text-xs">{c.firstSource}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{yen(c.ltv)}</td>
                    <td className="px-4 py-2.5 text-xs tabular-nums">{jpDate(c.lastVisitDate)}</td>
                    <td className="px-4 py-2.5 text-xs tabular-nums">
                      {next ? <span className="text-foreground">{next}</span> : <span className="text-muted-foreground">なし</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {tickets > 0 ? (
                        <span className="inline-flex items-center gap-0.5 rounded bg-accent/12 px-1.5 py-0.5 text-[11px] font-medium text-accent">
                          <TicketIcon className="h-3 w-3" />残{tickets}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">なし</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {c.monthlyMember.active && <Crown className="h-4 w-4 text-amber-500" aria-label="月額会員" />}
                        {risk && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                            <AlertTriangle className="h-3 w-3" />要フォロー
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    条件に一致する顧客がいません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">行をクリックで右ドロワー表示 →「詳細を開く」でフルページに遷移します。</p>
      </div>

      <CustomerDrawer customer={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon?: typeof Users;
  label: string;
  value: string;
  tone?: "primary" | "accent" | "risk";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4",
        tone === "risk" ? "border-rose-200 bg-rose-50/50" : "border-border"
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {Icon && <Icon className={cn("h-3.5 w-3.5", tone === "risk" && "text-rose-500")} />}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "accent" && "text-accent",
          tone === "primary" && "text-primary",
          tone === "risk" && "text-rose-600"
        )}
      >
        {value}
      </div>
    </div>
  );
}
