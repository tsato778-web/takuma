"use client";

import * as React from "react";
import {
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
  Plus,
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
import { customerById, staffById, STAFF, type Customer, type Reservation } from "@/lib/mock-data";
import { jpDate } from "@/lib/customer-data";
import {
  PRODUCTS,
  OPTIONS,
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
  type Totals,
  type CheckoutSummary,
} from "@/lib/pos";

const LINE_TONE: Partial<Record<LineKind, string>> = {
  discount: "text-rose-600",
  coupon: "text-rose-600",
  referral: "text-rose-600",
  ticketUse: "text-rose-600",
};

interface PayRow {
  id: string;
  method: PaymentMethod;
  amount: number;
}
interface CheckoutResult {
  totals: Totals;
  payments: PayRow[];
  serviceStaff?: string;
  cashierStaff?: string;
  ticketSellStaff?: string;
  ticketUseStaff?: string;
  consumed: { name: string; count: number; remaining: number }[];
  reviewTags: string[];
}

const REVIEW_OPTIONS: { key: string; label: string; tag: string }[] = [
  { key: "google", label: "Google口コミ取得", tag: "Google口コミ済" },
  { key: "hpb", label: "ホットペッパー口コミ取得", tag: "HPB口コミ済" },
  { key: "asked", label: "口コミ依頼済み", tag: "口コミ依頼済" },
];

export function CheckoutDialog({
  reservation: r,
  onOpenChange,
  onComplete,
}: {
  reservation: Reservation | null;
  onOpenChange: (open: boolean) => void;
  onComplete: (id: string, summary: CheckoutSummary) => void;
}) {
  return (
    <Dialog open={!!r} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {r && <CheckoutBody reservation={r} onComplete={onComplete} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CheckoutBody({ reservation: r, onComplete, onClose }: { reservation: Reservation; onComplete: (id: string, summary: CheckoutSummary) => void; onClose: () => void }) {
  const customer = customerById(r.customerId ?? "");
  const staff = staffById(r.staffId);
  const heldTickets = (customer?.tickets ?? []).filter((t) => t.remaining > 0);

  const [lines, setLines] = React.useState<LineItem[]>(() => initialLines(r));
  const [payments, setPayments] = React.useState<PayRow[]>([]);
  const [payMethod, setPayMethod] = React.useState<PaymentMethod>("現金");
  const [payAmount, setPayAmount] = React.useState<string>("");
  const [serviceStaffId, setServiceStaffId] = React.useState(r.staffId);
  const [cashierStaffId, setCashierStaffId] = React.useState(r.staffId);
  const [ticketSellStaffId, setTicketSellStaffId] = React.useState(r.staffId);
  const [ticketUseStaffId, setTicketUseStaffId] = React.useState(r.staffId);
  const [ticketId, setTicketId] = React.useState(heldTickets[0]?.id ?? "");
  const [consumeCount, setConsumeCount] = React.useState(1);
  const [discKind, setDiscKind] = React.useState<"amount" | "percent" | "coupon">("amount");
  const [discValue, setDiscValue] = React.useState("");
  const [reviews, setReviews] = React.useState<Set<string>>(new Set());
  const [result, setResult] = React.useState<CheckoutResult | null>(null);
  const toggleReview = (k: string) => setReviews((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const totals = computeTotals(lines);
  const stayMin = r.end - r.start;
  const stay = `${Math.floor(stayMin / 60) > 0 ? `${Math.floor(stayMin / 60)}時間` : ""}${stayMin % 60}分`;
  const paidSum = payments.reduce((s, p) => s + p.amount, 0);
  const shortage = totals.total - paidSum; // >0:不足  <0:お釣り
  const hasTicketBuy = lines.some((l) => l.kind === "ticketBuy");
  const hasTicketUse = lines.some((l) => l.kind === "ticketUse");
  const canConfirm = totals.total === 0 ? true : paidSum >= totals.total;

  function addLine(p: Partial<LineItem> & Pick<LineItem, "kind" | "name" | "amount">) {
    setLines((ls) => [...ls, { id: `${p.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...p }]);
  }
  const removeLine = (id: string) => setLines((ls) => ls.filter((l) => l.id !== id));

  function consumeTicket() {
    const t = heldTickets.find((x) => x.id === ticketId);
    if (!t) return;
    const covered = lines.find((l) => l.kind === "menu" && t.menus && l.name.includes(t.menus)) ?? lines.find((l) => l.kind === "menu");
    const offset = covered ? -covered.amount : -(t.unitPrice * consumeCount);
    addLine({
      kind: "ticketUse",
      name: `${t.name} 消化 ${consumeCount}回`,
      amount: offset,
      count: consumeCount,
      redeemValue: t.unitPrice * consumeCount,
      ticketId: t.id,
    });
  }

  function addDiscount() {
    const v = Number(discValue) || 0;
    if (discKind === "percent") {
      const base = lines.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0);
      if (v > 0) addLine({ kind: "coupon", name: `${v}%割引`, amount: -Math.round((base * v) / 100) });
    } else if (discKind === "coupon") {
      if (v > 0) addLine({ kind: "coupon", name: "その他クーポン", amount: -v });
    } else {
      if (v > 0) addLine({ kind: "discount", name: "値引き", amount: -v });
    }
    setDiscValue("");
  }

  function addPayment() {
    const amt = payAmount === "" ? Math.max(0, shortage) : Number(payAmount) || 0;
    if (amt <= 0) return;
    setPayments((ps) => [...ps, { id: `pay-${Date.now()}`, method: payMethod, amount: amt }]);
    setPayAmount("");
  }

  function confirm() {
    const consumed = lines
      .filter((l) => l.kind === "ticketUse" && l.ticketId)
      .map((l) => {
        const t = heldTickets.find((x) => x.id === l.ticketId)!;
        return { name: t.name, count: l.count ?? 1, remaining: Math.max(0, t.remaining - (l.count ?? 1)) };
      });
    // 口コミタグを顧客に保存(モック: 共有データへ反映)
    const reviewTags = REVIEW_OPTIONS.filter((o) => reviews.has(o.key)).map((o) => o.tag);
    if (customer) reviewTags.forEach((tag) => { if (!customer.tags.includes(tag)) customer.tags.push(tag); });
    const finalPayments = payments.length ? payments : totals.total === 0 ? [] : [{ id: "p", method: payMethod, amount: totals.total }];
    onComplete(r.id, {
      reservationId: r.id,
      collected: totals.total,
      redeem: totals.redeem,
      ticketBuy: totals.ticketBuy,
      payments: finalPayments.map((p) => ({ method: p.method, amount: p.amount })),
      serviceStaffId,
      cashierStaffId,
    });
    setResult({
      reviewTags,
      totals,
      payments: payments.length ? payments : totals.total === 0 ? [] : [{ id: "p", method: payMethod, amount: totals.total }],
      serviceStaff: staffById(serviceStaffId)?.name,
      cashierStaff: staffById(cashierStaffId)?.name,
      ticketSellStaff: hasTicketBuy ? staffById(ticketSellStaffId)?.name : undefined,
      ticketUseStaff: hasTicketUse ? staffById(ticketUseStaffId)?.name : undefined,
      consumed,
    });
  }

  if (result) {
    return <DoneView customer={customer} result={result} onClose={onClose} />;
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Info label="来店回数" value={`${customer?.visitCount ?? 0}回目`} />
        <Info label="滞在時間" value={stay} />
        <Info label="施術メニュー" value={lines.filter((l) => l.kind === "menu").map((l) => l.name).join("+") || "—"} />
        <Info label="保有回数券" value={heldTickets.length ? `${heldTickets.length}種` : "なし"} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        {/* 明細 + 追加 */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border">
            <div className="border-b border-border px-3 py-2 text-xs font-semibold text-muted-foreground">会計明細</div>
            <div className="max-h-56 overflow-y-auto thin-scrollbar">
              {lines.length === 0 && <div className="px-3 py-4 text-center text-sm text-muted-foreground">明細がありません</div>}
              {lines.map((l) => (
                <div key={l.id} className="flex items-center gap-2 border-b border-border/50 px-3 py-2 text-sm last:border-0">
                  <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">{LINE_KIND_LABEL[l.kind]}</span>
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                  {l.redeemValue ? <span className="shrink-0 text-[10px] text-muted-foreground">消化売上 {yen(l.redeemValue)}</span> : null}
                  <span className={cn("shrink-0 tabular-nums", LINE_TONE[l.kind] ?? "text-foreground")}>{yen(l.amount)}</span>
                  <button onClick={() => removeLine(l.id)} className="shrink-0 text-muted-foreground hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* 追加項目 */}
          <div className="space-y-2 rounded-xl border border-border p-3">
            <div className="text-xs font-semibold text-muted-foreground">項目を追加</div>
            <div className="grid grid-cols-2 gap-2">
              <AddSelect label="店販" items={PRODUCTS} onAdd={(it) => addLine({ kind: "product", name: it.name, amount: it.price })} />
              <AddSelect label="オプション" items={OPTIONS} onAdd={(it) => addLine({ kind: "option", name: it.name, amount: it.price })} />
              <AddSelect label="回数券購入" items={TICKET_PLANS} onAdd={(it) => addLine({ kind: "ticketBuy", name: it.name, amount: it.price })} />
              <AddSelect label="サブスク" items={MEMBERSHIP_PLANS} onAdd={(it) => addLine({ kind: "membership", name: it.name, amount: it.price })} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <QuickBtn onClick={() => addLine({ kind: "enrollment", name: "入会金", amount: ENROLLMENT_FEE })}>＋入会金</QuickBtn>
            </div>

            {/* 回数券消化 */}
            {heldTickets.length > 0 && (
              <div className="rounded-lg bg-secondary/40 p-2">
                <div className="mb-1 text-[11px] font-semibold text-muted-foreground">回数券を消化</div>
                <div className="flex items-center gap-1.5">
                  <select value={ticketId} onChange={(e) => setTicketId(e.target.value)} className="h-8 min-w-0 flex-1 rounded-md border border-input bg-card px-2 text-xs">
                    {heldTickets.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}（残{t.remaining}・{t.durationMin}分）</option>
                    ))}
                  </select>
                  <input type="number" min={1} value={consumeCount} onChange={(e) => setConsumeCount(Math.max(1, Number(e.target.value) || 1))} className="h-8 w-12 rounded-md border border-input bg-card px-2 text-center text-xs" />
                  <span className="text-[11px] text-muted-foreground">回</span>
                  <Button size="sm" variant="outline" onClick={consumeTicket}>消化</Button>
                </div>
              </div>
            )}

            {/* 値引き・クーポン */}
            <div className="rounded-lg bg-secondary/40 p-2">
              <div className="mb-1 text-[11px] font-semibold text-muted-foreground">値引き・クーポン</div>
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                <QuickBtn onClick={() => addLine({ kind: "discount", name: "値引き", amount: -500 })}>¥500引き</QuickBtn>
                <QuickBtn onClick={() => addLine({ kind: "discount", name: "値引き", amount: -1000 })}>¥1,000引き</QuickBtn>
                <QuickBtn onClick={() => addLine({ kind: "referral", name: "紹介特典", amount: -REFERRAL_DISCOUNT })}>紹介特典</QuickBtn>
                <QuickBtn onClick={() => addLine({ kind: "discount", name: "端数調整", amount: -(totals.total % 100) })}>端数調整</QuickBtn>
              </div>
              <div className="flex items-center gap-1.5">
                <select value={discKind} onChange={(e) => setDiscKind(e.target.value as typeof discKind)} className="h-8 rounded-md border border-input bg-card px-2 text-xs">
                  <option value="amount">固定金額</option>
                  <option value="percent">割合(%)</option>
                  <option value="coupon">その他クーポン</option>
                </select>
                <input type="number" value={discValue} onChange={(e) => setDiscValue(e.target.value)} placeholder={discKind === "percent" ? "%" : "¥"} className="h-8 w-20 rounded-md border border-input bg-card px-2 text-right text-xs" />
                <Button size="sm" variant="outline" onClick={addDiscount}><Plus className="h-3.5 w-3.5" />追加</Button>
              </div>
            </div>
          </div>

          {/* 担当者 */}
          <div className="space-y-2 rounded-xl border border-border p-3">
            <div className="text-xs font-semibold text-muted-foreground">担当者</div>
            <div className="grid grid-cols-2 gap-2">
              <StaffSelect label="施術担当" value={serviceStaffId} onChange={setServiceStaffId} />
              <StaffSelect label="会計担当" value={cashierStaffId} onChange={setCashierStaffId} />
              {hasTicketBuy && <StaffSelect label="回数券販売担当" value={ticketSellStaffId} onChange={setTicketSellStaffId} />}
              {hasTicketUse && <StaffSelect label="回数券消化担当" value={ticketUseStaffId} onChange={setTicketUseStaffId} />}
            </div>
          </div>

          {/* 口コミ */}
          <div className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Star className="h-3.5 w-3.5" /> 口コミ取得（顧客タグに保存）
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REVIEW_OPTIONS.map((o) => {
                const on = reviews.has(o.key);
                return (
                  <button
                    key={o.key}
                    onClick={() => toggleReview(o.key)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      on ? "border-amber-300 bg-amber-50 text-amber-700" : "border-border bg-card text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    {on ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 結果 + 支払い */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-secondary/30 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">本日会計（税込）</span>
              <span className="text-2xl font-bold tabular-nums">{yen(totals.total)}</span>
            </div>
            <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
              <Line l="税抜" v={yen(totals.taxExcluded)} />
              <Line l="消費税(10%)" v={yen(totals.tax)} />
              <div className="my-1 border-t border-border/60" />
              <Line l="技術売上" v={yen(totals.tech)} />
              {totals.retail > 0 && <Line l="店販売上" v={yen(totals.retail)} />}
              {totals.ticketBuy > 0 && <Line l="回数券購入売上" v={yen(totals.ticketBuy)} />}
              {totals.membership > 0 && <Line l="会員・入会金" v={yen(totals.membership)} />}
              {totals.redeem > 0 && <Line l="回数券消化売上（別計上）" v={yen(totals.redeem)} />}
              <div className="my-1 border-t border-border/60" />
              <Line l="店舗売上" v={yen(totals.total)} />
              <Line l="総売上（収受+消化）" v={yen(totals.grand)} bold />
            </div>
          </div>

          {/* 支払い(複合対応) */}
          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">支払い方法（複合可）</div>
            <div className="space-y-1 mb-2">
              {payments.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="w-5 text-[11px] text-muted-foreground">{i + 1}.</span>
                  <span className="flex-1">{p.method}</span>
                  <span className="tabular-nums">{yen(p.amount)}</span>
                  <button onClick={() => setPayments((ps) => ps.filter((x) => x.id !== p.id))} className="text-muted-foreground hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)} className="h-8 rounded-md border border-input bg-card px-2 text-xs">
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={shortage > 0 ? String(shortage) : "0"} className="h-8 w-24 rounded-md border border-input bg-card px-2 text-right text-xs tabular-nums" />
              <Button size="sm" variant="outline" onClick={addPayment}><Plus className="h-3.5 w-3.5" />追加</Button>
            </div>
            <div className="mt-2 space-y-0.5 border-t border-border/60 pt-2 text-[11px]">
              <Line l="合計" v={yen(totals.total)} />
              <Line l="支払い済み" v={yen(paidSum)} />
              {shortage > 0 ? (
                <div className="flex justify-between font-semibold text-rose-600"><span>不足額</span><span className="tabular-nums">{yen(shortage)}</span></div>
              ) : shortage < 0 ? (
                <div className="flex justify-between font-semibold text-emerald-600"><span>お釣り</span><span className="tabular-nums">{yen(-shortage)}</span></div>
              ) : (
                <div className="flex justify-between font-semibold text-emerald-600"><span>残額</span><span>¥0</span></div>
              )}
            </div>
          </div>

          <Button className="w-full" size="lg" disabled={!canConfirm} onClick={confirm}>
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
      <div className="truncate text-sm font-semibold">{value}</div>
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
    <button onClick={onClick} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">{children}</button>
  );
}
function AddSelect({ label, items, onAdd }: { label: string; items: { id: string; name: string; price: number }[]; onAdd: (it: { id: string; name: string; price: number }) => void }) {
  return (
    <select value="" onChange={(e) => { const it = items.find((x) => x.id === e.target.value); if (it) onAdd(it); e.target.value = ""; }} className="h-8 rounded-md border border-input bg-card px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <option value="">＋ {label}</option>
      {items.map((it) => <option key={it.id} value={it.id}>{it.name}{it.price ? `（${yen(it.price)}）` : ""}</option>)}
    </select>
  );
}
function StaffSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-0.5 h-8 w-full rounded-md border border-input bg-card px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {STAFF.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </label>
  );
}

// ===== 会計完了 =====
function DoneView({ customer, result, onClose }: { customer?: Customer; result: CheckoutResult; onClose: () => void }) {
  const ai = customer ? checkoutAI(customer) : null;
  const [done, setDone] = React.useState<Set<string>>(new Set());
  const toggle = (k: string) => setDone((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const t = result.totals;

  const ACTIONS = [
    { k: "next", label: "次回予約", icon: CalendarPlus },
    { k: "line", label: "LINE送信", icon: MessageCircle },
    { k: "chart", label: "カルテ記入", icon: FileText },
    { k: "ticket", label: "回数券提案", icon: TicketIcon },
    { k: "review", label: "口コミ依頼", icon: Star },
    { k: "ai", label: "AI提案", icon: Sparkles },
  ];

  return (
    <div className="max-h-[80vh] space-y-4 overflow-y-auto thin-scrollbar">
      <div className="flex flex-col items-center gap-1 py-1 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <div className="text-lg font-semibold">会計が完了しました</div>
        <div className="text-sm text-muted-foreground">{yen(t.total)} ・ {customer?.name} 様</div>
      </div>

      {/* 支払い・担当 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border p-3 text-xs">
          <div className="mb-1 font-semibold text-muted-foreground">支払い</div>
          {result.payments.length === 0 ? <div className="text-muted-foreground">回数券消化のみ（収受なし）</div> : result.payments.map((p, i) => (
            <Line key={i} l={p.method} v={yen(p.amount)} />
          ))}
        </div>
        <div className="rounded-xl border border-border p-3 text-xs">
          <div className="mb-1 font-semibold text-muted-foreground">担当</div>
          <Line l="施術" v={result.serviceStaff ?? "—"} />
          <Line l="会計" v={result.cashierStaff ?? "—"} />
          {result.ticketSellStaff && <Line l="回数券販売" v={result.ticketSellStaff} />}
          {result.ticketUseStaff && <Line l="回数券消化" v={result.ticketUseStaff} />}
        </div>
      </div>

      {result.reviewTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs">
          <Star className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-muted-foreground">口コミタグを付与:</span>
          {result.reviewTags.map((t) => (
            <span key={t} className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">{t}</span>
          ))}
        </div>
      )}

      {/* 反映先 */}
      <div className="rounded-xl border border-border p-3">
        <div className="mb-1.5 text-xs font-semibold text-muted-foreground">会計結果の反映</div>
        <div className="space-y-0.5 text-[11px]">
          <Line l="総売上（収受+消化）" v={yen(t.grand)} bold />
          <Line l="店舗売上（収受）" v={yen(t.total)} />
          <Line l="回数券購入売上" v={yen(t.ticketBuy)} />
          <Line l="回数券消化売上" v={yen(t.redeem)} />
          {result.consumed.map((c, i) => (
            <Line key={i} l={`回数券残数（${c.name}）`} v={`残${c.remaining}回`} />
          ))}
          <Line l="LTV加算" v={yen(t.grand)} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {["顧客詳細", "KPI分析", "LINE/AI戦略"].map((x) => (
            <span key={x} className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" />{x}へ連携</span>
          ))}
        </div>
      </div>

      {ai?.needsFollow && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          要フォロー対象：回数券残わずか / 次回予約なし。
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-semibold text-muted-foreground">施術後にやること（1画面で完結）</div>
        <div className="grid grid-cols-3 gap-2">
          {ACTIONS.map((a) => {
            const on = done.has(a.k);
            const Icon = a.icon;
            return (
              <button key={a.k} onClick={() => toggle(a.k)} className={cn("flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition-colors", on ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-border hover:bg-secondary")}>
                {on ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {ai && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-accent"><Sparkles className="h-4 w-4" /> AI戦略の提案</div>
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

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>閉じる</Button>
      </div>
    </div>
  );
}
