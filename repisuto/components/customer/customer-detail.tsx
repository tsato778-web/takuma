"use client";

import * as React from "react";
import {
  Phone,
  MessageCircle,
  Star,
  Ticket as TicketIcon,
  Crown,
  Sparkles,
  ExternalLink,
  ArrowRight,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Send,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatCustomerNo, type Customer } from "@/lib/mock-data";
import {
  visitHistory,
  accountingSummary,
  ticketHistory,
  chatMessages,
  deliveries,
  formAnswers,
  aiStrategy,
  funnelSteps,
  mediaStat,
  CROSS_ANALYSIS,
  daysBetween,
  jpDate,
} from "@/lib/customer-data";

const yen = (n: number) => `¥${n.toLocaleString()}`;

const TABS = [
  { id: "basic", label: "基本情報" },
  { id: "visits", label: "来店履歴" },
  { id: "chart", label: "カルテ" },
  { id: "pos", label: "会計" },
  { id: "tickets", label: "回数券" },
  { id: "line", label: "LINE" },
  { id: "ai", label: "AI戦略" },
  { id: "forms", label: "回答フォーム" },
  { id: "analytics", label: "分析" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function CustomerDetail({
  customer: c,
  variant = "page",
  onOpenFull,
}: {
  customer: Customer;
  variant?: "drawer" | "page";
  onOpenFull?: () => void;
}) {
  const [tab, setTab] = React.useState<TabId>("basic");

  return (
    <div className="flex h-full flex-col bg-background">
      <CustomerHeader c={c} onOpenFull={onOpenFull} onLine={() => setTab("line")} />

      {/* タブバー */}
      <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 thin-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={cn("flex-1 overflow-y-auto thin-scrollbar", variant === "drawer" ? "p-4" : "p-6")}>
        {tab === "basic" && <BasicTab c={c} />}
        {tab === "visits" && <VisitsTab c={c} />}
        {tab === "chart" && <ChartTab c={c} />}
        {tab === "pos" && <PosTab c={c} />}
        {tab === "tickets" && <TicketsTab c={c} />}
        {tab === "line" && <LineTab c={c} />}
        {tab === "ai" && <AiTab c={c} />}
        {tab === "forms" && <FormsTab c={c} />}
        {tab === "analytics" && <AnalyticsTab c={c} />}
      </div>
    </div>
  );
}

// ============ ヘッダー ============
function CustomerHeader({ c, onOpenFull, onLine }: { c: Customer; onOpenFull?: () => void; onLine: () => void }) {
  return (
    <div className="border-b border-border bg-gradient-to-br from-card to-secondary/40 px-5 pb-4 pt-5">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-base font-semibold text-primary-foreground">
          {c.name.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold">{c.name}</span>
            <span className="text-xs text-muted-foreground">{c.kana}</span>
            {c.monthlyMember.active && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                <Crown className="h-3 w-3" /> 月額会員
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            No.{formatCustomerNo(c.customerNo)} ・ {c.gender === "F" ? "女性" : "男性"} ・ {c.phone}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {c.tags.map((t) => (
              <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                {t}
              </span>
            ))}
            {c.messageTags.map((t) => (
              <span key={t} className="rounded bg-accent/12 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                #{t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* サマリKPI */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="LTV" value={yen(c.ltv)} accent />
        <Stat label="最終来店" value={jpDate(c.lastVisitDate)} />
        <Stat label="次回予約" value={c.nextVisitDate ? jpDate(c.nextVisitDate) : "なし"} />
        <Stat label="回数券残" value={`${c.tickets.reduce((s, t) => s + t.remaining, 0)}回`} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onLine}>
          <MessageCircle className="h-4 w-4" /> LINEを送る
        </Button>
        <Button size="sm" variant="outline">
          <Phone className="h-4 w-4" /> 発信
        </Button>
        {onOpenFull && (
          <Button size="sm" className="ml-auto" onClick={onOpenFull}>
            <ExternalLink className="h-4 w-4" /> 詳細を開く
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-semibold tabular-nums", accent && "text-accent")}>{value}</div>
    </div>
  );
}

// ============ 共通 ============
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</div>;
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-border bg-card p-4", className)}>{children}</div>;
}

// ============ 1. 基本情報 ============
function BasicTab({ c }: { c: Customer }) {
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>プロフィール</SectionTitle>
        <Row label="顧客No" value={formatCustomerNo(c.customerNo)} />
        <Row label="氏名" value={c.name} />
        <Row label="カナ" value={c.kana} />
        <Row label="電話番号" value={c.phone} />
        <Row label="性別" value={c.gender === "F" ? "女性" : "男性"} />
        <Row label="LINE連携" value={c.lineLinked ? <span className="text-emerald-600">連携済み</span> : <span className="text-amber-600">未連携</span>} />
      </Card>
      <Card>
        <SectionTitle>媒体・流入</SectionTitle>
        <Row label="初回媒体" value={c.firstSource} />
        <Row label="登録メディア" value={c.registerMedia} />
        <Row label="流入経路" value={c.funnel} />
      </Card>
      <Card>
        <SectionTitle>タグ</SectionTitle>
        <div className="mb-1 text-[11px] text-muted-foreground">顧客タグ</div>
        <div className="mb-3 flex flex-wrap gap-1">
          {c.tags.length ? c.tags.map((t) => <Chip key={t}>{t}</Chip>) : <span className="text-xs text-muted-foreground">—</span>}
        </div>
        <div className="mb-1 text-[11px] text-muted-foreground">メッセージタグ（LINE）</div>
        <div className="flex flex-wrap gap-1">
          {c.messageTags.map((t) => <Chip key={t} accent>#{t}</Chip>)}
        </div>
      </Card>
    </div>
  );
}
function Chip({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", accent ? "bg-accent/12 text-accent" : "bg-secondary text-secondary-foreground")}>
      {children}
    </span>
  );
}

// ============ 2. 来店履歴 ============
function VisitsTab({ c }: { c: Customer }) {
  const visits = visitHistory(c);
  return (
    <div className="space-y-2">
      <SectionTitle>来店タイムライン（計{c.visitCount}回）</SectionTitle>
      {visits.map((v) => (
        <Card key={v.id} className="flex items-center gap-3 p-3">
          <div className="w-14 shrink-0 text-center">
            <div className="text-xs font-semibold tabular-nums">{jpDate(v.date)}</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-sm font-medium">
              {v.nominated && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
              <span className="truncate">{v.menus}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">担当 {v.staffName} ・ {v.payment}</div>
          </div>
          <div className="shrink-0 text-sm font-semibold tabular-nums">{yen(v.amount)}</div>
        </Card>
      ))}
    </div>
  );
}

// ============ 3. カルテ ============
function ChartTab({ c }: { c: Customer }) {
  const visits = visitHistory(c).slice(0, 3);
  return (
    <div className="space-y-3">
      <SectionTitle>施術カルテ</SectionTitle>
      {visits.map((v, i) => (
        <Card key={v.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">{jpDate(v.date)} ・ {v.menus}</div>
            <span className="text-[11px] text-muted-foreground">担当 {v.staffName}</span>
          </div>
          <Row label="使用薬剤/設定" value={i === 0 ? "アッシュ8 / オキシ3%" : "前回同様"} />
          <Row label="仕上がり" value={i === 0 ? "やや明るめ希望・次回トーンダウン" : "良好"} />
          <Row label="注意事項" value={c.tags.includes("敏感肌") ? "敏感肌：パッチテスト要" : "特記なし"} />
          <div className="flex gap-2 pt-1">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
              <Camera className="h-5 w-5" />
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
              <Camera className="h-5 w-5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ============ 4. 会計 ============
function PosTab({ c }: { c: Customer }) {
  const a = accountingSummary(c);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="累計LTV" value={yen(a.ltv)} accent />
        <Stat label="来店回数" value={`${a.visitCount}回`} />
        <Stat label="平均単価" value={yen(a.avgSpend)} />
      </div>
      <div>
        <SectionTitle>最近の会計</SectionTitle>
        <Card className="p-0">
          {a.recent.map((v) => (
            <div key={v.id} className="flex items-center justify-between border-b border-border/60 px-4 py-2.5 text-sm last:border-0">
              <div>
                <div className="font-medium">{v.menus}</div>
                <div className="text-[11px] text-muted-foreground">{jpDate(v.date)} ・ {v.payment}</div>
              </div>
              <div className="font-semibold tabular-nums">{yen(v.amount)}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ============ 5. 回数券 ============
function TicketsTab({ c }: { c: Customer }) {
  const history = ticketHistory(c);
  return (
    <div className="space-y-4">
      <div>
        <SectionTitle>保有回数券</SectionTitle>
        {c.tickets.length === 0 && <Card className="text-sm text-muted-foreground">保有なし</Card>}
        <div className="space-y-2">
          {c.tickets.map((t) => (
            <Card key={t.name} className="flex items-center gap-3 p-3">
              <TicketIcon className="h-5 w-5 text-accent" />
              <div className="flex-1">
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-[11px] text-muted-foreground">残り {t.remaining} 回</div>
              </div>
              <span className="rounded-full bg-accent/12 px-2 py-0.5 text-xs font-semibold text-accent">残{t.remaining}</span>
            </Card>
          ))}
        </div>
      </div>
      <Card className="flex items-center gap-3">
        <Crown className={cn("h-5 w-5", c.monthlyMember.active ? "text-amber-500" : "text-muted-foreground")} />
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">月額会員状況</div>
          <div className="text-sm font-medium">{c.monthlyMember.active ? c.monthlyMember.plan : "未加入"}</div>
        </div>
        {c.monthlyMember.active ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">継続中</span>
        ) : (
          <Button size="sm" variant="outline">加入を提案</Button>
        )}
      </Card>
      {history.length > 0 && (
        <div>
          <SectionTitle>消化・購入履歴</SectionTitle>
          <Card className="p-0">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-sm last:border-0">
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", h.type === "購入" ? "bg-sky-100 text-sky-700" : "bg-secondary text-secondary-foreground")}>{h.type}</span>
                <span className="flex-1 px-3 text-xs">{h.detail}</span>
                <span className="text-[11px] tabular-nums text-muted-foreground">{jpDate(h.date)}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

// ============ 6. LINE ============
function LineTab({ c }: { c: Customer }) {
  const msgs = chatMessages(c);
  const dels = deliveries(c);
  if (!c.lineLinked) {
    return (
      <Card className="flex flex-col items-center gap-2 py-8 text-center">
        <MessageCircle className="h-8 w-8 text-muted-foreground" />
        <div className="text-sm font-medium">LINE未連携</div>
        <p className="max-w-xs text-xs text-muted-foreground">連携クーポンを発行して友だち追加を促進できます。</p>
        <Button size="sm" className="mt-1">連携クーポンを発行</Button>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <SectionTitle>チャット履歴</SectionTitle>
        <Card className="space-y-2 bg-secondary/30">
          {msgs.map((m) => (
            <div key={m.id} className={cn("flex", m.from === "customer" ? "justify-start" : "justify-end")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3 py-1.5 text-xs", m.from === "customer" ? "bg-card text-foreground" : m.from === "auto" ? "bg-slate-200 text-slate-700" : "bg-emerald-500 text-white")}>
                {m.from === "auto" && <div className="text-[9px] font-semibold opacity-70">自動応答</div>}
                {m.text}
                <div className={cn("mt-0.5 text-[9px]", m.from === "customer" ? "text-muted-foreground" : "opacity-70")}>{m.at}</div>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <input disabled placeholder="メッセージを入力（モック）" className="h-8 flex-1 rounded-full border border-input bg-card px-3 text-xs" />
            <Button size="icon" className="h-8 w-8 rounded-full"><Send className="h-3.5 w-3.5" /></Button>
          </div>
        </Card>
      </div>
      <div>
        <SectionTitle>メッセージタグ</SectionTitle>
        <div className="flex flex-wrap gap-1">{c.messageTags.map((t) => <Chip key={t} accent>#{t}</Chip>)}</div>
      </div>
      <div>
        <SectionTitle>配信・シナリオ・自動応答履歴</SectionTitle>
        <Card className="p-0">
          {dels.map((d) => (
            <div key={d.id} className="flex items-center gap-2 border-b border-border/60 px-4 py-2 text-sm last:border-0">
              <span className="w-10 shrink-0 text-[11px] tabular-nums text-muted-foreground">{d.date}</span>
              <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                d.kind === "一斉配信" ? "bg-violet-100 text-violet-700" : d.kind === "リマインド" ? "bg-amber-100 text-amber-700" : d.kind === "自動応答" ? "bg-slate-200 text-slate-700" : "bg-sky-100 text-sky-700")}>{d.kind}</span>
              <span className="min-w-0 flex-1 truncate text-xs">{d.title}</span>
              <span className={cn("shrink-0 text-[10px] font-medium", d.status === "予約" ? "text-accent" : "text-muted-foreground")}>{d.status}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ============ 7. AI戦略 ============
function AiTab({ c }: { c: Customer }) {
  const ai = aiStrategy(c);
  const riskColor = ai.churnRisk === "高" ? "bg-rose-100 text-rose-700" : ai.churnRisk === "中" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold">AIによる次の一手</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", riskColor)}>
            <AlertTriangle className="h-3 w-3" /> 離反リスク {ai.churnRisk}
          </span>
          <span className="text-xs text-muted-foreground">最終来店から {ai.daysSinceLast} 日</span>
        </div>
        <div className="rounded-lg bg-accent/8 p-3">
          <div className="text-[11px] font-medium text-accent">推奨アクション</div>
          <div className="text-sm font-medium">{ai.nextBestAction}</div>
        </div>
      </Card>
      <div>
        <SectionTitle>提案リスト</SectionTitle>
        <div className="space-y-2">
          {ai.suggestions.map((s, i) => (
            <Card key={i} className="flex items-center gap-2 p-3 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span className="flex-1">{s}</span>
              <Button size="sm" variant="outline">実行</Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ 8. 回答フォーム ============
function FormsTab({ c }: { c: Customer }) {
  const forms = formAnswers(c);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>回答フォーム</SectionTitle>
        <Button size="sm" variant="outline">フォーム項目を編集</Button>
      </div>
      {forms.map((f) => (
        <Card key={f.form} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">{f.form}</div>
            <span className="text-[11px] text-muted-foreground">{f.date} 回答</span>
          </div>
          {f.qa.map((qa) => <Row key={qa.q} label={qa.q} value={qa.a} />)}
          <p className="pt-1 text-[11px] text-muted-foreground">※ 回答内容は顧客タグ・分析に自動で紐付きます。</p>
        </Card>
      ))}
    </div>
  );
}

// ============ 9. 分析 ============
function AnalyticsTab({ c }: { c: Customer }) {
  const steps = funnelSteps(c);
  const stat = mediaStat(c.firstSource);
  const avg = stat?.ltv ?? 0;
  const ratio = avg ? Math.min(100, Math.round((c.ltv / avg) * 100)) : 100;
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>流入ファネル（媒体→フォーム→施術→会員）</SectionTitle>
        <div className="flex flex-wrap items-center gap-1.5">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <span className="rounded-lg bg-secondary px-2 py-1 text-xs font-medium">{s}</span>
              {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </React.Fragment>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>LTV：本人 vs {c.firstSource}平均</SectionTitle>
        <div className="space-y-2">
          <Bar label="本人" value={c.ltv} max={Math.max(c.ltv, avg)} accent />
          <Bar label={`${c.firstSource}平均`} value={avg} max={Math.max(c.ltv, avg)} />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">媒体平均比 <b className="text-foreground">{ratio}%</b></div>
      </Card>

      <Card>
        <SectionTitle>この顧客が属するセグメント指標</SectionTitle>
        <div className="space-y-1.5">
          {CROSS_ANALYSIS.map((x) => (
            <div key={x.label} className="flex items-center justify-between text-sm">
              <span className="text-xs text-muted-foreground">{x.label}</span>
              <span className="font-medium">{x.metric} <b className="text-accent">{x.value}</b></span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">※ 店舗全体の媒体別・クロス分析は「KPI分析」ページ（実装予定）で確認できます。</p>
      </Card>
    </div>
  );
}
function Bar({ label, value, max, accent }: { label: string; value: number; max: number; accent?: boolean }) {
  const w = max ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{yen(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full", accent ? "bg-accent" : "bg-slate-400")} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}
