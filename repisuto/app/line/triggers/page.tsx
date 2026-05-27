"use client";

import * as React from "react";
import { Zap, Send, MessageCircle, Clock, Power, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { PageShell, Chip } from "@/components/admin/page-shell";
import { jpDate, TODAY } from "@/lib/customer-data";
import { TRIGGER_RULES, buildQueue, type Channel } from "@/lib/line-triggers";

const CH_TONE: Record<Channel, string> = {
  LINE: "bg-emerald-100 text-emerald-700",
  SMS: "bg-sky-100 text-sky-700",
  メール: "bg-secondary text-muted-foreground",
};
const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

export default function TriggersPage() {
  const [active, setActive] = React.useState<Set<string>>(() => new Set(TRIGGER_RULES.filter((r) => r.active).map((r) => r.id)));
  const toggle = (id: string) => setActive((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const queue = React.useMemo(() => buildQueue(active), [active]);
  const week = addDays(TODAY, 7);
  const todayCount = queue.filter((q) => q.at === TODAY).length;
  const weekCount = queue.filter((q) => q.at <= week).length;

  return (
    <PageShell
      title="LINE自動トリガー"
      description="顧客の状態・経過日数に応じて「誰に・いつ・何を送るか」を自動算出。状態が変われば配信も自動で切り替わります。"
      action={<span className="cursor-default rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">＋ トリガー作成</span>}
    >
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Power} label="稼働中トリガー" value={`${active.size}/${TRIGGER_RULES.length}`} />
        <Kpi icon={Send} label="本日の配信予定" value={`${todayCount}件`} tone="primary" />
        <Kpi icon={Clock} label="今後7日の配信予定" value={`${weekCount}件`} tone="accent" />
        <Kpi icon={MessageCircle} label="配信予定 合計(45日)" value={`${queue.length}件`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        {/* トリガールール */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">トリガールール</div>
          <div className="space-y-2">
            {TRIGGER_RULES.map((r) => {
              const on = active.has(r.id);
              return (
                <div key={r.id} className={cn("rounded-xl border bg-card p-3 transition-colors", on ? "border-border" : "border-border/60 opacity-60")}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggle(r.id)} className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-secondary")}>
                      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", on ? "left-4" : "left-0.5")} />
                    </button>
                    <span className="text-sm font-semibold">{r.name}</span>
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", CH_TONE[r.channel])}>{r.channel}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">直近30日 {r.sent30d}件</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" />{r.triggerLabel}</span>
                    <Chip tone="muted">{r.condition}</Chip>
                  </div>
                  <div className="mt-1 truncate text-[11px] text-muted-foreground" title={r.template}>{r.template}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 配信予定キュー */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">配信予定キュー（自動算出・パーソナライズ済み）</div>
          <div className="space-y-2">
            {queue.length === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">稼働中トリガーに該当する配信予定はありません</div>}
            {queue.map((q) => (
              <div key={q.id} className="rounded-xl border border-border bg-card p-3">
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tabular-nums", q.overdue ? "bg-amber-100 text-amber-700" : "bg-secondary text-foreground")}>
                    {q.overdue && <AlertTriangle className="h-3 w-3" />}
                    {q.at === TODAY ? (q.overdue ? "本日要送信" : "本日") : jpDate(q.at)}
                  </span>
                  <span className="font-medium">{q.customerName}</span>
                  <span className="text-muted-foreground">{q.ruleName}</span>
                  <span className={cn("ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium", CH_TONE[q.channel])}>{q.channel}</span>
                </div>
                <div className="rounded-md bg-secondary/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">{q.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent/8 px-3 py-2 text-[11px] text-accent">
        <Zap className="h-3.5 w-3.5" />
        モックUI：顧客の最終来店日・次回予約・回数券残・誕生日・口コミ状況から配信予定を算出。実装では LINE Messaging API とスケジューラに接続し、送信ログ・開封率をKPIへ反映します。
      </div>
    </PageShell>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Zap; label: string; value: string; tone?: "primary" | "accent" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", tone === "accent" && "text-accent", tone === "primary" && "text-primary")} />
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "accent" && "text-accent", tone === "primary" && "text-primary")}>{value}</div>
    </div>
  );
}
