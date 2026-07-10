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
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { OPEN_MIN, minToLabel } from "@/lib/time";
import {
  blockTitle,
  customerById,
  menuNames,
  staffById,
  ticketRemainingTotal,
  isNewCustomer,
  reservationColor,
  MENU_COLOR,
  CANCEL_TYPE_LABEL,
  ROLE_LABEL,
  type AssignRole,
  type BlockKind,
  type Reservation,
} from "@/lib/mock-data";

const BLOCK_ICON: Record<Exclude<BlockKind, "RESERVATION">, typeof Coffee> = {
  BREAK: Coffee,
  MEETING: Users,
  BLOCK: Ban,
  OTHER: Minus,
};

const HATCH =
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0, rgba(255,255,255,0.07) 6px, transparent 6px, transparent 12px)";
const HATCH_LIGHT =
  "repeating-linear-gradient(45deg, rgba(15,23,42,0.10) 0, rgba(15,23,42,0.10) 4px, transparent 4px, transparent 8px)";

interface Props {
  reservation: Reservation;
  pxPerMin: number;
  dragging?: boolean;
  highlight?: boolean;
  conflict?: boolean;
  conflictInfo?: string;
  staffWarn?: boolean;
  // 担当セグメント描画用 (複数担当)
  segStart?: number;
  segEnd?: number;
  segRole?: AssignRole; // 指定時は assignment セグメント
  segLabel?: string;
  relayPrev?: boolean; // 直前に別スタッフから引き継がれた
  relayNext?: boolean; // 直後に別スタッフへ引き継ぐ
  onBodyPointerDown: (e: React.PointerEvent) => void;
  onResizePointerDown: (e: React.PointerEvent) => void;
}

export function ReservationBlock({
  reservation: r,
  pxPerMin,
  dragging,
  highlight,
  conflict,
  conflictInfo,
  staffWarn,
  segStart,
  segEnd,
  segRole,
  segLabel,
  relayPrev,
  relayNext,
  onBodyPointerDown,
  onResizePointerDown,
}: Props) {
  const staff = staffById(r.staffId);
  const isFull = !segRole; // assignment未指定 = 通常(単独担当)ブロック
  const start = segStart ?? r.start;
  const end = segEnd ?? r.end;
  const left = (start - OPEN_MIN) * pxPerMin;
  const width = (end - start) * pxPerMin;
  const intervalPx = isFull ? (r.intervalMin ?? 0) * pxPerMin : 0;

  const sharedClass = cn(
    "group absolute top-1 bottom-1 cursor-grab touch-none select-none overflow-hidden rounded-md border border-l-[3px] px-2 py-1 text-left shadow-sm transition-shadow hover:shadow-md hover:z-20 active:cursor-grabbing",
    dragging && "z-30 shadow-lg ring-2 ring-primary/40",
    highlight && "z-30 shadow-lg ring-2 ring-accent",
    conflict && "z-20 border-rose-400 ring-2 ring-rose-400"
  );

  const resizeHandle = isFull && (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        onResizePointerDown(e);
      }}
      className="absolute right-0 top-0 z-20 h-full w-1.5 cursor-ew-resize bg-transparent group-hover:bg-black/10"
    />
  );

  const intervalBand = intervalPx > 0 && (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center border-l border-dashed border-black/20"
      style={{ width: intervalPx, backgroundColor: "rgba(255,255,255,0.5)", backgroundImage: HATCH_LIGHT }}
    >
      {intervalPx >= 30 && (
        <span className="text-[8px] font-medium text-slate-500" style={{ writingMode: "vertical-rl" }}>準備</span>
      )}
    </div>
  );

  // ===== 予約以外(予約不可枠) =====
  if (r.kind !== "RESERVATION") {
    const Icon = BLOCK_ICON[r.kind];
    return (
      <div
        role="button"
        tabIndex={0}
        title={conflictInfo}
        onPointerDown={onBodyPointerDown}
        onClick={(e) => e.stopPropagation()}
        style={{ left, width, borderLeftColor: staff?.color, backgroundImage: HATCH }}
        className={cn(sharedClass, "border-slate-700 bg-slate-600 text-white")}
      >
        <div className="flex items-center gap-1 text-[11px] font-semibold">
          {conflict ? <AlertTriangle className="h-3 w-3 shrink-0 text-rose-300" /> : <Icon className="h-3 w-3 shrink-0" />}
          <span className="truncate">{blockTitle(r)}</span>
        </div>
        <div className="mt-auto text-[10px] text-white/70">予約不可 ・ {minToLabel(r.start)}</div>
        {resizeHandle}
      </div>
    );
  }

  const customer = customerById(r.customerId ?? "");
  const canceled = r.status === "CANCELED";
  const palette = MENU_COLOR[reservationColor(r)];

  // --- キャンセル ---
  if (canceled) {
    return (
      <div
        role="button"
        tabIndex={0}
        onPointerDown={onBodyPointerDown}
        onClick={(e) => e.stopPropagation()}
        style={{ left, width }}
        className={cn(
          "group absolute top-1 bottom-1 cursor-pointer overflow-hidden rounded-md border border-dashed border-slate-300 bg-slate-100/70 px-2 py-1 text-left opacity-60 transition-shadow hover:opacity-80",
          highlight && "z-30 ring-2 ring-accent"
        )}
      >
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 line-through">
          <span className="truncate">{customer?.name ?? "(顧客未設定)"}</span>
        </div>
        <div className="mt-auto truncate text-[10px] text-slate-400">
          {minToLabel(r.start)} ・ {r.cancelType ? CANCEL_TYPE_LABEL[r.cancelType] : "キャンセル"}
        </div>
      </div>
    );
  }

  // --- サブ/補助 担当セグメント = 「施術リレー」(同一顧客・同一コース色で引き継ぎ表現) ---
  const palette0 = MENU_COLOR[reservationColor(r)];
  if (segRole === "SUB" || segRole === "ASSIST") {
    const c = customer?.name ?? "顧客";
    const isAssist = segRole === "ASSIST";
    return (
      <div
        role="button"
        tabIndex={0}
        title={`${c}：${segLabel ?? ""}（${ROLE_LABEL[segRole]}）${minToLabel(start)}-${minToLabel(end)}・同一予約の引き継ぎ`}
        onPointerDown={onBodyPointerDown}
        onClick={(e) => e.stopPropagation()}
        style={{ left, width, borderLeftColor: staff?.color }}
        className={cn(
          "group absolute top-1 bottom-1 flex cursor-pointer flex-col overflow-hidden border border-l-[3px] px-2 py-1 text-left shadow-sm transition-shadow hover:z-20 hover:shadow-md",
          palette0.tint,
          isAssist && "opacity-90",
          relayPrev ? "rounded-l-none border-l-2 border-dashed border-l-accent" : "rounded-l-md",
          relayNext ? "rounded-r-none" : "rounded-r-md",
          highlight && "z-30 ring-2 ring-accent"
        )}
      >
        {relayPrev && <ChevronRight className="absolute -left-0.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-accent" />}
        <div className={cn("flex items-center gap-1 text-[11px] font-semibold leading-tight text-foreground", relayPrev && "pl-2")}>
          <span className={cn("shrink-0 rounded px-1 py-px text-[8px] font-bold", isAssist ? "bg-slate-200 text-slate-600" : "bg-accent/15 text-accent")}>
            {isAssist ? "補助" : `${segLabel ?? ""}担当`}
          </span>
          <span className="truncate">{c}</span>
        </div>
        <div className={cn("truncate text-[10px] text-accent", relayPrev && "pl-2")}>
          {relayPrev ? `↩ ${c.split(" ")[0]}の施術の続き` : segLabel}
        </div>
        <div className={cn("mt-auto text-[10px] font-medium tabular-nums text-foreground/70", relayPrev && "pl-2")}>
          {minToLabel(start)}-{minToLabel(end)}
        </div>
        {relayNext && <ChevronRight className="absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-accent" />}
      </div>
    );
  }

  // ===== 通常 or 主担当(MAIN)セグメント =====
  const remaining = ticketRemainingTotal(customer);
  const inService = r.status === "ARRIVED" || r.status === "DONE";
  const unpaid = inService && !r.paid;
  const noChart = inService && !r.hasChart;
  const isNew = isNewCustomer(customer);
  const split = r.assignments && r.assignments.length > 1;

  return (
    <div
      role="button"
      tabIndex={0}
      title={conflictInfo}
      onPointerDown={onBodyPointerDown}
      onClick={(e) => e.stopPropagation()}
      style={{ left, width, borderLeftColor: conflict ? undefined : staff?.color, paddingRight: intervalPx > 0 ? intervalPx + 6 : undefined }}
      className={cn(
        sharedClass,
        "flex flex-col border-border",
        palette.tint,
        !conflict && r.status === "ARRIVED" && "ring-1 ring-primary/50",
        !conflict && r.status === "DONE" && "ring-1 ring-emerald-300",
        !conflict && isNew && "ring-2 ring-rose-300",
        !conflict && staffWarn && "border-amber-400 ring-2 ring-amber-400",
        relayNext && "rounded-r-none",
        relayPrev && "rounded-l-none border-l-2 border-dashed border-l-accent"
      )}
    >
      {intervalBand}
      {relayNext && <ChevronRight className="absolute right-0 top-1/2 z-20 h-3.5 w-3.5 -translate-y-1/2 text-accent" />}

      {isNew && (
        <span className="absolute right-0 top-0 z-20 rounded-bl-md bg-rose-500 px-1 py-px text-[8px] font-bold leading-none text-white shadow-sm">NEW</span>
      )}

      <div className="flex items-start gap-1 pr-5 text-[11px] font-semibold leading-tight text-foreground">
        {r.isNominated && <Star className="mt-px h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
        <span className="break-words">{customer?.name ?? "(顧客未設定)"}</span>
      </div>

      <div className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", palette.dot)} aria-hidden />
        <span className="truncate">{segRole === "MAIN" && segLabel ? `${segLabel}担当` : menuNames(r.menuIds)}</span>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1">
        <span className="text-[10px] font-medium tabular-nums text-foreground/70">{minToLabel(start)}</span>
        {split && (
          <span className="rounded bg-secondary px-1 py-px text-[9px] font-medium text-secondary-foreground">分担{r.assignments!.length}名</span>
        )}
        {conflict && (
          <span className="inline-flex items-center gap-0.5 rounded bg-rose-100 px-1 py-px text-[9px] font-bold text-rose-700"><AlertTriangle className="h-2.5 w-2.5" />重複</span>
        )}
        {staffWarn && (
          <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-px text-[9px] font-bold text-amber-700"><AlertTriangle className="h-2.5 w-2.5" />担当不可</span>
        )}
        {r.status === "ARRIVED" && <span className="rounded bg-primary/12 px-1 py-px text-[9px] font-medium text-primary">来店中</span>}
        {r.status === "DONE" && <span className="rounded bg-emerald-100 px-1 py-px text-[9px] font-medium text-emerald-700">完了</span>}
        {customer?.tags.slice(0, 1).map((t) => (
          <span key={t} className="rounded bg-secondary px-1 py-px text-[9px] font-medium text-secondary-foreground">{t}</span>
        ))}
        {remaining > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded bg-accent/12 px-1 py-px text-[9px] font-medium text-accent"><TicketIcon className="h-2.5 w-2.5" />残{remaining}</span>
        )}
        {customer && !customer.lineLinked && (
          <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-px text-[9px] font-medium text-amber-700"><MessageCircleOff className="h-2.5 w-2.5" />LINE未</span>
        )}
        {unpaid && (
          <span className="inline-flex items-center gap-0.5 rounded bg-rose-100 px-1 py-px text-[9px] font-medium text-rose-700"><Wallet className="h-2.5 w-2.5" />未会計</span>
        )}
        {noChart && (
          <span className="inline-flex items-center gap-0.5 rounded border border-border px-1 py-px text-[9px] font-medium text-muted-foreground"><FileWarning className="h-2.5 w-2.5" />未カルテ</span>
        )}
      </div>

      {resizeHandle}
    </div>
  );
}
