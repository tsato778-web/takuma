"use client";

import * as React from "react";
import { Clock, AlertTriangle } from "lucide-react";

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
  INTERVAL_OPTIONS,
  menuById,
  staffById,
  staffHandlesMenu,
  blockTitle,
  suggestedInterval,
  findConflicts,
  type BlockKind,
  type Reservation,
} from "@/lib/mock-data";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill: { staffId: string; start: number } | null;
  dateKey: string;
  daySlots: Reservation[]; // 当日・全スタッフの枠 (重複チェック用)
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

export function NewReservationDialog({
  open,
  onOpenChange,
  prefill,
  dateKey,
  daySlots,
  onCreate,
}: Props) {
  const [kind, setKind] = React.useState<BlockKind>("RESERVATION");
  const [customerId, setCustomerId] = React.useState<string | null>(null);
  const [menuIds, setMenuIds] = React.useState<string[]>([]);
  const [staffId, setStaffId] = React.useState<string>(STAFF[0].id);
  const [start, setStart] = React.useState<number>(OPEN_MIN);
  const [nominated, setNominated] = React.useState(false);
  const [blockDuration, setBlockDuration] = React.useState(60);
  const [label, setLabel] = React.useState("");
  const [intervalMin, setIntervalMin] = React.useState(0);
  const [pending, setPending] = React.useState<{ r: Reservation; conflicts: Reservation[] } | null>(
    null
  );

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
      setIntervalMin(0);
      setPending(null);
    }
  }, [open, prefill]);

  // メニュー変更時にインターバルを推定値へ追従
  React.useEffect(() => {
    setIntervalMin(suggestedInterval(menuIds));
  }, [menuIds]);

  const isReservation = kind === "RESERVATION";
  const serviceDuration = isReservation ? menuIds.reduce((s, id) => s + (menuById(id)?.durationMin ?? 0), 0) || 30 : blockDuration;
  const effInterval = isReservation ? intervalMin : 0;
  const occupancy = serviceDuration + effInterval;
  const end = Math.min(start + occupancy, CLOSE_MIN);
  const totalPrice = menuIds.reduce((s, id) => s + (menuById(id)?.price ?? 0), 0);
  const canSave = isReservation ? !!customerId && menuIds.length > 0 : true;

  function toggleMenu(id: string) {
    setMenuIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function buildReservation(): Reservation {
    return {
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
      intervalMin: effInterval,
      status: "CONFIRMED",
      source: "MANUAL",
      isNominated: isReservation ? nominated : false,
      paid: false,
      hasChart: false,
    };
  }

  function commit(r: Reservation) {
    onCreate(r);
    onOpenChange(false);
  }

  function handleSave() {
    if (!canSave) return;
    const r = buildReservation();
    const conflicts = findConflicts(r, daySlots);
    if (conflicts.length > 0) {
      setPending({ r, conflicts }); // 重複あり → 警告モーダル
      return;
    }
    commit(r);
  }

  return (
    <>
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
                      const disabled = !staffHandlesMenu(staffId, m.id);
                      return (
                        <button
                          type="button"
                          key={m.id}
                          disabled={disabled}
                          title={disabled ? `${staffById(staffId)?.name.split(" ")[0]}は対応不可` : undefined}
                          onClick={() => toggleMenu(m.id)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs transition-colors",
                            disabled
                              ? "cursor-not-allowed border-dashed border-border bg-secondary/30 text-muted-foreground/50 line-through"
                              : on
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
                  <p className="text-[10px] text-muted-foreground">担当が対応できないメニューは選択できません。</p>
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
                      onClick={() => {
                        setStaffId(s.id);
                        setMenuIds((prev) => prev.filter((id) => staffHandlesMenu(s.id, id)));
                      }}
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

                {isReservation && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">インターバル</span>
                    <select
                      value={intervalMin}
                      onChange={(e) => setIntervalMin(Number(e.target.value))}
                      className="h-8 flex-1 rounded-md border border-input bg-card px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {INTERVAL_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d === 0 ? "なし" : `${d}分`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                  {minToLabel(start)} 〜 {minToLabel(end)}
                  {isReservation && effInterval > 0 ? (
                    <span className="ml-1">
                      （施術{serviceDuration}分 + 準備{effInterval}分 = 占有{occupancy}分）
                    </span>
                  ) : (
                    <span className="ml-1">（{occupancy}分）</span>
                  )}
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

      {/* 二重予約の警告モーダル (スタッフ確認のうえ作成可) */}
      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              予約が重複しています
            </DialogTitle>
            <DialogDescription>
              この時間は既存予約と重複しています。内容を確認のうえ作成してください。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {pending?.conflicts.map((c) => (
              <div
                key={c.id}
                className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm"
              >
                <div className="font-medium text-rose-800">{blockTitle(c)}</div>
                <div className="text-xs text-rose-600">
                  {minToLabel(c.start)} 〜 {minToLabel(c.end)} ／ 担当 {staffById(c.staffId)?.name}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              キャンセル
            </Button>
            <Button
              className="bg-rose-600 text-white hover:bg-rose-600/90"
              onClick={() => {
                if (pending) commit(pending.r);
                setPending(null);
              }}
            >
              それでも作成する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
