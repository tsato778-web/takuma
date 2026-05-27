"use client";

import * as React from "react";
import { Wallet, Clock, CheckCircle2, Receipt } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  SEED_RESERVATIONS,
  customerById,
  staffById,
  menuNames,
  type Reservation,
} from "@/lib/mock-data";
import { minToLabel } from "@/lib/time";
import { CheckoutDialog } from "@/components/pos/checkout-dialog";

export default function PosPage() {
  const [reservations, setReservations] = React.useState<Reservation[]>(SEED_RESERVATIONS);
  const [checkoutId, setCheckoutId] = React.useState<string | null>(null);

  const today = SEED_RESERVATIONS[0]?.dateKey;
  const list = reservations
    .filter((r) => r.kind === "RESERVATION" && r.dateKey === today && r.status !== "CANCELED")
    .sort((a, b) => a.start - b.start);

  const waiting = list.filter((r) => !r.paid);
  const done = list.filter((r) => r.paid);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-card px-5 py-3">
        <h1 className="flex items-center gap-2 text-sm font-semibold">
          <Wallet className="h-4 w-4 text-muted-foreground" /> 会計
        </h1>
        <span className="text-xs text-muted-foreground">本日 {list.length}件</span>
      </div>

      <div className="flex-1 overflow-auto thin-scrollbar p-5">
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Kpi icon={Clock} label="会計待ち" value={`${waiting.length}件`} tone="warn" />
          <Kpi icon={CheckCircle2} label="会計済み" value={`${done.length}件`} tone="ok" />
          <Kpi icon={Receipt} label="本日売上(会計済)" value="¥—" />
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
        onComplete={(id) => setReservations((rs) => rs.map((r) => (r.id === id ? { ...r, status: "DONE", paid: true } : r)))}
      />
    </div>
  );
}

function Row({ r, onClick, done }: { r: Reservation; onClick: () => void; done?: boolean }) {
  const c = customerById(r.customerId ?? "");
  const s = staffById(r.staffId);
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-secondary/30"
    >
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

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Clock; label: string; value: string; tone?: "warn" | "ok" }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", tone === "warn" ? "border-amber-200 bg-amber-50/50" : tone === "ok" ? "border-emerald-200 bg-emerald-50/40" : "border-border")}>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", tone === "warn" && "text-amber-500", tone === "ok" && "text-emerald-500")} />
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "warn" && "text-amber-700", tone === "ok" && "text-emerald-700")}>{value}</div>
    </div>
  );
}
