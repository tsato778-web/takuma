"use client";

import * as React from "react";
import { Wallet, Clock, CheckCircle2, TrendingUp, Repeat } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  SEED_RESERVATIONS,
  customerById,
  staffById,
  menuById,
  menuNames,
  STAFF,
  type Reservation,
} from "@/lib/mock-data";
import { minToLabel } from "@/lib/time";
import { PAYMENT_METHODS, yen, type CheckoutSummary } from "@/lib/pos";
import { CheckoutDialog } from "@/components/pos/checkout-dialog";

function initLog(reservations: Reservation[]): CheckoutSummary[] {
  return reservations
    .filter((r) => r.kind === "RESERVATION" && r.paid)
    .map((r) => {
      const collected = r.menuIds.reduce((s, id) => s + (menuById(id)?.price ?? 0), 0);
      return {
        reservationId: r.id,
        collected,
        redeem: 0,
        ticketBuy: 0,
        payments: [{ method: "クレジット" as const, amount: collected }],
        serviceStaffId: r.staffId,
        cashierStaffId: r.staffId,
      };
    });
}

export default function PosPage() {
  const [reservations, setReservations] = React.useState<Reservation[]>(SEED_RESERVATIONS);
  const [salesLog, setSalesLog] = React.useState<CheckoutSummary[]>(() => initLog(SEED_RESERVATIONS));
  const [checkoutId, setCheckoutId] = React.useState<string | null>(null);
  const [staff, setStaff] = React.useState("");

  const today = SEED_RESERVATIONS[0]?.dateKey;
  const all = reservations
    .filter((r) => r.kind === "RESERVATION" && r.dateKey === today && r.status !== "CANCELED" && (!staff || r.staffId === staff))
    .sort((a, b) => a.start - b.start);
  const waiting = all.filter((r) => !r.paid);
  const done = all.filter((r) => r.paid);

  const log = salesLog.filter((s) => !staff || s.serviceStaffId === staff);
  const grossBase = log.reduce((s, l) => s + l.collected, 0); // 総売上ベース(決済額)
  const redeemBase = log.reduce((s, l) => s + l.redeem, 0); // 消化売上ベース
  const payBreak = PAYMENT_METHODS.map((m) => ({
    method: m,
    amount: log.reduce((s, l) => s + l.payments.filter((p) => p.method === m).reduce((a, p) => a + p.amount, 0), 0),
  })).filter((x) => x.amount > 0);

  function complete(id: string, summary: CheckoutSummary) {
    setReservations((rs) => rs.map((r) => (r.id === id ? { ...r, status: "DONE", paid: true } : r)));
    setSalesLog((l) => [...l.filter((s) => s.reservationId !== id), summary]);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-3">
        <h1 className="flex items-center gap-2 text-sm font-semibold">
          <Wallet className="h-4 w-4 text-muted-foreground" /> 会計
        </h1>
        <span className="text-xs text-muted-foreground">本日 {all.length}件</span>
        <select
          value={staff}
          onChange={(e) => setStaff(e.target.value)}
          className={cn("ml-auto h-8 rounded-md border bg-card px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", staff ? "border-primary text-primary" : "border-border")}
        >
          <option value="">店舗全体</option>
          {STAFF.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-auto thin-scrollbar p-5">
        {/* 本日の売上: 総売上ベース と 消化売上ベース を分離 */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={TrendingUp} label="本日売上（総売上ベース／決済額）" value={yen(grossBase)} tone="primary" sub="その日に決済された金額" />
          <Kpi icon={Repeat} label="本日売上（消化売上ベース）" value={yen(redeemBase)} tone="accent" sub="回数券などの役務提供分" />
          <Kpi icon={Clock} label="会計待ち" value={`${waiting.length}件`} tone="warn" />
          <Kpi icon={CheckCircle2} label="会計済み" value={`${done.length}件`} tone="ok" />
        </div>

        {/* 決済種別内訳 */}
        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">決済種別の内訳（複合決済対応）</div>
          {payBreak.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ会計がありません</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
              {payBreak.map((p) => (
                <div key={p.method} className="flex justify-between border-b border-border/50 py-1 text-sm">
                  <span className="text-muted-foreground">{p.method}</span>
                  <span className="font-medium tabular-nums">{yen(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">会計待ち</div>
        <div className="space-y-2">
          {waiting.length === 0 && <p className="text-sm text-muted-foreground">会計待ちはありません</p>}
          {waiting.map((r) => (
            <Row key={r.id} r={r} onClick={() => setCheckoutId(r.id)} />
          ))}
        </div>

        {done.length > 0 && (
          <>
            <div className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">会計済み</div>
            <div className="space-y-2 opacity-70">
              {done.map((r) => (
                <Row key={r.id} r={r} done onClick={() => setCheckoutId(r.id)} />
              ))}
            </div>
          </>
        )}
      </div>

      <CheckoutDialog
        reservation={checkoutId ? reservations.find((r) => r.id === checkoutId) ?? null : null}
        onOpenChange={(o) => !o && setCheckoutId(null)}
        onComplete={complete}
      />
    </div>
  );
}

function Row({ r, onClick, done }: { r: Reservation; onClick: () => void; done?: boolean }) {
  const c = customerById(r.customerId ?? "");
  const s = staffById(r.staffId);
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-secondary/30">
      <span className="w-14 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">{minToLabel(r.start)}</span>
      <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: s?.color }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{c?.name ?? "(顧客未設定)"}</div>
        <div className="truncate text-[11px] text-muted-foreground">{menuNames(r.menuIds)} ・ {s?.name}</div>
      </div>
      {done ? (
        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">会計済</span>
      ) : (
        <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">会計する</span>
      )}
    </button>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: { icon: typeof Clock; label: string; value: string; sub?: string; tone?: "warn" | "ok" | "primary" | "accent" }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", tone === "warn" ? "border-amber-200 bg-amber-50/50" : tone === "ok" ? "border-emerald-200 bg-emerald-50/40" : "border-border")}>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", tone === "warn" && "text-amber-500", tone === "ok" && "text-emerald-500", tone === "accent" && "text-accent", tone === "primary" && "text-primary")} />
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "warn" && "text-amber-700", tone === "ok" && "text-emerald-700", tone === "accent" && "text-accent", tone === "primary" && "text-primary")}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
