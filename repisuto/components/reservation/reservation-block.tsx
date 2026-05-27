"use client";

import * as React from "react";
import {
  Star,
  Ticket as TicketIcon,
  MessageCircleOff,
  Wallet,
  FileWarning,
  Coffee,
  Users,
  Ban,
  Minus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { OPEN_MIN, minToLabel } from "@/lib/time";
import {
  blockTitle,
  customerById,
  menuNames,
  staffById,
  ticketRemainingTotal,
  type BlockKind,
  type Reservation,
} from "@/lib/mock-data";

const STATUS_STYLE: Record<Reservation["status"], string> = {
  CONFIRMED: "bg-card border-border",
  ARRIVED: "bg-primary/5 border-primary/40",
  DONE: "bg-emerald-50 border-emerald-200",
  NO_SHOW: "bg-rose-50 border-rose-300 border-dashed",
  CANCELED: "opacity-40",
};

const BLOCK_ICON: Record<Exclude<BlockKind, "RESERVATION">, typeof Coffee> = {
  BREAK: Coffee,
  MEETING: Users,
  BLOCK: Ban,
  OTHER: Minus,
};

const HATCH =
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0, rgba(255,255,255,0.07) 6px, transparent 6px, transparent 12px)";

interface Props {
  reservation: Reservation;
  pxPerMin: number;
  dragging?: boolean;
  highlight?: boolean;
  onBodyPointerDown: (e: React.PointerEvent) => void;
  onResizePointerDown: (e: React.PointerEvent) => void;
}

export function ReservationBlock({
  reservation: r,
  pxPerMin,
  dragging,
  highlight,
  onBodyPointerDown,
  onResizePointerDown,
}: Props) {
  const staff = staffById(r.staffId);
  const left = (r.start - OPEN_MIN) * pxPerMin;
  const width = (r.end - r.start) * pxPerMin;

  const sharedClass = cn(
    "group absolute top-1 bottom-1 cursor-grab touch-none select-none overflow-hidden rounded-md border border-l-[3px] px-2 py-1 text-left shadow-sm transition-shadow hover:shadow-md hover:z-20 active:cursor-grabbing",
    dragging && "z-30 shadow-lg ring-2 ring-primary/40",
    highlight && "z-30 shadow-lg ring-2 ring-accent"
  );

  const resizeHandle = (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        onResizePointerDown(e);
      }}
      className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-transparent group-hover:bg-white/30"
    />
  );

  // ===== 予約以外(予約不可枠) = ダークアウト表示 =====
  if (r.kind !== "RESERVATION") {
    const Icon = BLOCK_ICON[r.kind];
    return (
      <div
        role="button"
        tabIndex={0}
        onPointerDown={onBodyPointerDown}
        onClick={(e) => e.stopPropagation()}
        style={{ left, width, borderLeftColor: staff?.color, backgroundImage: HATCH }}
        className={cn(sharedClass, "border-slate-700 bg-slate-600 text-white")}
      >
        <div className="flex items-center gap-1 text-[11px] font-semibold">
          <Icon className="h-3 w-3 shrink-0" />
          <span className="truncate">{blockTitle(r)}</span>
          <span className="ml-auto shrink-0 text-[10px] font-normal text-white/75">
            {minToLabel(r.start)}
          </span>
        </div>
        <div className="text-[10px] text-white/60">予約不可</div>
        {resizeHandle}
      </div>
    );
  }

  // ===== 予約 =====
  const customer = customerById(r.customerId ?? "");
  const remaining = ticketRemainingTotal(customer);
  const inService = r.status === "ARRIVED" || r.status === "DONE";
  const unpaid = inService && !r.paid;
  const noChart = inService && !r.hasChart;

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={onBodyPointerDown}
      onClick={(e) => e.stopPropagation()}
      style={{ left, width, borderLeftColor: staff?.color }}
      className={cn(sharedClass, STATUS_STYLE[r.status])}
    >
      <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
        {r.isNominated && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
        <span className="truncate">{customer?.name ?? "(顧客未設定)"}</span>
        <span className="ml-auto shrink-0 text-[10px] font-normal text-muted-foreground">
          {minToLabel(r.start)}
        </span>
      </div>

      <div className="truncate text-[10px] text-muted-foreground">{menuNames(r.menuIds)}</div>

      <div className="mt-0.5 flex flex-wrap items-center gap-1">
        {customer?.tags.slice(0, 1).map((t) => (
          <span
            key={t}
            className="rounded bg-secondary px-1 py-px text-[9px] font-medium text-secondary-foreground"
          >
            {t}
          </span>
        ))}
        {remaining > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded bg-accent/12 px-1 py-px text-[9px] font-medium text-accent">
            <TicketIcon className="h-2.5 w-2.5" />
            残{remaining}
          </span>
        )}
        {customer && !customer.lineLinked && (
          <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-px text-[9px] font-medium text-amber-700">
            <MessageCircleOff className="h-2.5 w-2.5" />
            LINE未
          </span>
        )}
        {unpaid && (
          <span className="inline-flex items-center gap-0.5 rounded bg-rose-100 px-1 py-px text-[9px] font-medium text-rose-700">
            <Wallet className="h-2.5 w-2.5" />
            未会計
          </span>
        )}
        {noChart && (
          <span className="inline-flex items-center gap-0.5 rounded border border-border px-1 py-px text-[9px] font-medium text-muted-foreground">
            <FileWarning className="h-2.5 w-2.5" />
            未カルテ
          </span>
        )}
      </div>

      {resizeHandle}
    </div>
  );
}
