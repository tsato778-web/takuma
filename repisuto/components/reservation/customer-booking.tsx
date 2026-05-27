"use client";

import * as React from "react";
import { Sparkles, Check, CalendarCheck, ChevronRight, MessageCircle, RotateCcw, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { PageShell, MockBadge, Chip } from "@/components/admin/page-shell";
import { Button } from "@/components/ui/button";
import { OPEN_MIN, CLOSE_MIN, minToLabel, addDays } from "@/lib/time";
import {
  STAFF,
  MENUS,
  STORE,
  SEED_RESERVATIONS,
  dateKey,
  menuById,
  staffById,
  staffHandlesMenu,
  suggestedInterval,
  type Staff,
} from "@/lib/mock-data";
import {
  workWindowFor,
  staffFreeForSlot,
  isDateWithinOpening,
  CURRENT_OPENING_RULE,
  OPENING_OPTIONS,
} from "@/lib/shifts";
import { jpDate } from "@/lib/customer-data";

const SLOT = 30; // ◯×グリッドの粒度（分）
const STRIP_DAYS = 21; // 日付帯の表示日数
const WD = ["日", "月", "火", "水", "木", "金", "土"];

interface Confirmed {
  menuIds: string[];
  staffId: string; // 確定した主担当（おまかせは当日割当）
  nominated: boolean;
  date: Date;
  start: number;
  end: number;
}

export function CustomerBooking() {
  const today = React.useMemo(() => new Date(), []);
  const [menuIds, setMenuIds] = React.useState<string[]>([]);
  const [staffSel, setStaffSel] = React.useState<string>("any"); // "any" or staffId
  const [date, setDate] = React.useState<Date>(today);
  const [pickedStart, setPickedStart] = React.useState<number | null>(null);
  const [confirmed, setConfirmed] = React.useState<Confirmed | null>(null);

  // 選択メニューに全対応できる在籍スタッフ（おまかせ時の空き判定に使用）
  const capableStaff = React.useMemo(
    () => STAFF.filter((s) => s.active && menuIds.every((m) => staffHandlesMenu(s.id, m))),
    [menuIds]
  );
  // 指名できるスタッフ（指名可フラグ）。お客様には主担当のみ表示＝サブ/補助は出さない。
  const nominatableStaff = React.useMemo(
    () => capableStaff.filter((s) => s.acceptsNomination),
    [capableStaff]
  );

  const serviceMin = React.useMemo(
    () => menuIds.reduce((s, id) => s + (menuById(id)?.durationMin ?? 0), 0),
    [menuIds]
  );
  const occupancy = serviceMin + suggestedInterval(menuIds);
  const totalPrice = menuIds.reduce((s, id) => s + (menuById(id)?.price ?? 0), 0);

  const dayReservations = React.useMemo(
    () => SEED_RESERVATIONS.filter((r) => r.dateKey === dateKey(date)),
    [date]
  );

  // 指名スタッフが選択メニューに対応できなくなったら「おまかせ」へ戻す
  React.useEffect(() => {
    if (staffSel !== "any" && !nominatableStaff.some((s) => s.id === staffSel)) {
      setStaffSel("any");
    }
  }, [staffSel, nominatableStaff]);

  function resetPick() {
    setPickedStart(null);
  }
  function toggleMenu(id: string) {
    setMenuIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    resetPick();
  }

  // ある開始時刻にこの予約が入るか（◯×）。おまかせは対応スタッフの誰かが空いていれば◯。
  function staffFreeAt(staffId: string, start: number, end: number): boolean {
    return staffFreeForSlot(staffId, date, start, end, dayReservations);
  }
  function slotOpen(start: number): boolean {
    const end = start + occupancy;
    if (end > CLOSE_MIN) return false;
    if (staffSel === "any") return capableStaff.some((s) => staffFreeAt(s.id, start, end));
    return staffFreeAt(staffSel, start, end);
  }
  // おまかせ確定時に実際に割り当てる主担当（最初に空いている対応スタッフ）
  function resolveStaff(start: number, end: number): Staff | undefined {
    if (staffSel !== "any") return staffById(staffSel);
    return capableStaff.find((s) => staffFreeAt(s.id, start, end));
  }

  const timeSlots = React.useMemo(() => {
    if (menuIds.length === 0 || occupancy <= 0) return [];
    const out: { start: number; open: boolean }[] = [];
    for (let t = OPEN_MIN; t + occupancy <= CLOSE_MIN; t += SLOT) {
      out.push({ start: t, open: slotOpen(t) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuIds, occupancy, staffSel, date, dayReservations]);

  const openCount = timeSlots.filter((s) => s.open).length;

  // 日付帯（開放設定＋対応スタッフの出勤を加味して受付可否を判定）
  const dateStrip = React.useMemo(() => {
    return Array.from({ length: STRIP_DAYS }, (_, i) => {
      const d = addDays(today, i);
      const within = isDateWithinOpening(d, CURRENT_OPENING_RULE, today);
      const hasStaff =
        menuIds.length === 0
          ? STAFF.some((s) => s.active && workWindowFor(s.id, d))
          : capableStaff.some((s) => workWindowFor(s.id, d));
      return { d, accept: within && hasStaff };
    });
  }, [today, menuIds, capableStaff]);

  function confirmBooking() {
    if (pickedStart === null) return;
    const end = pickedStart + occupancy;
    const staff = resolveStaff(pickedStart, end);
    if (!staff) return;
    setConfirmed({
      menuIds: [...menuIds],
      staffId: staff.id,
      nominated: staffSel !== "any",
      date,
      start: pickedStart,
      end,
    });
    setPickedStart(null);
  }

  function startOver() {
    setConfirmed(null);
    setMenuIds([]);
    setStaffSel("any");
    setDate(today);
    setPickedStart(null);
  }

  const openingLabel = OPENING_OPTIONS.find((o) => o.id === CURRENT_OPENING_RULE)?.label ?? "";

  return (
    <PageShell
      title="お客様予約画面（◯×・プレビュー）"
      description="お客様がLINE（ミニアプリ／LIFF）から予約する画面。空き枠を◯×で表示し、ワンタップで予約完了まで導きます。"
      action={<MockBadge />}
    >
      {/* 管理者向けコンテキスト（お客様には非表示） */}
      <div className="mx-auto mb-3 flex max-w-sm flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <Chip tone="muted">予約開放：{openingLabel}</Chip>
        <Chip tone="muted">営業 {minToLabel(OPEN_MIN)}–{minToLabel(CLOSE_MIN)}</Chip>
        <span className="inline-flex items-center gap-1">
          <Info className="h-3 w-3" />出勤表・既存予約・スタッフ対応メニューと連動
        </span>
      </div>

      {/* スマホ枠プレビュー */}
      <div className="mx-auto max-w-sm overflow-hidden rounded-[28px] border-8 border-slate-800 bg-background shadow-xl">
        {/* ヘッダー */}
        <div className="bg-gradient-to-br from-primary to-accent p-4 text-primary-foreground">
          <div className="flex items-center gap-2 text-[11px] opacity-90">
            <Sparkles className="h-3.5 w-3.5" />リピスト ビューティー {STORE.name}
          </div>
          <div className="mt-1 text-base font-semibold">かんたんWEB予約</div>
          <div className="text-[11px] opacity-90">空いている枠（◯）をタップするだけ・LINEで予約完了</div>
        </div>

        {confirmed ? (
          <BookingDone confirmed={confirmed} onStartOver={startOver} />
        ) : (
          <div className="space-y-4 p-4">
            {/* 1. メニュー */}
            <Section step={1} title="メニューを選ぶ" hint="複数選択できます">
              <div className="flex flex-wrap gap-1.5">
                {MENUS.map((m) => {
                  const on = menuIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMenu(m.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        on
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      {m.name}
                      <span className="ml-1 text-[10px] opacity-70">{m.durationMin}分 / ¥{m.price.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* 2. 担当 */}
            <Section step={2} title="担当を選ぶ" hint="指名なしなら最短で空いている枠をご案内">
              <div className="flex flex-wrap gap-1.5">
                <StaffChip
                  active={staffSel === "any"}
                  color="#94a3b8"
                  label="指名なし（おまかせ）"
                  onClick={() => {
                    setStaffSel("any");
                    resetPick();
                  }}
                />
                {nominatableStaff.map((s) => (
                  <StaffChip
                    key={s.id}
                    active={staffSel === s.id}
                    color={s.color}
                    label={s.name.split(" ")[0]}
                    onClick={() => {
                      setStaffSel(s.id);
                      resetPick();
                    }}
                  />
                ))}
              </div>
              {menuIds.length > 0 && nominatableStaff.length === 0 && (
                <p className="mt-1 text-[10px] text-amber-600">このメニューは指名予約を受け付けていません。おまかせでご予約ください。</p>
              )}
            </Section>

            {/* 3. 日付 */}
            <Section step={3} title="日付を選ぶ">
              <div className="thin-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {dateStrip.map(({ d, accept }) => {
                  const sel = dateKey(d) === dateKey(date);
                  return (
                    <button
                      key={dateKey(d)}
                      type="button"
                      disabled={!accept}
                      onClick={() => {
                        setDate(d);
                        resetPick();
                      }}
                      className={cn(
                        "flex w-12 shrink-0 flex-col items-center rounded-lg border py-1.5 text-center transition-colors",
                        sel
                          ? "border-primary bg-primary text-primary-foreground"
                          : accept
                          ? "border-border bg-card hover:bg-secondary"
                          : "cursor-not-allowed border-dashed border-border bg-secondary/30 text-muted-foreground/40"
                      )}
                    >
                      <span
                        className={cn(
                          "text-[10px]",
                          sel ? "opacity-90" : d.getDay() === 0 ? "text-rose-500" : d.getDay() === 6 ? "text-sky-500" : "text-muted-foreground"
                        )}
                      >
                        {WD[d.getDay()]}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{d.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* 4. 時間（◯×） */}
            <Section
              step={4}
              title="時間を選ぶ"
              hint={menuIds.length === 0 ? undefined : `${jpDate(dateKey(date))}・所要約${serviceMin}分`}
            >
              {menuIds.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-secondary/20 px-3 py-4 text-center text-xs text-muted-foreground">
                  まずメニューを選択してください
                </p>
              ) : (
                <>
                  <div className="mb-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Mark open />空き</span>
                    <span className="inline-flex items-center gap-1"><Mark />満席・受付不可</span>
                    <span className="ml-auto">空き {openCount} 枠</span>
                  </div>
                  {timeSlots.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">この所要時間で入る枠がありません</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5">
                      {timeSlots.map(({ start, open }) => {
                        const sel = pickedStart === start;
                        return (
                          <button
                            key={start}
                            type="button"
                            disabled={!open}
                            onClick={() => setPickedStart(start)}
                            className={cn(
                              "flex flex-col items-center rounded-lg border py-1.5 transition-colors",
                              sel
                                ? "border-primary bg-primary/10 ring-2 ring-primary"
                                : open
                                ? "border-border bg-card hover:bg-secondary"
                                : "cursor-not-allowed border-dashed border-border bg-secondary/20"
                            )}
                          >
                            <span className={cn("text-[11px] font-medium tabular-nums", open ? "text-foreground" : "text-muted-foreground/50")}>
                              {minToLabel(start)}
                            </span>
                            <Mark open={open} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </Section>

            {/* 確認カード */}
            {pickedStart !== null && (
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
                <div className="text-xs font-semibold text-foreground">この内容で予約します</div>
                <dl className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                  <Row label="メニュー" value={menuIds.map((id) => menuById(id)?.name).filter(Boolean).join(" + ")} />
                  <Row label="担当" value={staffSel === "any" ? "指名なし（おまかせ）" : `${staffById(staffSel)?.name}（指名）`} />
                  <Row label="日時" value={`${jpDate(dateKey(date))} ${minToLabel(pickedStart)}〜${minToLabel(pickedStart + occupancy)}`} />
                  <Row label="料金" value={`¥${totalPrice.toLocaleString()}`} />
                </dl>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={resetPick}>
                    戻る
                  </Button>
                  <Button size="sm" className="flex-1" onClick={confirmBooking}>
                    予約を確定する
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 補足（モック／思想の明示） */}
      <div className="mx-auto mt-3 max-w-sm space-y-1 text-[11px] text-muted-foreground">
        <p>※ モックUIです。確定すると本実装では予約台帳に<b>主担当の担当ブロック</b>として登録され、LINEで予約確認・前日リマインドが自動送信されます（連携ポイント）。</p>
        <p>※ ◯×は<b>営業時間 × 出勤表 × 予約開放設定 × 既存予約の重複（担当ブロック単位）× スタッフ対応メニュー</b>を合成して判定。キャンセル枠は空きとして再解放されます。お客様には<b>主担当のみ</b>表示し、サブ/補助の分担は見せません。</p>
      </div>
    </PageShell>
  );
}

function Section({ step, title, hint, children }: { step: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-1.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{step}</span>
        <span className="text-xs font-semibold text-foreground">{title}</span>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function StaffChip({ active, color, label, onClick }: { active: boolean; color: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors",
        active ? "border-foreground/30 bg-secondary text-foreground" : "border-border bg-card text-muted-foreground hover:bg-secondary"
      )}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </button>
  );
}

// ◯×マーク（視認性のため大きめ・色分け）
function Mark({ open = false }: { open?: boolean }) {
  return open ? (
    <span className="text-base font-bold leading-none text-emerald-500">◯</span>
  ) : (
    <span className="text-base font-bold leading-none text-muted-foreground/40">×</span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="shrink-0">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function BookingDone({ confirmed, onStartOver }: { confirmed: Confirmed; onStartOver: () => void }) {
  const staff = staffById(confirmed.staffId);
  const menus = confirmed.menuIds.map((id) => menuById(id)?.name).filter(Boolean).join(" + ");
  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-col items-center py-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="h-6 w-6" />
        </div>
        <div className="mt-2 text-sm font-semibold">ご予約ありがとうございます</div>
        <div className="text-[11px] text-muted-foreground">確認メッセージをLINEにお送りしました</div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold tabular-nums">
            {jpDate(dateKey(confirmed.date))} {minToLabel(confirmed.start)}〜{minToLabel(confirmed.end)}
          </div>
        </div>
        <dl className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
          <Row label="メニュー" value={menus} />
          <Row label="担当" value={confirmed.nominated ? `${staff?.name}（指名）` : `${staff?.name ?? "おまかせ"}（おまかせ）`} />
        </dl>
      </div>

      {/* 次アクション（再来導線・LINE中心） */}
      <div className="grid grid-cols-2 gap-2">
        <NextAction icon={MessageCircle} label="LINEで確認" />
        <NextAction icon={CalendarCheck} label="カレンダー追加" />
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={onStartOver}>
        <RotateCcw className="h-3.5 w-3.5" />別の予約をする
      </Button>
      <p className="text-center text-[10px] text-muted-foreground">前日に「お店の思い」メッセージが届きます（来店期待感の演出・モック）</p>
    </div>
  );
}

function NextAction({ icon: Icon, label }: { icon: typeof MessageCircle; label: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 rounded-xl border border-accent/30 bg-accent/5 py-2 text-[11px] font-semibold text-accent">
      <Icon className="h-3.5 w-3.5" />
      {label}
      <ChevronRight className="h-3 w-3 opacity-60" />
    </div>
  );
}
