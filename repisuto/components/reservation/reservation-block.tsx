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
  serviceEndOf,
  MENU_COLOR,
  CANCEL_TYPE_LABEL,
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
  onBodyPointerDown,
  onResizePointerDown,
}: Props) {
  const staff = staffById(r.staffId);
  const left = (r.start - OPEN_MIN) * pxPerMin;
  const width = (r.end - r.start) * pxPerMin;
  const intervalPx = (r.intervalMin ?? 0) * pxPerMin;

  const sharedClass = cn(
    "group absolute top-1 bottom-1 cursor-grab touch-none select-none overflow-hidden rounded-md border border-l-[3px] px-2 py-1 text-left shadow-sm transition-shadow hover:shadow-md hover:z-20 active:cursor-grabbing",
    dragging && "z-30 shadow-lg ring-2 ring-primary/40",
    highlight && "z-30 shadow-lg ring-2 ring-accent",
    conflict && "z-20 border-rose-400 ring-2 ring-rose-400"
  );

  const resizeHandle = (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        onResizePointerDown(e);
      }}
      className="absolute right-0 top-0 z-20 h-full w-1.5 cursor-ew-resize bg-transparent group-hover:bg-black/10"
    />
  );

  // インターバル(準備時間)の帯。施術本体と見た目を分ける
  const intervalBand = intervalPx > 0 && (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center border-l border-dashed border-black/20"
      style={{ width: intervalPx, backgroundColor: "rgba(255,255,255,0.5)", backgroundImage: HATCH_LIGHT }}
    >
      {intervalPx >= 30 && (
        <span className="text-[8px] font-medium text-slate-500" style={{ writingMode: "vertical-rl" }}>
          準備
        </span>
      )}
    </div>
  );

  // ===== 予約以外(予約不可枠) = ダークアウト表示 =====
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

  // ===== 予約 =====
  const customer = customerById(r.customerId ?? "");
  const remaining = ticketRemainingTotal(customer);
  const inService = r.status === "ARRIVED" || r.status === "DONE";
  const unpaid = inService && !r.paid;
  const noChart = inService && !r.hasChart;
  const isNew = isNewCustomer(customer);
  const canceled = r.status === "CANCELED";
  const palette = MENU_COLOR[reservationColor(r)];

  // --- キャンセル: 履歴として残す(半透明・グレー・取り消し線) ---
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
        !conflict && staffWarn && "border-amber-400 ring-2 ring-amber-400"
      )}
    >
      {intervalBand}

      {isNew && (
        <span className="absolute right-0 top-0 z-20 rounded-bl-md bg-rose-500 px-1 py-px text-[8px] font-bold leading-none text-white shadow-sm">
          NEW
        </span>
      )}

      {/* 上段: 顧客名 (全文表示・最優先) */}
      <div className="flex items-start gap-1 pr-5 text-[11px] font-semibold leading-tight text-foreground">
        {r.isNominated && <Star className="mt-px h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
        <span className="break-words">{customer?.name ?? "(顧客未設定)"}</span>
      </div>

      {/* 中段: コース名 (必要なら省略) */}
      <div className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", palette.dot)} aria-hidden />
        <span className="truncate">{menuNames(r.menuIds)}</span>
      </div>

      {/* 下段: 開始時間・タグ */}
      <div className="mt-auto flex flex-wrap items-center gap-1">
        <span className="text-[10px] font-medium tabular-nums text-foreground/70">
          {minToLabel(r.start)}
        </span>
        {conflict && (
          <span className="inline-flex items-center gap-0.5 rounded bg-rose-100 px-1 py-px text-[9px] font-bold text-rose-700">
            <AlertTriangle className="h-2.5 w-2.5" />
            重複
          </span>
        )}
        {staffWarn && (
          <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-px text-[9px] font-bold text-amber-700">
            <AlertTriangle className="h-2.5 w-2.5" />
            担当不可
          </span>
        )}
        {r.status === "ARRIVED" && (
          <span className="rounded bg-primary/12 px-1 py-px text-[9px] font-medium text-primary">
            来店中
          </span>
        )}
        {r.status === "DONE" && (
          <span className="rounded bg-emerald-100 px-1 py-px text-[9px] font-medium text-emerald-700">
            完了
          </span>
        )}
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
