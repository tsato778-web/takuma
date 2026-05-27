"use client";

import * as React from "react";
import {
  Star,
  Ticket as TicketIcon,
  MessageCircleOff,
  Wallet,
  FileWarning,
  LogIn,
  Trash2,
  Ban,
  Sparkles,
  RotateCcw,
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
import {
  blockTitle,
  customerById,
  staffById,
  menuNames,
  ticketRemainingTotal,
  isNewCustomer,
  BLOCK_KIND_LABEL,
  CANCEL_TYPE_LABEL,
  type CancelType,
  type Reservation,
} from "@/lib/mock-data";

const STATUS_LABEL: Record<Reservation["status"], string> = {
  CONFIRMED: "確定",
  ARRIVED: "来店中",
  DONE: "施術完了",
  NO_SHOW: "無断キャンセル",
  CANCELED: "キャンセル",
};

const CANCEL_TYPES: CancelType[] = ["ADVANCE", "SAME_DAY", "NO_SHOW"];

interface Props {
  reservation: Reservation | null;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, patch: Partial<Reservation>) => void;
  onDelete: (id: string) => void;
}

export function ReservationDetailDialog({ reservation: r, onOpenChange, onUpdate, onDelete }: Props) {
  const isReservation = r?.kind === "RESERVATION";
  const customer = r && isReservation ? customerById(r.customerId ?? "") : undefined;
  const staff = r ? staffById(r.staffId) : undefined;
  const inService = r?.status === "ARRIVED" || r?.status === "DONE";
  const canceled = r?.status === "CANCELED";
  const isNew = isNewCustomer(customer);

  return (
    <Dialog open={!!r} onOpenChange={onOpenChange}>
      <DialogContent>
        {r && !isReservation && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-slate-500" />
                {blockTitle(r)}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  予約不可枠
                </span>
              </DialogTitle>
              <DialogDescription>
                {minToLabel(r.start)} 〜 {minToLabel(r.end)}　担当 {staff?.name}（種別：
                {r.kind === "RESERVATION" ? "" : BLOCK_KIND_LABEL[r.kind]}）
              </DialogDescription>
            </DialogHeader>
            <p className="text-[11px] text-muted-foreground">
              台帳上でドラッグ移動・端のドラッグで時間変更ができます。
            </p>
            <div className="pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(r.id)}
              >
                <Trash2 className="h-4 w-4" /> この枠を削除
              </Button>
            </div>
          </>
        )}

        {r && isReservation && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {r.isNominated && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                <span className={cn(canceled && "text-muted-foreground line-through")}>
                  {customer?.name ?? "(顧客未設定)"}
                </span>
                {isNew && !canceled && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">
                    <Sparkles className="h-3 w-3" /> NEW
                  </span>
                )}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    canceled
                      ? "bg-slate-100 text-slate-500"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {canceled && r.cancelType ? CANCEL_TYPE_LABEL[r.cancelType] : STATUS_LABEL[r.status]}
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
            </div>

            {canceled ? (
              <div className="space-y-2 rounded-md border border-border bg-slate-50 p-3">
                <p className="text-xs text-muted-foreground">
                  {r.cancelType ? CANCEL_TYPE_LABEL[r.cancelType] : "キャンセル"}{" "}
                  として記録済み。台帳には履歴として残り、顧客予約画面では空き枠として再解放されます。
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdate(r.id, { status: "CONFIRMED", cancelType: undefined })}
                >
                  <RotateCcw className="h-4 w-4" /> 予約に戻す
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {/* 受付高速化: 会計だけで「来店済→会計済」を一括処理 */}
                <Button
                  className="w-full"
                  disabled={r.paid}
                  onClick={() => onUpdate(r.id, { status: "DONE", paid: true })}
                >
                  <Wallet className="h-4 w-4" />
                  {r.paid ? "会計済み" : "会計する（自動で来店済に）"}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={r.status !== "CONFIRMED"}
                    onClick={() => onUpdate(r.id, { status: "ARRIVED" })}
                  >
                    <LogIn className="h-4 w-4" /> 来店のみ
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={r.hasChart}
                    onClick={() => onUpdate(r.id, { hasChart: true })}
                  >
                    <FileWarning className="h-4 w-4" /> カルテ記入
                  </Button>
                </div>

                {/* キャンセル登録 (履歴保持・KPI用に種別を保存) */}
                <div className="rounded-md border border-border p-2">
                  <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                    キャンセル登録（履歴として残ります）
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {CANCEL_TYPES.map((ct) => (
                      <Button
                        key={ct}
                        variant="outline"
                        size="sm"
                        className="px-1 text-[11px]"
                        onClick={() => onUpdate(r.id, { status: "CANCELED", cancelType: ct })}
                      >
                        {CANCEL_TYPE_LABEL[ct].replace("キャンセル", "")}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-muted-foreground">
                {inService ? "" : "※ 会計・カルテはステータス更新のみ（ロジックは後続）"}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(r.id)}
              >
                <Trash2 className="h-4 w-4" /> 完全削除
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
