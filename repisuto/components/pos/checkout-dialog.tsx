"use client";

import * as React from "react";
import {
  Plus,
  X,
  Wallet,
  CheckCircle2,
  CalendarPlus,
  MessageCircle,
  FileText,
  Ticket as TicketIcon,
  Star,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { minToLabel } from "@/lib/time";
import { customerById, staffById, ticketStatus, type Reservation } from "@/lib/mock-data";
import { jpDate } from "@/lib/customer-data";
import {
  PRODUCTS,
  OPTIONS,
  COUPONS,
  TICKET_PLANS,
  MEMBERSHIP_PLANS,
  ENROLLMENT_FEE,
  REFERRAL_DISCOUNT,
  PAYMENT_METHODS,
  LINE_KIND_LABEL,
  initialLines,
  computeTotals,
  checkoutAI,
  yen,
  type LineItem,
  type LineKind,
  type PaymentMethod,
} from "@/lib/pos";

const LINE_TONE: Partial<Record<LineKind, string>> = {
  discount: "text-rose-600",
  coupon: "text-rose-600",
  referral: "text-rose-600",
  ticketUse: "text-rose-600",
};

export function CheckoutDialog({
  reservation: r,
  onOpenChange,
  onComplete,
}: {
  reservation: Reservation | null;
  onOpenChange: (open: boolean) => void;
  onComplete: (id: string) => void;
}) {
  return (
    <Dialog open={!!r} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {r && <CheckoutBody reservation={r} onComplete={onComplete} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CheckoutBody({ reservation: r, onComplete, onClose }: { reservation: Reservation; onComplete: (id: string) => void; onClose: () => void }) {
  const customer = customerById(r.customerId ?? "");
  const staff = staffById(r.staffId);
  const [lines, setLines] = React.useState<LineItem[]>(() => initialLines(r));
  const [split, setSplit] = React.useState(false);
  const [method, setMethod] = React.useState<PaymentMethod>("クレジット");
  const [splitPay, setSplitPay] = React.useState<Record<PaymentMethod, number>>({ 現金: 0, クレジット: 0, PayPay: 0, QR: 0 });
  const [step, setStep] = React.useState<"edit" | "done">("edit");

  const totals = computeTotals(lines);
  const stayMin = r.end - r.start;
  const stay = `${Math.floor(stayMin / 60) > 0 ? `${Math.floor(stayMin / 60)}時間` : ""}${stayMin % 60}分`;
  const posSum = Object.values(splitPay).reduce((s, n) => s + n, 0);
  const remaining = totals.total - posSum;
  const canConfirm = split ? remaining === 0 && totals.total > 0 : totals.total !== 0 || lines.length > 0;

  function addLine(kind: LineKind, name: string, amount: number) {
    setLines((ls) => [...ls, { id: `${kind}-${Date.now()}`, kind, name, amount }]);
  }
  function removeLine(id: string) {
    setLines((ls) => ls.filter((l) => l.id !== id));
  }
  function addCoupon(id: string) {
    const c = COUPONS.find((x) => x.id === id);
    if (!c) return;
    const base = lines.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0);
    const amt = c.kind === "percent" ? -Math.round((base * c.value) / 100) : -c.value;
    addLine("coupon", c.name, amt);
  }

  if (step === "done") {
    return <DoneView reservation={r} total={totals.total} method={split ? "複合支払い" : method} onClose={onClose} />;
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" /> 会計
        </DialogTitle>
        <DialogDescription>
          {customer?.name ?? "(顧客未設定)"} 様 ・ 担当 {staff?.name} ・ {jpDate(r.dateKey)} {minToLabel(r.start)}〜{minToLabel(r.end)}
        </DialogDescription>
      </DialogHeader>

      {/* 基本情報 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Info label="来店回数" value={`${customer?.visitCount ?? 0}回目`} />
        <Info label="滞在時間" value={stay} />
        <Info label="担当" value={staff?.name.split(" ")[0] ?? "—"} />
        <Info label="回数券" value={customer ? ticketStatus(customer).label : "なし"} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_300px]">
        {/* 明細 */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border">
            <div className="border-b border-border px-3 py-2 text-xs font-semibold text-muted-foreground">会計明細</div>
            <div className="max-h-64 overflow-y-auto thin-scrollbar">
              {lines.length === 0 && <div className="px-3 py-4 text-center text-sm text-muted-foreground">明細がありません</div>}
              {lines.map((l) => (
                <div key={l.id} className="flex items-center gap-2 border-b border-border/50 px-3 py-2 text-sm last:border-0">
                  <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                    {LINE_KIND_LABEL[l.kind]}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                  <span className={cn("shrink-0 tabular-nums", LINE_TONE[l.kind] ?? "text-foreground")}>{yen(l.amount)}</span>
                  <button onClick={() => removeLine(l.id)} className="shrink-0 text-muted-foreground hover:text-rose-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 追加コントロール */}
          <div className="space-y-2 rounded-xl border border-border p-3">
            <div className="text-xs font-semibold text-muted-foreground">項目を追加</div>
            <div className="grid grid-cols-2 gap-2">
              <AddSelect label="店販" items={PRODUCTS} onAdd={(it) => addLine("product", it.name, it.price)} />
              <AddSelect label="オプション" items={OPTIONS} onAdd={(it) => addLine("option", it.name, it.price)} />
              <AddSelect label="回数券購入" items={TICKET_PLANS} onAdd={(it) => addLine("ticketBuy", it.name, it.price)} />
              <AddSelect label="サブスク" items={MEMBERSHIP_PLANS} onAdd={(it) => addLine("membership", it.name, it.price)} />
              <AddSelect label="クーポン" items={COUPONS.map((c) => ({ id: c.id, name: c.name, price: 0 }))} onAdd={(it) => addCoupon(it.id)} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <QuickBtn onClick={() => { const m = lines.find((l) => l.kind === "menu"); addLine("ticketUse", `回数券消化（${customer ? ticketStatus(customer).label : ""}）`, m ? -m.amount : 0); }}>
                <TicketIcon className="h-3.5 w-3.5" /> 回数券消化
              </QuickBtn>
              <QuickBtn onClick={() => addLine("enrollment", "入会金", ENROLLMENT_FEE)}>＋入会金</QuickBtn>
              <QuickBtn onClick={() => addLine("referral", "紹介特典", -REFERRAL_DISCOUNT)}>紹介特典</QuickBtn>
              <QuickBtn onClick={() => addLine("discount", "値引き", -500)}>値引き ¥500</QuickBtn>
            </div>
          </div>
        </div>

        {/* 会計結果 + 支払い */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-secondary/30 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">合計（税込）</span>
              <span className="text-2xl font-bold tabular-nums text-foreground">{yen(totals.total)}</span>
            </div>
            <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
              <Line l="税抜" v={yen(totals.taxExcluded)} />
              <Line l="消費税(10%)" v={yen(totals.tax)} />
              <div className="my-1 border-t border-border/60" />
              <Line l="技術売上" v={yen(totals.tech)} />
              <Line l="店販売上" v={yen(totals.retail)} />
              {totals.ticket > 0 && <Line l="回数券売上" v={yen(totals.ticket)} />}
              {totals.membership > 0 && <Line l="会員・入会金" v={yen(totals.membership)} />}
              <div className="my-1 border-t border-border/60" />
              <Line l={`担当売上（${staff?.name.split(" ")[0] ?? ""}）`} v={yen(totals.tech)} />
              <Line l="店舗売上" v={yen(totals.total)} bold />
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">支払い方法</span>
              <button onClick={() => setSplit((s) => !s)} className={cn("text-[11px] font-medium", split ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                {split ? "単一に戻す" : "複合支払い"}
              </button>
            </div>
            {!split ? (
              <div className="grid grid-cols-2 gap-1.5">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={cn("rounded-md border px-2 py-1.5 text-xs font-medium transition-colors", method === m ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary")}
                  >
                    {m}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {PAYMENT_METHODS.map((m) => (
                  <div key={m} className="flex items-center gap-2">
                    <span className="w-20 text-xs">{m}</span>
                    <input
                      type="number"
                      value={splitPay[m] || ""}
                      onChange={(e) => setSplitPay((p) => ({ ...p, [m]: Number(e.target.value) || 0 }))}
                      className="h-8 flex-1 rounded-md border border-input bg-card px-2 text-right text-xs tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="0"
                    />
                  </div>
                ))}
                <div className={cn("text-right text-[11px] font-medium", remaining === 0 ? "text-emerald-600" : "text-rose-600")}>
                  残額 {yen(remaining)}
                </div>
              </div>
            )}
          </div>

          <Button className="w-full" size="lg" disabled={!canConfirm} onClick={() => { onComplete(r.id); setStep("done"); }}>
            <CheckCircle2 className="h-4 w-4" /> {yen(totals.total)} 会計確定
          </Button>
        </div>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
function Line({ l, v, bold }: { l: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span>{l}</span>
      <span className={cn("tabular-nums", bold && "font-semibold text-foreground")}>{v}</span>
    </div>
  );
}
function QuickBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
      {children}
    </button>
  );
}
function AddSelect({ label, items, onAdd }: { label: string; items: { id: string; name: string; price: number }[]; onAdd: (it: { id: string; name: string; price: number }) => void }) {
  return (
    <select
      value=""
      onChange={(e) => {
        const it = items.find((x) => x.id === e.target.value);
        if (it) onAdd(it);
        e.target.value = "";
      }}
      className="h-8 rounded-md border border-input bg-card px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="">＋ {label}</option>
      {items.map((it) => (
        <option key={it.id} value={it.id}>
          {it.name}{it.price ? `（${yen(it.price)}）` : ""}
        </option>
      ))}
    </select>
  );
}

// ===== 会計完了 → 次アクション + AI =====
function DoneView({ reservation: r, total, method, onClose }: { reservation: Reservation; total: number; method: string; onClose: () => void }) {
  const customer = customerById(r.customerId ?? "");
  const ai = customer ? checkoutAI(customer) : null;
  const [done, setDone] = React.useState<Set<string>>(new Set());
  const toggle = (k: string) => setDone((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const ACTIONS = [
    { k: "next", label: "次回予約", icon: CalendarPlus },
    { k: "line", label: "LINE送信", icon: MessageCircle },
    { k: "chart", label: "カルテ記入", icon: FileText },
    { k: "ticket", label: "回数券提案", icon: TicketIcon },
    { k: "review", label: "口コミ依頼", icon: Star },
    { k: "ai", label: "AI提案", icon: Sparkles },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-1 py-2 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <div className="text-lg font-semibold">会計が完了しました</div>
        <div className="text-sm text-muted-foreground">{yen(total)} ・ {method} ・ {customer?.name} 様</div>
      </div>

      {ai?.needsFollow && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          要フォロー対象：回数券残わずか / 次回予約なし。下記アクションでフォローしましょう。
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-semibold text-muted-foreground">施術後にやること（1画面で完結）</div>
        <div className="grid grid-cols-3 gap-2">
          {ACTIONS.map((a) => {
            const on = done.has(a.k);
            const Icon = a.icon;
            return (
              <button
                key={a.k}
                onClick={() => toggle(a.k)}
                className={cn("flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition-colors", on ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-border hover:bg-secondary")}
              >
                {on ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {ai && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-accent">
            <Sparkles className="h-4 w-4" /> AI戦略の提案
          </div>
          <div className="space-y-1.5 text-sm">
            <Line l="失客リスク" v={ai.churnRisk} />
            <Line l="次回来店推奨日" v={ai.nextVisitRecommend} />
            <Line l="おすすめ回数券" v={ai.recommendedTicket} />
            <Line l="次回提案" v={ai.nextProposal} />
          </div>
          <div className="mt-2 rounded-lg bg-card p-2 text-xs text-muted-foreground">
            <div className="mb-0.5 font-medium text-foreground">送るべきLINE（下書き）</div>
            {ai.lineMessage}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>閉じる</Button>
      </div>
    </div>
  );
}
