"use client";

import * as React from "react";
import {
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  CalendarCheck,
  ClipboardList,
  RotateCcw,
  Info,
  Lock,
  Crown,
  UserCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { PageShell, MockBadge, Chip } from "@/components/admin/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "./date-picker";
import { AvailabilityGrid, type GridSelection } from "./availability-grid";
import { minToLabel, addDays } from "@/lib/time";
import {
  MENUS,
  STORE,
  SEED_RESERVATIONS,
  menuById,
  staffById,
  dateKey,
  nominationOf,
  NOMINATION_LABEL,
  MENU_COLOR,
  type Staff,
} from "@/lib/mock-data";
import {
  resolveBookingPolicy,
  occupancyOf,
  serviceMinOf,
  priceOf,
} from "@/lib/booking";
import { staffFreeForSlot, CURRENT_OPENING_RULE, OPENING_OPTIONS } from "@/lib/shifts";
import { jpDate } from "@/lib/customer-data";

const DAYS = 7; // 1ページの表示日数（前/次の一週間で移動）

type Step = "select" | "form" | "confirm" | "done";
interface CustomerForm {
  name: string;
  kana: string;
  phone: string;
  email: string;
  notes: string;
  lineOptin: boolean;
}
interface Confirmed {
  menuIds: string[];
  staffId?: string; // 主担当（おまかせは確定時に自動割当）
  nominated: boolean;
  forced: boolean;
  date: Date;
  start: number;
  end: number;
  form: CustomerForm;
}

const EMPTY_FORM: CustomerForm = { name: "", kana: "", phone: "", email: "", notes: "", lineOptin: true };

export function CustomerBooking() {
  const today = React.useMemo(() => new Date(), []);
  const [step, setStep] = React.useState<Step>("select");
  const [menuIds, setMenuIds] = React.useState<string[]>([]);
  const [tab, setTab] = React.useState<"omakase" | "staff">("omakase");
  const [staffId, setStaffId] = React.useState<string | null>(null);
  const [weekStart, setWeekStart] = React.useState<Date>(today);
  const [picked, setPicked] = React.useState<{ date: Date; start: number } | null>(null);
  const [form, setForm] = React.useState<CustomerForm>(EMPTY_FORM);
  const [confirmed, setConfirmed] = React.useState<Confirmed | null>(null);

  const policy = resolveBookingPolicy(menuIds);
  const forced = policy.forcedStaff;
  const occ = occupancyOf(menuIds);

  // メニュー変更時に担当タブ/選択を整える
  const menuKey = menuIds.join(",");
  React.useEffect(() => {
    setPicked(null);
    const p = resolveBookingPolicy(menuIds);
    if (p.forcedStaff) {
      setTab("staff");
      setStaffId(p.forcedStaff.id);
    } else if (!p.allowNomination) {
      setTab("omakase");
    } else {
      setStaffId((cur) => (cur && p.nominatable.some((s) => s.id === cur) ? cur : p.nominatable[0]?.id ?? null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuKey]);

  const effMode: "omakase" | "staff" = forced ? "staff" : tab;
  const effStaffId = forced ? forced.id : tab === "staff" ? staffId ?? undefined : undefined;
  const gridSelection: GridSelection | null = picked ? { dateKey: dateKey(picked.date), start: picked.start } : null;
  const poolEmpty = effMode === "staff" ? !effStaffId : policy.candidates.length === 0;

  function toggleMenu(id: string) {
    setMenuIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function switchTab(t: "omakase" | "staff") {
    if (t === "staff" && !policy.allowNomination) return;
    setTab(t);
    setPicked(null);
    if (t === "staff" && !staffId) setStaffId(policy.nominatable[0]?.id ?? null);
  }
  function pickStaff(id: string) {
    setStaffId(id);
    setPicked(null);
  }

  // おまかせ確定時に実際に割り当てる主担当（最初に空いている候補）
  function resolveAssignee(date: Date, start: number): Staff | undefined {
    if (forced) return forced;
    if (effMode === "staff" && effStaffId) return staffById(effStaffId);
    const end = start + occ;
    const dayRes = SEED_RESERVATIONS.filter((r) => r.dateKey === dateKey(date));
    return policy.candidates.find((s) => staffFreeForSlot(s.id, date, start, end, dayRes));
  }

  function goConfirm() {
    if (!picked) return;
    const assignee = resolveAssignee(picked.date, picked.start);
    setConfirmed({
      menuIds: [...menuIds],
      staffId: assignee?.id,
      nominated: effMode === "staff" && !forced,
      forced: !!forced,
      date: picked.date,
      start: picked.start,
      end: picked.start + occ,
      form: { ...form },
    });
    setStep("done");
  }

  function startOver() {
    setStep("select");
    setMenuIds([]);
    setTab("omakase");
    setStaffId(null);
    setWeekStart(today);
    setPicked(null);
    setForm(EMPTY_FORM);
    setConfirmed(null);
  }

  const openingLabel = OPENING_OPTIONS.find((o) => o.id === CURRENT_OPENING_RULE)?.label ?? "";
  const stepNo = step === "select" ? 1 : step === "form" ? 2 : step === "confirm" ? 3 : 4;

  return (
    <PageShell
      title="お客様予約画面（◯×・プレビュー）"
      description="お客様がLINE（ミニアプリ／LIFF）から予約する画面。時間×日付の空き状況を◯△×で表示します。"
      action={<MockBadge />}
    >
      <div className="mx-auto max-w-md">
        {/* LINE風ヘッダー */}
        <div className="rounded-t-2xl bg-gradient-to-br from-primary to-accent px-4 py-3 text-primary-foreground">
          <div className="flex items-center gap-2 text-[11px] opacity-90">
            <Sparkles className="h-3.5 w-3.5" />リピスト ビューティー {STORE.name}
          </div>
          <div className="text-base font-semibold">かんたんWEB予約</div>
        </div>

        {/* ステッパー */}
        <div className="flex items-center justify-between border-x border-border bg-card px-4 py-2 text-[10px] font-medium">
          {[["1", "メニュー・日時"], ["2", "お客様情報"], ["3", "確認"], ["完", "完了"]].map(([n, l], i) => {
            const idx = i + 1;
            const active = idx === stepNo;
            const done = idx < stepNo;
            return (
              <div key={l} className="flex items-center gap-1">
                <span className={cn("flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold", active ? "bg-primary text-primary-foreground" : done ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground")}>{done ? "✓" : n}</span>
                <span className={cn(active ? "text-foreground" : "text-muted-foreground")}>{l}</span>
                {i < 3 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
              </div>
            );
          })}
        </div>

        <div className="rounded-b-2xl border border-t-0 border-border bg-background p-4">
          {step === "select" && (
            <SelectStep
              menuIds={menuIds}
              toggleMenu={toggleMenu}
              policy={policy}
              forced={forced}
              tab={tab}
              switchTab={switchTab}
              staffId={effStaffId ?? null}
              pickStaff={pickStaff}
              weekStart={weekStart}
              setWeekStart={setWeekStart}
              today={today}
              effMode={effMode}
              poolEmpty={poolEmpty}
              gridSelection={gridSelection}
              onPick={(date, start) => setPicked({ date, start })}
              picked={picked}
              occ={occ}
              onNext={() => setStep("form")}
            />
          )}

          {step === "form" && (
            <FormStep
              form={form}
              setForm={setForm}
              onBack={() => setStep("select")}
              onNext={() => setStep("confirm")}
            />
          )}

          {step === "confirm" && picked && (
            <ConfirmStep
              menuIds={menuIds}
              assignee={resolveAssignee(picked.date, picked.start)}
              nominated={effMode === "staff" && !forced}
              forced={!!forced}
              date={picked.date}
              start={picked.start}
              occ={occ}
              form={form}
              onEditSlot={() => setStep("select")}
              onEditForm={() => setStep("form")}
              onConfirm={goConfirm}
            />
          )}

          {step === "done" && confirmed && <DoneStep confirmed={confirmed} onStartOver={startOver} />}
        </div>

        {/* 管理者向けコンテキスト＋思想・連携の明示 */}
        <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip tone="muted">予約開放：{openingLabel}</Chip>
            <span className="inline-flex items-center gap-1"><Info className="h-3 w-3" />◯=予約可 / △=残りわずか / ×=不可</span>
          </div>
          <p>※ モックUI。◯△×は<b>営業時間 × 出勤表/勤務時間 × 休憩・会議・ブロック × メニュー所要+インターバル × 同時予約可能数 × 対応スタッフ × 複数担当 × 予約開放設定 × キャンセル空き</b>を合成して判定。お客様には<b>主担当のみ</b>表示します。</p>
          <p>※ 連携：メニュー作成／スタッフ対応メニュー／出勤表／予約台帳／予約開放設定／強制リンク／個人情報・確認・サンクスページ各テンプレート／LINEリマインド（本実装で接続）。</p>
        </div>
      </div>
    </PageShell>
  );
}

/* ============ Step 1: メニュー・担当・日時 ============ */
function SelectStep(props: {
  menuIds: string[];
  toggleMenu: (id: string) => void;
  policy: ReturnType<typeof resolveBookingPolicy>;
  forced?: Staff;
  tab: "omakase" | "staff";
  switchTab: (t: "omakase" | "staff") => void;
  staffId: string | null;
  pickStaff: (id: string) => void;
  weekStart: Date;
  setWeekStart: (d: Date) => void;
  today: Date;
  effMode: "omakase" | "staff";
  poolEmpty: boolean;
  gridSelection: GridSelection | null;
  onPick: (date: Date, start: number) => void;
  picked: { date: Date; start: number } | null;
  occ: number;
  onNext: () => void;
}) {
  const { menuIds, toggleMenu, policy, forced, tab, switchTab, staffId, pickStaff, weekStart, setWeekStart, today, effMode, poolEmpty, gridSelection, onPick, picked, occ, onNext } = props;
  const serviceMin = serviceMinOf(menuIds);

  return (
    <div className="space-y-4">
      {/* 1. メニュー */}
      <Section step={1} title="メニューを選ぶ" hint="複数選択できます">
        <div className="flex flex-wrap gap-1.5">
          {MENUS.map((m) => {
            const on = menuIds.includes(m.id);
            const pol = nominationOf(m);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMenu(m.id)}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                  on ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-secondary"
                )}
              >
                <span className="flex items-center gap-1">
                  <span className={cn("h-2 w-2 rounded-full", MENU_COLOR[m.color].dot)} />
                  {m.name}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[10px] opacity-70">
                  {m.durationMin}分 / ¥{m.price.toLocaleString()}
                  {pol !== "OPTIONAL" && <span className="rounded bg-secondary px-1 text-[9px] text-muted-foreground">{NOMINATION_LABEL[pol]}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* 2. 担当 */}
      <Section step={2} title="担当を選ぶ">
        {forced ? (
          <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs">
            <Crown className="h-4 w-4 text-accent" />
            <span><b>{forced.name}</b> が担当します（このメニューは強制指名）</span>
          </div>
        ) : (
          <>
            {/* おまかせ / スタッフ別 タブ */}
            <div className="flex gap-1">
              <TabBtn active={tab === "omakase"} onClick={() => switchTab("omakase")} label="サロンの空き状況" sub="指名なし・おまかせ" />
              <TabBtn
                active={tab === "staff"}
                disabled={!policy.allowNomination}
                onClick={() => switchTab("staff")}
                label="スタッフ別の空き状況"
                sub={policy.allowNomination ? "担当を指名" : "指名不可メニュー"}
              />
            </div>
            {tab === "omakase" ? (
              <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                {policy.hasNoneMenu ? <Lock className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                {policy.hasNoneMenu ? "このメニューは指名不可。担当は店舗で割り当てます。" : "対応できるスタッフの中から、空いている担当を自動でご案内します。"}
              </p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {policy.nominatable.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => pickStaff(s.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      staffId === s.id ? "border-foreground/30 bg-secondary text-foreground" : "border-border bg-card text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Section>

      {/* 3. 日時（◯△×） */}
      <Section step={3} title="日時を選ぶ" hint={menuIds.length === 0 ? undefined : `所要約${serviceMin}分`}>
        {menuIds.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-secondary/20 px-3 py-4 text-center text-xs text-muted-foreground">まずメニューを選択してください</p>
        ) : poolEmpty ? (
          <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-4 text-center text-xs text-amber-700">この組み合わせに対応できる枠がありません。メニューや担当を見直してください。</p>
        ) : (
          <>
            {/* 週ナビ */}
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => setWeekStart(addDays(weekStart, -DAYS))} className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary">
                <ChevronLeft className="h-3.5 w-3.5" />前の{DAYS}日
              </button>
              <div className="flex items-center gap-1">
                <DatePicker value={weekStart} onChange={setWeekStart} />
                <button type="button" onClick={() => setWeekStart(today)} className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary">今日</button>
              </div>
              <button type="button" onClick={() => setWeekStart(addDays(weekStart, DAYS))} className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary">
                次の{DAYS}日<ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {/* 凡例 */}
            <div className="mb-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-0.5"><span className="font-bold text-emerald-500">◯</span>空き</span>
              <span className="inline-flex items-center gap-0.5"><span className="font-bold text-amber-500">△</span>残りわずか</span>
              <span className="inline-flex items-center gap-0.5"><span className="font-bold text-muted-foreground/40">×</span>不可</span>
            </div>
            <AvailabilityGrid
              weekStart={weekStart}
              days={DAYS}
              menuIds={menuIds}
              mode={effMode}
              staffId={staffId ?? undefined}
              candidates={policy.candidates}
              selected={gridSelection}
              onPick={onPick}
            />
          </>
        )}
      </Section>

      {/* 選択中の枠 → 次へ */}
      {picked && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
          <div className="text-xs font-semibold text-foreground">選択中の日時</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums text-primary">
            {jpDate(dateKey(picked.date))} {minToLabel(picked.start)}〜{minToLabel(picked.start + occ)}
          </div>
          <Button size="sm" className="mt-2 w-full" onClick={onNext}>お客様情報の入力へ</Button>
        </div>
      )}
    </div>
  );
}

/* ============ Step 2: 個人情報入力 ============ */
function FormStep({ form, setForm, onBack, onNext }: { form: CustomerForm; setForm: (f: CustomerForm) => void; onBack: () => void; onNext: () => void }) {
  const ok = form.name.trim() !== "" && form.phone.trim() !== "";
  const set = (patch: Partial<CustomerForm>) => setForm({ ...form, ...patch });
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-foreground">お客様情報の入力</div>
      <div className="space-y-2">
        <Field label="お名前（必須）"><Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="山田 花子" /></Field>
        <Field label="フリガナ"><Input value={form.kana} onChange={(e) => set({ kana: e.target.value })} placeholder="ヤマダ ハナコ" /></Field>
        <Field label="電話番号（必須）"><Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="090-1234-5678" /></Field>
        <Field label="メールアドレス"><Input value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="hanako@example.com" /></Field>
        <Field label="ご相談・ご要望（任意）">
          <textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="気になる悩み・なりたいイメージなど" className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-sm" />
        </Field>
      </div>
      <label className="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-2 text-[11px]">
        <input type="checkbox" checked={form.lineOptin} onChange={(e) => set({ lineOptin: e.target.checked })} className="h-3.5 w-3.5 accent-primary" />
        <span>LINEで予約確認・リマインドを受け取る（問診票のご案内もこちら）</span>
      </label>
      <p className="text-[10px] text-muted-foreground">※ 入力項目は「個人情報入力テンプレート」の設定に連動します（モック）。</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onBack}><ChevronLeft className="h-3.5 w-3.5" />戻る</Button>
        <Button size="sm" className="flex-1" disabled={!ok} onClick={onNext}>確認画面へ</Button>
      </div>
    </div>
  );
}

/* ============ Step 3: 確認 ============ */
function ConfirmStep(props: {
  menuIds: string[];
  assignee?: Staff;
  nominated: boolean;
  forced: boolean;
  date: Date;
  start: number;
  occ: number;
  form: CustomerForm;
  onEditSlot: () => void;
  onEditForm: () => void;
  onConfirm: () => void;
}) {
  const { menuIds, assignee, nominated, forced, date, start, occ, form, onEditSlot, onEditForm, onConfirm } = props;
  const staffLabel = forced ? `${assignee?.name}（強制指名）` : nominated ? `${assignee?.name}（指名）` : "指名なし（おまかせ）";
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-foreground">ご予約内容の確認</div>
      <div className="rounded-xl border border-border bg-card p-3 text-xs">
        <RowEdit label="メニュー" value={menuIds.map((id) => menuById(id)?.name).filter(Boolean).join(" + ")} onEdit={onEditSlot} />
        <RowEdit label="担当" value={staffLabel} onEdit={onEditSlot} />
        <RowEdit label="日時" value={`${jpDate(dateKey(date))} ${minToLabel(start)}〜${minToLabel(start + occ)}`} onEdit={onEditSlot} />
        <Row label="料金" value={`¥${priceOf(menuIds).toLocaleString()}`} />
      </div>
      <div className="rounded-xl border border-border bg-card p-3 text-xs">
        <RowEdit label="お名前" value={form.name} onEdit={onEditForm} />
        {form.kana && <Row label="フリガナ" value={form.kana} />}
        <Row label="電話番号" value={form.phone} />
        {form.email && <Row label="メール" value={form.email} />}
        {form.notes && <Row label="ご要望" value={form.notes} />}
      </div>
      <p className="text-[10px] text-muted-foreground">※ 確認画面の文言は「確認画面テンプレート」に連動します（モック）。</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onEditForm}><ChevronLeft className="h-3.5 w-3.5" />戻る</Button>
        <Button size="sm" className="flex-1" onClick={onConfirm}>予約を確定する</Button>
      </div>
    </div>
  );
}

/* ============ 完了 ============ */
function DoneStep({ confirmed, onStartOver }: { confirmed: Confirmed; onStartOver: () => void }) {
  const staff = confirmed.staffId ? staffById(confirmed.staffId) : undefined;
  const menus = confirmed.menuIds.map((id) => menuById(id)?.name).filter(Boolean).join(" + ");
  const staffLabel = confirmed.forced ? `${staff?.name}（強制指名）` : confirmed.nominated ? `${staff?.name}（指名）` : `${staff?.name ?? "おまかせ"}（おまかせ）`;
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center py-1 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check className="h-6 w-6" /></div>
        <div className="mt-2 text-sm font-semibold">ご予約ありがとうございます</div>
        <div className="text-[11px] text-muted-foreground">確認メッセージをLINEにお送りしました</div>
      </div>
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold tabular-nums">{jpDate(dateKey(confirmed.date))} {minToLabel(confirmed.start)}〜{minToLabel(confirmed.end)}</div>
        </div>
        <dl className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
          <Row label="メニュー" value={menus} />
          <Row label="担当" value={staffLabel} />
          <Row label="お名前" value={`${confirmed.form.name} 様`} />
        </dl>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NextAction icon={MessageCircle} label="LINE友だち追加" />
        <NextAction icon={ClipboardList} label="問診票を入力" />
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={onStartOver}><RotateCcw className="h-3.5 w-3.5" />別の予約をする</Button>
      <p className="text-center text-[10px] text-muted-foreground">前日に「お店の思い」メッセージが届きます（来店期待感の演出・モック）。本実装では予約台帳に主担当の担当ブロックとして登録されます。</p>
    </div>
  );
}

/* ============ 共通パーツ ============ */
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

function TabBtn({ active, disabled, onClick, label, sub }: { active: boolean; disabled?: boolean; onClick: () => void; label: string; sub: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex-1 rounded-t-lg border px-2 py-1.5 text-center transition-colors",
        active ? "border-border border-b-transparent bg-card font-semibold text-primary" : disabled ? "cursor-not-allowed border-transparent bg-secondary/30 text-muted-foreground/50" : "border-transparent bg-secondary/40 text-muted-foreground hover:bg-secondary"
      )}
    >
      <div className="text-[11px]">{label}</div>
      <div className="text-[9px] opacity-80">{sub}</div>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-0.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 py-0.5">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
function RowEdit({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/50 py-1 last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="flex-1 text-right font-medium text-foreground">{value}</span>
      <button type="button" onClick={onEdit} className="shrink-0 text-[10px] font-medium text-primary hover:underline">変更</button>
    </div>
  );
}

function NextAction({ icon: Icon, label }: { icon: typeof MessageCircle; label: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 rounded-xl border border-accent/30 bg-accent/5 py-2 text-[11px] font-semibold text-accent">
      <Icon className="h-3.5 w-3.5" />{label}
    </div>
  );
}
