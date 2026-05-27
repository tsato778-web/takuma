"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Plus, Store as StoreIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ReservationBlock } from "./reservation-block";
import { NewReservationDialog } from "./new-reservation-dialog";
import { ReservationDetailDialog } from "./reservation-detail-dialog";
import {
  OPEN_MIN,
  CLOSE_MIN,
  TOTAL_MIN,
  GRAN_CONFIG,
  type Granularity,
  minToLabel,
  snapTo,
  clampMin,
  formatDate,
  addDays,
  isSameDay,
  hourMarks,
} from "@/lib/time";
import {
  STAFF,
  STORES,
  SEED_RESERVATIONS,
  dateKey,
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
  const [preview, setPreview] = React.useState<Preview | null>(null);

  const trackRef = React.useRef<HTMLDivElement>(null);
  const justDragged = React.useRef(false);

  const { slot, pxPerMin } = GRAN_CONFIG[gran];
  const totalWidth = TOTAL_MIN * pxPerMin;
  const slotPx = slot * pxPerMin;
  const dk = dateKey(date);

  const dayReservations = React.useMemo(
    () => reservations.filter((r) => r.dateKey === dk && r.status !== "CANCELED"),
    [reservations, dk]
  );

  // ---- サマリ ----
  const summary = React.useMemo(() => {
    const inService = dayReservations.filter(
      (r) => r.status === "ARRIVED" || r.status === "DONE"
    );
    return {
      total: dayReservations.length,
      visited: inService.length,
      unpaid: inService.filter((r) => !r.paid).length,
      noChart: inService.filter((r) => !r.hasChart).length,
    };
  }, [dayReservations]);

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

  const detailRes = detailId ? reservations.find((r) => r.id === detailId) ?? null : null;

  function resolveForStaff(staffId: string) {
    return dayReservations
      .map((r) =>
        preview && preview.id === r.id
          ? { ...r, start: preview.start, end: preview.end, staffId: preview.staffId }
          : r
      )
      .filter((r) => r.staffId === staffId);
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
          <div className="ml-2 text-sm font-semibold tabular-nums">{formatDate(date)}</div>
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
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4" /> 新規予約
          </Button>
        </div>
      </div>

      {/* ===== 台帳 (横軸=時間 / 縦軸=スタッフ) ===== */}
      <div className="thin-scrollbar relative flex-1 select-none overflow-auto bg-background">
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
                {resolveForStaff(s.id).map((r) => (
                  <ReservationBlock
                    key={r.id}
                    reservation={r}
                    pxPerMin={pxPerMin}
                    dragging={preview?.id === r.id}
                    onBodyPointerDown={(e) => startDrag(e, r, "move")}
                    onResizePointerDown={(e) => startDrag(e, r, "resize")}
                  />
                ))}
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
        onCreate={handleCreate}
      />
      <ReservationDetailDialog
        reservation={detailRes}
        onOpenChange={(o) => !o && setDetailId(null)}
        onUpdate={updateRes}
        onDelete={deleteRes}
      />
    </div>
  );
}
