"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomerCombobox } from "./customer-combobox";
import { OPEN_MIN, CLOSE_MIN, minToLabel } from "@/lib/time";
import {
  MENUS,
  STAFF,
  STORE,
  menuById,
  type BlockKind,
  type Reservation,
} from "@/lib/mock-data";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill: { staffId: string; start: number } | null;
  dateKey: string;
  onCreate: (r: Reservation) => void;
}

const KIND_TABS: { kind: BlockKind; label: string }[] = [
  { kind: "RESERVATION", label: "予約" },
  { kind: "BREAK", label: "休憩" },
  { kind: "MEETING", label: "ミーティング" },
  { kind: "BLOCK", label: "ブロック" },
  { kind: "OTHER", label: "その他" },
];

const TIME_OPTIONS = (() => {
  const arr: number[] = [];
  for (let m = OPEN_MIN; m < CLOSE_MIN; m += 15) arr.push(m);
  return arr;
})();

const DURATION_OPTIONS = [30, 60, 90, 120];

export function NewReservationDialog({ open, onOpenChange, prefill, dateKey, onCreate }: Props) {
  const [kind, setKind] = React.useState<BlockKind>("RESERVATION");
  const [customerId, setCustomerId] = React.useState<string | null>(null);
  const [menuIds, setMenuIds] = React.useState<string[]>([]);
  const [staffId, setStaffId] = React.useState<string>(STAFF[0].id);
  const [start, setStart] = React.useState<number>(OPEN_MIN);
  const [nominated, setNominated] = React.useState(false);
  const [blockDuration, setBlockDuration] = React.useState(60);
  const [label, setLabel] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setKind("RESERVATION");
      setCustomerId(null);
      setMenuIds([]);
      setStaffId(prefill?.staffId ?? STAFF[0].id);
      setStart(prefill?.start ?? OPEN_MIN);
      setNominated(false);
      setBlockDuration(60);
      setLabel("");
    }
  }, [open, prefill]);

  const isReservation = kind === "RESERVATION";
  const menuDuration = menuIds.reduce((s, id) => s + (menuById(id)?.durationMin ?? 0), 0);
  const duration = isReservation ? menuDuration || 30 : blockDuration;
  const end = Math.min(start + duration, CLOSE_MIN);
  const totalPrice = menuIds.reduce((s, id) => s + (menuById(id)?.price ?? 0), 0);
  const canSave = isReservation ? !!customerId && menuIds.length > 0 : true;

  function toggleMenu(id: string) {
    setMenuIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSave() {
    if (!canSave) return;
    onCreate({
      id: `s${Date.now()}`,
      storeId: STORE.id,
      dateKey,
      kind,
      customerId: isReservation ? customerId ?? undefined : undefined,
      staffId,
      menuIds: isReservation ? menuIds : [],
      label: kind === "OTHER" ? label.trim() || undefined : undefined,
      start,
      end,
      status: "CONFIRMED",
      source: "MANUAL",
      isNominated: isReservation ? nominated : false,
      paid: false,
      hasChart: false,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isReservation ? "新規予約" : "予約不可枠を登録"}</DialogTitle>
          <DialogDescription>
            {STORE.name}・{dateKey}
            {isReservation
              ? "顧客を検索してメニューと担当を選択します"
              : "休憩・ミーティング等でスタッフの枠を押さえます（顧客不要）"}
          </DialogDescription>
        </DialogHeader>

        {/* 種別タブ */}
        <div className="flex overflow-hidden rounded-lg border border-border">
          {KIND_TABS.map((t) => (
            <button
              key={t.kind}
              type="button"
              onClick={() => setKind(t.kind)}
              className={cn(
                "flex-1 px-2 py-1.5 text-xs font-medium transition-colors",
                kind === t.kind
                  ? t.kind === "RESERVATION"
                    ? "bg-primary text-primary-foreground"
                    : "bg-slate-600 text-white"
                  : "bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {isReservation && (
            <>
              <div className="space-y-1.5">
                <Label>顧客</Label>
                <CustomerCombobox value={customerId} onChange={setCustomerId} />
              </div>

              <div className="space-y-1.5">
                <Label>メニュー（複数選択可）</Label>
                <div className="flex flex-wrap gap-1.5">
                  {MENUS.map((m) => {
                    const on = menuIds.includes(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleMenu(m.id)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition-colors",
                          on
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        {m.name}
                        <span className="ml-1 text-[10px] opacity-70">{m.durationMin}分</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {kind === "OTHER" && (
            <div className="space-y-1.5">
              <Label>ラベル（台帳に表示）</Label>
              <Input
                placeholder="例：私用 / 電話対応 / 研修"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>担当スタッフ</Label>
              <div className="flex flex-wrap gap-1.5">
                {STAFF.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setStaffId(s.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                      staffId === s.id
                        ? "border-foreground/30 bg-secondary text-foreground"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.name.split(" ")[0]}
                  </button>
                ))}
              </div>
              {isReservation && (
                <label className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={nominated}
                    onChange={(e) => setNominated(e.target.checked)}
                    className="h-3.5 w-3.5 accent-amber-500"
                  />
                  指名予約
                </label>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>開始時間</Label>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={start}
                  onChange={(e) => setStart(Number(e.target.value))}
                  className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TIME_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {minToLabel(m)}
                    </option>
                  ))}
                </select>
              </div>

              {!isReservation && (
                <select
                  value={blockDuration}
                  onChange={(e) => setBlockDuration(Number(e.target.value))}
                  className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}分
                    </option>
                  ))}
                </select>
              )}

              <div className="rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                {minToLabel(start)} 〜 {minToLabel(end)}（{duration}分）
                {isReservation && totalPrice > 0 && (
                  <span className="ml-2 font-medium text-foreground">
                    ¥{totalPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isReservation ? "予約を作成" : "枠を登録"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
