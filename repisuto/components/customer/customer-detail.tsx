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
  CheckCircle2,
  Send,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CustomerChart } from "@/components/chart/customer-chart";
import {
  formatCustomerNo,
  staffById,
  ticketStatus,
  isChurnRisk,
  isNewCustomer,
  type Customer,
} from "@/lib/mock-data";
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
  ageFromBirthday,
  ageBand,
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
  const ts = ticketStatus(c);
  const risk = isChurnRisk(c);
  const age = ageFromBirthday(c.birthday);
  const band = ageBand(age);
  const concerns = c.messageTags.filter((t) => !/代$/.test(t) && t !== "VIP" && t !== "新規");
  const mainStaff = staffById(c.mainStaffId)?.name;

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
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            No.{formatCustomerNo(c.customerNo)} ・ {c.phone} ・ 担当 <span className="font-medium text-foreground">{mainStaff}</span>
          </div>

          {/* 属性タグ (一目で分かる) */}
          <div className="mt-2 flex flex-wrap gap-1">
            <AttrTag>{c.gender === "F" ? "女性" : "男性"}</AttrTag>
            {band && <AttrTag>{band}</AttrTag>}
            <AttrTag tone="media">{c.firstSource}</AttrTag>
            {c.tags.includes("VIP") && <AttrTag tone="vip"><Crown className="h-3 w-3" />VIP</AttrTag>}
            {isNewCustomer(c) && <AttrTag tone="new">新規</AttrTag>}
            {c.monthlyMember.active && <AttrTag tone="vip"><Crown className="h-3 w-3" />月額会員</AttrTag>}
            <AttrTag tone={ts.tone === "warn" || ts.tone === "danger" ? ts.tone : "default"}>回数券 {ts.label}</AttrTag>
            {risk && <AttrTag tone="danger"><AlertTriangle className="h-3 w-3" />要フォロー</AttrTag>}
            {concerns.map((t) => (
              <AttrTag key={t} tone="concern">#{t}</AttrTag>
            ))}
          </div>
        </div>
      </div>

      {/* サマリKPI */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="LTV" value={yen(c.ltv)} tone="accent" />
        <Stat label="最終来店" value={jpDate(c.lastVisitDate)} />
        <Stat label="次回予約" value={c.nextVisitDate ? jpDate(c.nextVisitDate) : "なし"} tone={c.nextVisitDate ? undefined : "warn"} />
        <Stat
          label="回数券残"
          value={ts.tone === "none" ? "なし" : `${ts.total}回`}
          tone={ts.tone === "warn" ? "warn" : ts.tone === "danger" ? "danger" : undefined}
        />
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

function AttrTag({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "media" | "vip" | "new" | "concern" | "warn" | "danger";
}) {
  const cls = {
    default: "bg-secondary text-secondary-foreground",
    media: "bg-sky-100 text-sky-700",
    vip: "bg-amber-100 text-amber-700",
    new: "bg-rose-100 text-rose-700",
    concern: "bg-accent/12 text-accent",
    warn: "bg-amber-100 text-amber-700",
    danger: "bg-rose-100 text-rose-700",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium", cls)}>
      {children}
    </span>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "accent" | "warn" | "danger" }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card px-3 py-2",
        tone === "warn" ? "border-amber-200 bg-amber-50/60" : tone === "danger" ? "border-rose-200 bg-rose-50/60" : "border-border"
      )}
    >
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-sm font-semibold tabular-nums",
          tone === "accent" && "text-accent",
          tone === "warn" && "text-amber-700",
          tone === "danger" && "text-rose-700"
        )}
      >
        {value}
      </div>
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
function Card({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn("rounded-xl border border-border bg-card p-4", className)}>
      {children}
    </div>
  );
}

// ============ 1. 基本情報 ============
function BasicTab({ c }: { c: Customer }) {
  const age = ageFromBirthday(c.birthday);
  const staffName = (id: string) => staffById(id)?.name ?? "—";
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>プロフィール</SectionTitle>
        <Row label="顧客No" value={formatCustomerNo(c.customerNo)} />
        <Row label="氏名" value={c.name} />
        <Row label="カナ" value={c.kana} />
        <Row label="電話番号" value={c.phone} />
        <Row label="性別" value={c.gender === "F" ? "女性" : "男性"} />
        <Row label="生年月日" value={c.birthday ? c.birthday.replace(/-/g, "/") : "—"} />
        <Row label="年齢" value={age !== null ? `${age}歳` : "—"} />
        <Row label="LINE連携" value={c.lineLinked ? <span className="text-emerald-600">連携済み（{c.lineName ?? "—"}）</span> : <span className="text-amber-600">未連携</span>} />
      </Card>
      <Card>
        <SectionTitle>担当者</SectionTitle>
        <Row label="主担当" value={<span className="font-semibold">{staffName(c.mainStaffId)}</span>} />
        <Row label="初回担当" value={staffName(c.firstStaffId)} />
        <Row label="前回担当" value={staffName(c.lastStaffId)} />
        <Row label="次回担当" value={staffName(c.mainStaffId)} />
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
  return <CustomerChart customer={c} />;
}

// ============ 4. 会計 ============
function PosTab({ c }: { c: Customer }) {
  const a = accountingSummary(c);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="累計LTV" value={yen(a.ltv)} tone="accent" />
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
  const risk = isChurnRisk(c);
  return (
    <div className="space-y-4">
      {risk && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          回数券残なし・次回予約なし。離反リスクが高いためフォローを推奨します。
        </div>
      )}
      <div>
        <SectionTitle>保有回数券</SectionTitle>
        {c.tickets.length === 0 && (
          <Card className="flex items-center gap-2 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4" /> 回数券なし（追加販売の好機）
          </Card>
        )}
        <div className="space-y-2">
          {c.tickets.map((t) => {
            const tone = t.remaining === 0 ? "danger" : t.remaining === 1 ? "warn" : "ok";
            const toneCls = tone === "danger" ? "border-rose-200 bg-rose-50/60" : tone === "warn" ? "border-amber-200 bg-amber-50/60" : "border-border";
            const badgeCls = tone === "danger" ? "bg-rose-100 text-rose-700" : tone === "warn" ? "bg-amber-100 text-amber-700" : "bg-accent/12 text-accent";
            const iconCls = tone === "danger" ? "text-rose-500" : tone === "warn" ? "text-amber-500" : "text-accent";
            return (
              <Card key={t.id} className={cn("flex items-center gap-3 p-3", toneCls)}>
                <TicketIcon className={cn("h-5 w-5", iconCls)} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    消化 {t.totalCount - t.remaining}/{t.totalCount}回 ・ 残り {t.remaining}回 ・ {t.durationMin}分
                    {t.remaining <= 1 && <span className="ml-1 font-medium text-amber-700">{t.remaining === 0 ? "・要追加販売" : "・残りわずか"}</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground">対応：{t.menus} ・ 有効期限 {t.validUntil.replace(/-/g, "/")}</div>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", badgeCls)}>残{t.remaining}</span>
              </Card>
            );
          })}
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
