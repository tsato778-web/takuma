"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Plus, Store as StoreIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ReservationBlock } from "./reservation-block";
import { DatePicker } from "./date-picker";
import { NewReservationDialog } from "./new-reservation-dialog";
import { ReservationDetailDialog } from "./reservation-detail-dialog";
import { NotificationBell } from "@/components/notification-bell";
import { CustomerDrawer } from "@/components/customer/customer-drawer";
import { CheckoutDialog } from "@/components/pos/checkout-dialog";
import { DailyMemoBar } from "./daily-memo-bar";
import { SEED_NOTIFICATIONS, type AppNotification } from "@/lib/notifications";
import { SEED_MEMOS, type DailyMemo } from "@/lib/memos";
import {
  OPEN_MIN,
  CLOSE_MIN,
  TOTAL_MIN,
  GRAN_CONFIG,
  type Granularity,
  minToLabel,
  snapTo,
  clampMin,
  addDays,
  isSameDay,
  hourMarks,
  parseDateKey,
} from "@/lib/time";
import {
  STAFF,
  STORES,
  SEED_RESERVATIONS,
  CURRENT_USER,
  dateKey,
  occupiesSlot,
  blockTitle,
  customerById,
  hasStaffMenuMismatch,
  type AssignRole,
  type Reservation,
} from "@/lib/mock-data";

const LABEL_W = 150;
const ROW_H = 78;
const HEADER_H = 40;

type DragMode = "move" | "resize";
interface Preview {
  id: string;
  start: number;
  end: number;
  staffId: string;
}

export function ReservationBoard() {
  const [date, setDate] = React.useState<Date>(() => new Date());
  const [gran, setGran] = React.useState<Granularity>(30);
  const [storeId, setStoreId] = React.useState(STORES[0].id);
  const [reservations, setReservations] = React.useState<Reservation[]>(SEED_RESERVATIONS);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [prefill, setPrefill] = React.useState<{ staffId: string; start: number } | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [drawerCustomerId, setDrawerCustomerId] = React.useState<string | null>(null);
  const [checkoutId, setCheckoutId] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [notifications, setNotifications] = React.useState<AppNotification[]>(SEED_NOTIFICATIONS);
  const [memos, setMemos] = React.useState<DailyMemo[]>(SEED_MEMOS);
  const [highlightId, setHighlightId] = React.useState<string | null>(null);

  const trackRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const justDragged = React.useRef(false);

  const { slot, pxPerMin } = GRAN_CONFIG[gran];
  const totalWidth = TOTAL_MIN * pxPerMin;
  const slotPx = slot * pxPerMin;
  const dk = dateKey(date);

  // キャンセルも履歴として台帳に表示する (顧客予約画面側では空き扱い = occupiesSlot)
  const dayReservations = React.useMemo(
    () => reservations.filter((r) => r.dateKey === dk),
    [reservations, dk]
  );

  // ---- サマリ (キャンセルは予約数に含めない) ----
  const summary = React.useMemo(() => {
    const reservations = dayReservations.filter(
      (r) => r.kind === "RESERVATION" && r.status !== "CANCELED"
    );
    const inService = reservations.filter(
      (r) => r.status === "ARRIVED" || r.status === "DONE"
    );
    return {
      total: reservations.length,
      visited: inService.length,
      unpaid: inService.filter((r) => !r.paid).length,
      noChart: inService.filter((r) => !r.hasChart).length,
    };
  }, [dayReservations]);

  // ---- 二重予約(重複)検出: スタッフ単位の担当ブロック時間で判定 ----
  const { conflictIds, conflictInfo } = React.useMemo(() => {
    const ids = new Set<string>();
    const info: Record<string, string> = {};
    type Seg = { rid: string; staffId: string; start: number; end: number };
    const segs: Seg[] = [];
    for (const r of dayReservations) {
      if (!occupiesSlot(r)) continue;
      if (r.assignments && r.assignments.length) {
        for (const a of r.assignments) segs.push({ rid: r.id, staffId: a.staffId, start: a.start, end: a.end });
      } else {
        segs.push({ rid: r.id, staffId: r.staffId, start: r.start, end: r.end });
      }
    }
    const titleOf = (rid: string) => {
      const r = dayReservations.find((x) => x.id === rid);
      return r ? blockTitle(r) : "";
    };
    const add = (rid: string, other: Seg) => {
      const desc = `${titleOf(other.rid)} ${minToLabel(other.start)}–${minToLabel(other.end)}`;
      info[rid] = info[rid] ? `${info[rid]}\n${desc}` : `重複: ${desc}`;
      ids.add(rid);
    };
    for (let i = 0; i < segs.length; i++) {
      for (let j = i + 1; j < segs.length; j++) {
        const a = segs[i];
        const b = segs[j];
        if (a.rid !== b.rid && a.staffId === b.staffId && a.start < b.end && b.start < a.end) {
          add(a.rid, b);
          add(b.rid, a);
        }
      }
    }
    return { conflictIds: ids, conflictInfo: info };
  }, [dayReservations]);

  // ---- 日毎メモ (store_id + 日付 + 可視性で絞り込み) ----
  const visibleMemos = React.useMemo(
    () =>
      memos.filter(
        (m) =>
          m.storeId === storeId &&
          m.dateKey === dk &&
          (m.scope === "STORE" || m.ownerId === CURRENT_USER.id)
      ),
    [memos, storeId, dk]
  );

  function saveMemo(memo: DailyMemo) {
    setMemos((ms) => {
      const exists = ms.some((m) => m.id === memo.id);
      return exists ? ms.map((m) => (m.id === memo.id ? memo : m)) : [...ms, memo];
    });
  }
  function deleteMemo(id: string) {
    setMemos((ms) => ms.filter((m) => m.id !== id));
  }

  // ---- 位置 <-> 時間 ----
  function pointerToMin(clientX: number): number {
    const left = trackRef.current?.getBoundingClientRect().left ?? 0;
    return OPEN_MIN + (clientX - left) / pxPerMin;
  }

  // ---- ドラッグ開始 (移動 / リサイズ) ----
  function startDrag(e: React.PointerEvent, res: Reservation, mode: DragMode) {
    e.preventDefault();
    const grabMin = pointerToMin(e.clientX) - res.start;
    const dur = res.end - res.start;
    const d = {
      id: res.id,
      mode,
      grabMin,
      dur,
      moved: false,
      curStart: res.start,
      curEnd: res.end,
      curStaff: res.staffId,
    };

    const move = (ev: PointerEvent) => {
      const min = pointerToMin(ev.clientX);
      if (mode === "move") {
        let start = clampMin(snapTo(min - d.grabMin, slot));
        start = Math.max(OPEN_MIN, Math.min(start, CLOSE_MIN - d.dur));
        let staffId = d.curStaff;
        const els = document.elementsFromPoint(ev.clientX, ev.clientY) as HTMLElement[];
        const row = els.find((el) => el.dataset && el.dataset.staffId);
        if (row?.dataset.staffId) staffId = row.dataset.staffId;
        d.curStart = start;
        d.curEnd = start + d.dur;
        d.curStaff = staffId;
      } else {
        let end = snapTo(min, slot);
        end = Math.max(d.curStart + slot, Math.min(CLOSE_MIN, end));
        d.curEnd = end;
      }
      d.moved = true;
      setPreview({ id: d.id, start: d.curStart, end: d.curEnd, staffId: d.curStaff });
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (d.moved) {
        setReservations((rs) =>
          rs.map((r) =>
            r.id === d.id ? { ...r, start: d.curStart, end: d.curEnd, staffId: d.curStaff } : r
          )
        );
        justDragged.current = true;
        window.setTimeout(() => {
          justDragged.current = false;
        }, 60);
      } else {
        setDetailId(d.id); // 動いていなければクリック扱い = 詳細
      }
      setPreview(null);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // ---- 空き枠クリック → 新規作成 ----
  function handleTrackClick(e: React.MouseEvent, staffId: string) {
    if (justDragged.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const min = clampMin(snapTo(OPEN_MIN + (e.clientX - rect.left) / pxPerMin, slot));
    setPrefill({ staffId, start: Math.min(min, CLOSE_MIN - slot) });
    setCreateOpen(true);
  }

  function openNew() {
    setPrefill({ staffId: STAFF[0].id, start: 10 * 60 });
    setCreateOpen(true);
  }

  function handleCreate(r: Reservation) {
    setReservations((rs) => [...rs, r]);
  }

  function updateRes(id: string, patch: Partial<Reservation>) {
    setReservations((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function deleteRes(id: string) {
    setReservations((rs) => rs.filter((r) => r.id !== id));
    setDetailId(null);
  }

  // ---- 通知 (store_id 単位で分離) ----
  const storeNotifications = React.useMemo(
    () => notifications.filter((n) => n.storeId === storeId),
    [notifications, storeId]
  );

  function markAllRead() {
    setNotifications((ns) =>
      ns.map((n) => (n.storeId === storeId ? { ...n, read: true } : n))
    );
  }

  function jumpToNotification(n: AppNotification) {
    setNotifications((ns) => ns.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    if (!n.reservationId) return;
    const res = reservations.find((r) => r.id === n.reservationId);
    if (!res) return;
    setDate(parseDateKey(n.dateKey));
    setHighlightId(res.id);
    window.setTimeout(() => setHighlightId(null), 2600);
    // 日付切替後のレイアウト確定を待ってから対象時刻へ横スクロール
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          left: Math.max(0, (res.start - OPEN_MIN) * pxPerMin - 140),
          behavior: "smooth",
        });
      })
    );
  }

  const detailRes = detailId ? reservations.find((r) => r.id === detailId) ?? null : null;

  // スタッフ行に描く担当セグメント (複数担当は担当ブロックごとに分割描画)
  function segmentsForStaff(staffId: string) {
    const out: { r: Reservation; segStart: number; segEnd: number; role?: AssignRole; label?: string; relayPrev?: boolean; relayNext?: boolean }[] = [];
    for (const base of dayReservations) {
      const r =
        preview && preview.id === base.id
          ? { ...base, start: preview.start, end: preview.end, staffId: preview.staffId }
          : base;
      if (r.assignments && r.assignments.length) {
        const asg = r.assignments;
        for (const a of asg) {
          if (a.staffId !== staffId) continue;
          const relayPrev = asg.some((x) => x.staffId !== a.staffId && Math.abs(x.end - a.start) <= 1);
          const relayNext = asg.some((x) => x.staffId !== a.staffId && Math.abs(x.start - a.end) <= 1);
          out.push({ r, segStart: a.start, segEnd: a.end, role: a.role, label: a.label, relayPrev, relayNext });
        }
      } else if (r.staffId === staffId) {
        out.push({ r, segStart: r.start, segEnd: r.end });
      }
    }
    return out;
  }

  return (
    <div className="flex h-full flex-col">
      {/* ===== ツールバー ===== */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-3">
        <div className="flex items-center gap-2">
          <StoreIcon className="h-4 w-4 text-muted-foreground" />
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="h-9 rounded-md border border-input bg-card px-2 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {STORES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setDate((d) => addDays(d, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={isSameDay(date, new Date()) ? "secondary" : "outline"}
            size="sm"
            onClick={() => setDate(new Date())}
          >
            今日
          </Button>
          <Button variant="outline" size="icon" onClick={() => setDate((d) => addDays(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <DatePicker value={date} onChange={setDate} />
        </div>

        {/* 粒度切替 */}
        <div className="flex overflow-hidden rounded-md border border-border">
          {([15, 30, 60] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGran(g)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                gran === g
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              {g}分
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
            <span>
              予約 <b className="text-foreground">{summary.total}</b>
            </span>
            <span>
              来店 <b className="text-foreground">{summary.visited}</b>
            </span>
            <span>
              未会計 <b className="text-rose-600">{summary.unpaid}</b>
            </span>
            <span>
              未カルテ <b className="text-amber-600">{summary.noChart}</b>
            </span>
          </div>
          <NotificationBell
            notifications={storeNotifications}
            onJump={jumpToNotification}
            onMarkAllRead={markAllRead}
          />
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4" /> 新規予約
          </Button>
        </div>
      </div>

      {/* ===== 日毎メモ ===== */}
      <DailyMemoBar memos={visibleMemos} dateKey={dk} onSave={saveMemo} onDelete={deleteMemo} />

      {/* ===== 台帳 (横軸=時間 / 縦軸=スタッフ) ===== */}
      <div
        ref={scrollRef}
        className="thin-scrollbar relative flex-1 select-none overflow-auto bg-background"
      >
        <div style={{ width: LABEL_W + totalWidth }}>
          {/* 時間ヘッダー */}
          <div className="sticky top-0 z-30 flex" style={{ height: HEADER_H }}>
            <div
              className="sticky left-0 z-40 flex shrink-0 items-center border-b border-r border-border bg-card px-3 text-[11px] font-medium text-muted-foreground"
              style={{ width: LABEL_W }}
            >
              スタッフ ＼ 時間
            </div>
            <div
              ref={trackRef}
              className="relative border-b border-border bg-card"
              style={{ width: totalWidth }}
            >
              {hourMarks().map((m) => (
                <div
                  key={m}
                  className="absolute top-0 flex h-full items-center"
                  style={{ left: (m - OPEN_MIN) * pxPerMin }}
                >
                  <span className="-ml-px border-l border-border pl-1 text-[11px] tabular-nums text-muted-foreground">
                    {minToLabel(m)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* スタッフ行 */}
          {STAFF.map((s) => (
            <div key={s.id} className="flex" style={{ height: ROW_H }}>
              <div
                className="sticky left-0 z-20 flex shrink-0 items-center gap-2 border-b border-r border-border bg-card px-3"
                style={{ width: LABEL_W }}
              >
                <span
                  className="h-7 w-1.5 rounded-full"
                  style={{ background: s.color }}
                  aria-hidden
                />
                <div className="leading-tight">
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {s.acceptsNomination ? "指名可" : "指名不可"}
                  </div>
                </div>
              </div>

              <div
                data-staff-id={s.id}
                onClick={(e) => handleTrackClick(e, s.id)}
                className="board-grid-bg relative border-b border-border"
                style={{ width: totalWidth, ["--slot-px" as string]: `${slotPx}px` }}
              >
                {segmentsForStaff(s.id).map((seg, i) => {
                  const r = seg.r;
                  const isFull = !seg.role;
                  return (
                    <ReservationBlock
                      key={`${r.id}-${seg.role ?? "full"}-${i}`}
                      reservation={r}
                      pxPerMin={pxPerMin}
                      dragging={isFull && preview?.id === r.id}
                      highlight={highlightId === r.id}
                      conflict={conflictIds.has(r.id) && seg.role !== "ASSIST"}
                      conflictInfo={conflictInfo[r.id]}
                      staffWarn={isFull && hasStaffMenuMismatch(r)}
                      segStart={seg.segStart}
                      segEnd={seg.segEnd}
                      segRole={seg.role}
                      segLabel={seg.label}
                      relayPrev={seg.relayPrev}
                      relayNext={seg.relayNext}
                      onBodyPointerDown={(e) => (isFull ? startDrag(e, r, "move") : (e.stopPropagation(), setDetailId(r.id)))}
                      onResizePointerDown={(e) => startDrag(e, r, "resize")}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <NewReservationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        prefill={prefill}
        dateKey={dk}
        daySlots={dayReservations}
        onCreate={handleCreate}
      />
      <ReservationDetailDialog
        reservation={detailRes}
        onOpenChange={(o) => !o && setDetailId(null)}
        onUpdate={updateRes}
        onDelete={deleteRes}
        onOpenCustomer={(id) => {
          setDetailId(null);
          setDrawerCustomerId(id);
        }}
        onCheckout={(id) => {
          setDetailId(null);
          setCheckoutId(id);
        }}
      />
      <CustomerDrawer
        customer={drawerCustomerId ? customerById(drawerCustomerId) ?? null : null}
        onOpenChange={(o) => !o && setDrawerCustomerId(null)}
      />
      <CheckoutDialog
        reservation={checkoutId ? reservations.find((r) => r.id === checkoutId) ?? null : null}
        onOpenChange={(o) => !o && setCheckoutId(null)}
        onComplete={(id) => updateRes(id, { status: "DONE", paid: true })}
      />
    </div>
  );
}
