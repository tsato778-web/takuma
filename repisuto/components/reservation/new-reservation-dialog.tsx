"use client";

import * as React from "react";
import { Clock, AlertTriangle, UserPlus, Search, Send } from "lucide-react";

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
import { useBrand } from "@/lib/brand-context";
import { OPEN_MIN, CLOSE_MIN, minToLabel } from "@/lib/time";
import {
  MENUS,
  STAFF,
  STORE,
  INTERVAL_OPTIONS,
  MEDIA_OPTIONS,
  menuById,
  staffById,
  staffHandlesMenu,
  blockTitle,
  suggestedInterval,
  findConflicts,
  customersByPhone,
  createCustomer,
  formatCustomerNo,
  type BlockKind,
  type Reservation,
  type Assignment,
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
  const { brand } = useBrand();
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
  // 新規顧客(電話予約)
  const [custMode, setCustMode] = React.useState<"existing" | "new">("existing");
  const [nc, setNc] = React.useState({ name: "", kana: "", phone: "", email: "", source: MEDIA_OPTIONS[0], notify: true });
  // メニュー別担当割り当て
  const [menuStaff, setMenuStaff] = React.useState<Record<string, string>>({});
  const [assists, setAssists] = React.useState<string[]>([]);

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
      setCustMode("existing");
      setNc({ name: "", kana: "", phone: "", email: "", source: MEDIA_OPTIONS[0], notify: true });
      setMenuStaff({});
      setAssists([]);
    }
  }, [open, prefill]);

  const dupCandidates = custMode === "new" ? customersByPhone(nc.phone) : [];
  // ブランド設定で複数担当を抑制可能（業種に依存せずブランドごとに切替）
  const splitAssign = kind === "RESERVATION" && menuIds.length >= 2 && brand.bookingConfig.allowMultiAssign;
  const menuStaffOf = (mid: string) => menuStaff[mid] ?? staffId;
  const menuSlots = (() => {
    let t = start;
    return menuIds.map((mid) => {
      const d = menuById(mid)?.durationMin ?? 30;
      const s0 = t;
      t += d;
      return { mid, s0, e0: t };
    });
  })();

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
  const customerOk = custMode === "new" ? nc.name.trim() !== "" && nc.phone.trim() !== "" : !!customerId;
  const canSave = isReservation ? customerOk && menuIds.length > 0 : true;

  function toggleMenu(id: string) {
    setMenuIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // メニュー別 担当割り当て (2メニュー以上で有効)
  function buildAssignments(): Assignment[] | undefined {
    if (!splitAssign) return undefined;
    let t = start;
    const out: Assignment[] = [];
    menuIds.forEach((mid, i) => {
      const m = menuById(mid);
      const dur = m?.durationMin ?? 30;
      out.push({ staffId: menuStaffOf(mid), role: i === 0 ? "MAIN" : "SUB", label: m?.name ?? "", start: t, end: t + dur, share: i === 0 ? 1 : 0 });
      t += dur;
    });
    assists.forEach((sid) => out.push({ staffId: sid, role: "ASSIST", label: "補助", start, end: t }));
    return out;
  }

  function buildReservation(custId: string | undefined): Reservation {
    const assignments = buildAssignments();
    const mainStaff = assignments ? assignments[0].staffId : staffId;
    return {
      id: `s${Date.now()}`,
      storeId: STORE.id,
      dateKey,
      kind,
      customerId: isReservation ? custId : undefined,
      staffId: mainStaff,
      menuIds: isReservation ? menuIds : [],
      label: kind === "OTHER" ? label.trim() || undefined : undefined,
      start,
      end,
      intervalMin: effInterval,
      status: "CONFIRMED",
      source: custMode === "new" ? "PHONE" : "MANUAL",
      isNominated: isReservation ? nominated : false,
      paid: false,
      hasChart: false,
      assignments,
    };
  }

  async function resolveCustomerId(): Promise<string | undefined> {
    if (!isReservation) return undefined;
    if (custMode === "new") {
      // 電話予約からの新規顧客：DB へ POST（永続採番）＋ ローカルモックにも反映してUI即時更新
      const genId = `cus${Date.now()}`;
      // ローカルモックへは常に投入（他ページの表示互換）
      const mock = createCustomer({ id: genId, name: nc.name.trim(), kana: nc.kana.trim(), phone: nc.phone.trim(), firstSource: nc.source, staffId, dateKey });
      try {
        await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: genId,
            storeId: STORE.id,
            name: nc.name.trim(),
            kana: nc.kana.trim(),
            phone: nc.phone.trim(),
            firstSource: nc.source,
            registerMedia: "電話予約",
            funnel: `${nc.source} → 電話予約`,
            mainStaffId: staffId,
            firstStaffId: staffId,
            lastStaffId: staffId,
            lastVisitDate: dateKey,
          }),
        });
      } catch (e) {
        // DB オフ時はローカルのみ保持（予約 POST 側は FK エラーになる可能性あり）
        console.warn("POST /api/customers failed（ローカルモックのみに追加）", e);
      }
      return mock.id;
    }
    return customerId ?? undefined;
  }

  function commit(r: Reservation) {
    onCreate(r);
    onOpenChange(false);
  }

  async function handleSave() {
    if (!canSave) return;
    const custId = await resolveCustomerId();
    const r = buildReservation(custId);
    const conflicts = findConflicts(r, daySlots);
    if (conflicts.length > 0) {
      setPending({ r, conflicts });
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
                  <div className="flex items-center justify-between">
                    <Label>顧客</Label>
                    <div className="flex overflow-hidden rounded-md border border-border text-[11px]">
                      <button type="button" onClick={() => setCustMode("existing")} className={cn("flex items-center gap-1 px-2 py-1 font-medium", custMode === "existing" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}><Search className="h-3 w-3" />既存顧客</button>
                      <button type="button" onClick={() => setCustMode("new")} className={cn("flex items-center gap-1 px-2 py-1 font-medium", custMode === "new" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}><UserPlus className="h-3 w-3" />新規顧客として予約</button>
                    </div>
                  </div>

                  {custMode === "existing" ? (
                    <CustomerCombobox value={customerId} onChange={setCustomerId} />
                  ) : (
                    <div className="space-y-2 rounded-lg border border-border bg-secondary/20 p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="氏名（必須）" value={nc.name} onChange={(e) => setNc((s) => ({ ...s, name: e.target.value }))} />
                        <Input placeholder="カナ" value={nc.kana} onChange={(e) => setNc((s) => ({ ...s, kana: e.target.value }))} />
                        <Input placeholder="電話番号（必須）" value={nc.phone} onChange={(e) => setNc((s) => ({ ...s, phone: e.target.value }))} />
                        <Input placeholder="メールアドレス" value={nc.email} onChange={(e) => setNc((s) => ({ ...s, email: e.target.value }))} />
                        <select value={nc.source} onChange={(e) => setNc((s) => ({ ...s, source: e.target.value }))} className="h-9 rounded-md border border-input bg-card px-2 text-sm">
                          {MEDIA_OPTIONS.map((m) => <option key={m} value={m}>{m}（流入経路）</option>)}
                        </select>
                      </div>
                      {dupCandidates.length > 0 && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px]">
                          <div className="mb-1 flex items-center gap-1 font-medium text-amber-800"><AlertTriangle className="h-3 w-3" />既存顧客の可能性があります</div>
                          {dupCandidates.map((c) => (
                            <button key={c.id} type="button" onClick={() => { setCustMode("existing"); setCustomerId(c.id); }} className="flex w-full items-center justify-between rounded px-1.5 py-1 hover:bg-amber-100">
                              <span>No.{formatCustomerNo(c.customerNo)} {c.name}（{c.phone}）</span>
                              <span className="font-medium text-amber-700">この顧客に紐付ける →</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <input type="checkbox" checked={nc.notify} onChange={(e) => setNc((s) => ({ ...s, notify: e.target.checked }))} className="h-3.5 w-3.5 accent-primary" />
                        <Send className="h-3 w-3" />予約完了通知＋問診票URLを電話番号宛に送信（SMS/LINE/メール・モック）
                      </label>
                    </div>
                  )}
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

                {splitAssign && (
                  <div className="space-y-1.5">
                    <Label>担当割り当て（メニュー別）</Label>
                    <div className="space-y-1.5 rounded-lg border border-border p-2">
                      {menuSlots.map(({ mid, s0, e0 }, i) => {
                        const m = menuById(mid);
                        return (
                          <div key={mid} className="flex items-center gap-2 text-xs">
                            <span className="w-24 shrink-0 tabular-nums text-muted-foreground">{minToLabel(s0)}-{minToLabel(e0)}</span>
                            <span className="w-16 shrink-0 font-medium">{m?.name}</span>
                            <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium", i === 0 ? "bg-primary/10 text-primary" : "bg-accent/12 text-accent")}>{i === 0 ? "主担当" : "サブ担当"}</span>
                            <select value={menuStaffOf(mid)} onChange={(e) => setMenuStaff((p) => ({ ...p, [mid]: e.target.value }))} className="h-8 flex-1 rounded-md border border-input bg-card px-2 text-xs">
                              {STAFF.filter((s) => staffHandlesMenu(s.id, mid)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </div>
                        );
                      })}
                      {assists.map((sid, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className="w-24 shrink-0 tabular-nums text-muted-foreground">{minToLabel(start)}-{minToLabel(menuSlots[menuSlots.length - 1]?.e0 ?? start)}</span>
                          <span className="w-16 shrink-0 font-medium">補助</span>
                          <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">補助</span>
                          <select value={sid} onChange={(e) => setAssists((a) => a.map((x, j) => (j === idx ? e.target.value : x)))} className="h-8 flex-1 rounded-md border border-input bg-card px-2 text-xs">
                            {STAFF.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          <button type="button" onClick={() => setAssists((a) => a.filter((_, j) => j !== idx))} className="text-muted-foreground hover:text-rose-600">×</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setAssists((a) => [...a, STAFF[3].id])} className="text-[11px] font-medium text-primary hover:underline">＋ 補助担当を追加</button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">メニューごとに担当を割り当てると、台帳に担当別ブロックで表示され、会計の売上配分にも連動します。</p>
                  </div>
                )}
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
