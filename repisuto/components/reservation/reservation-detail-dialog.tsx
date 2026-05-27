"use client";

import * as React from "react";
import {
  Star,
  Ticket as TicketIcon,
  MessageCircleOff,
  Wallet,
  FileWarning,
  LogIn,
  Check,
  Trash2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { minToLabel } from "@/lib/time";
import {
  customerById,
  staffById,
  menuNames,
  ticketRemainingTotal,
  type Reservation,
} from "@/lib/mock-data";

const STATUS_LABEL: Record<Reservation["status"], string> = {
  CONFIRMED: "確定",
  ARRIVED: "来店中",
  DONE: "施術完了",
  NO_SHOW: "無断キャンセル",
  CANCELED: "キャンセル",
};

interface Props {
  reservation: Reservation | null;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, patch: Partial<Reservation>) => void;
  onDelete: (id: string) => void;
}

export function ReservationDetailDialog({ reservation: r, onOpenChange, onUpdate, onDelete }: Props) {
  const customer = r ? customerById(r.customerId) : undefined;
  const staff = r ? staffById(r.staffId) : undefined;
  const inService = r?.status === "ARRIVED" || r?.status === "DONE";

  return (
    <Dialog open={!!r} onOpenChange={onOpenChange}>
      <DialogContent>
        {r && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {r.isNominated && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                {customer?.name ?? "(顧客未設定)"}
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                  {STATUS_LABEL[r.status]}
                </span>
              </DialogTitle>
              <DialogDescription>
                {minToLabel(r.start)} 〜 {minToLabel(r.end)}　担当 {staff?.name} ／ {menuNames(r.menuIds)}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-1.5">
              {customer?.tags.map((t) => (
                <span
                  key={t}
                  className="rounded bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
                >
                  {t}
                </span>
              ))}
              {customer && ticketRemainingTotal(customer) > 0 && (
                <span className="inline-flex items-center gap-1 rounded bg-accent/12 px-2 py-0.5 text-[11px] text-accent">
                  <TicketIcon className="h-3 w-3" />
                  回数券残 {ticketRemainingTotal(customer)}
                </span>
              )}
              {customer && !customer.lineLinked && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">
                  <MessageCircleOff className="h-3 w-3" />
                  LINE未追加
                </span>
              )}
              {inService && !r.paid && (
                <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[11px] text-rose-700">
                  <Wallet className="h-3 w-3" />
                  未会計
                </span>
              )}
              {inService && !r.hasChart && (
                <span className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  <FileWarning className="h-3 w-3" />
                  未カルテ
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={r.status !== "CONFIRMED"}
                onClick={() => onUpdate(r.id, { status: "ARRIVED" })}
              >
                <LogIn className="h-4 w-4" /> 来店
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!inService || r.hasChart}
                onClick={() => onUpdate(r.id, { hasChart: true })}
              >
                <FileWarning className="h-4 w-4" /> カルテ記入
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!inService || r.paid}
                onClick={() => onUpdate(r.id, { status: "DONE", paid: true })}
              >
                <Wallet className="h-4 w-4" /> 会計
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(r.id)}
              >
                <Trash2 className="h-4 w-4" /> 予約を削除
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              ※ 会計・カルテは MVP ではステータスのみ更新します（ロジックは後続フェーズ）。
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
