"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { OPEN_MIN, CLOSE_MIN, minToLabel, addDays } from "@/lib/time";
import { SEED_RESERVATIONS, dateKey, type Staff } from "@/lib/mock-data";
import { isDateWithinOpening, workWindowFor, CURRENT_OPENING_RULE } from "@/lib/shifts";
import { omakaseMark, staffMark, occupancyOf, type SlotMark } from "@/lib/booking";

const SLOT = 15; // 行の粒度（分）
const WD = ["日", "月", "火", "水", "木", "金", "土"];

export interface GridSelection {
  dateKey: string;
  start: number;
}

interface Props {
  weekStart: Date;
  days: number;
  menuIds: string[];
  mode: "omakase" | "staff";
  staffId?: string;
  candidates: Staff[];
  selected: GridSelection | null;
  onPick: (date: Date, start: number) => void;
}

function Glyph({ mark }: { mark: SlotMark }) {
  if (mark === "OPEN") return <span className="text-[15px] font-bold leading-none text-emerald-500">◯</span>;
  if (mark === "FEW") return <span className="text-[15px] font-bold leading-none text-amber-500">△</span>;
  return <span className="text-[15px] font-bold leading-none text-muted-foreground/35">×</span>;
}

export function AvailabilityGrid({ weekStart, days, menuIds, mode, staffId, candidates, selected, onPick }: Props) {
  const today = React.useMemo(() => new Date(), []);
  const occ = occupancyOf(menuIds);

  // 列（日付）ごとの受付可否・予約と、行（時刻）
  const cols = React.useMemo(() => {
    return Array.from({ length: days }, (_, i) => {
      const d = addDays(weekStart, i);
      const dk = dateKey(d);
      const within = isDateWithinOpening(d, CURRENT_OPENING_RULE, today);
      const hasStaff =
        mode === "staff"
          ? !!(staffId && workWindowFor(staffId, d))
          : candidates.some((s) => workWindowFor(s.id, d));
      const dayRes = SEED_RESERVATIONS.filter((r) => r.dateKey === dk);
      return { d, dk, accept: within && hasStaff, within, dayRes };
    });
  }, [weekStart, days, mode, staffId, candidates, today]);

  const rows = React.useMemo(() => {
    const out: number[] = [];
    for (let t = OPEN_MIN; t <= CLOSE_MIN - SLOT; t += SLOT) out.push(t);
    return out;
  }, []);

  function markAt(col: (typeof cols)[number], start: number): SlotMark {
    if (!col.accept) return "FULL";
    return mode === "staff" && staffId
      ? staffMark(staffId, menuIds, col.d, start, col.dayRes)
      : omakaseMark(menuIds, candidates, col.d, start, col.dayRes);
  }

  return (
    <div className="thin-scrollbar max-h-[58vh] overflow-auto rounded-xl border border-border bg-card">
      <table className="border-collapse text-center">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-30 w-14 border-b border-r border-border bg-secondary/60 px-1 py-1.5 text-[10px] font-medium text-muted-foreground">
              時間
            </th>
            {cols.map((c) => {
              const isToday = c.dk === dateKey(today);
              return (
                <th
                  key={c.dk}
                  className={cn(
                    "sticky top-0 z-20 min-w-[42px] border-b border-border px-1 py-1.5",
                    isToday ? "bg-primary/10" : "bg-secondary/60"
                  )}
                >
                  <div
                    className={cn(
                      "text-[10px]",
                      c.d.getDay() === 0 ? "text-rose-500" : c.d.getDay() === 6 ? "text-sky-500" : "text-muted-foreground"
                    )}
                  >
                    {WD[c.d.getDay()]}
                  </div>
                  <div className={cn("text-xs font-semibold tabular-nums", isToday && "text-primary")}>{c.d.getDate()}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((start) => {
            const onHour = start % 60 === 0;
            return (
              <tr key={start} className={cn(onHour && "border-t border-border/70")}>
                <th
                  className={cn(
                    "sticky left-0 z-10 border-r border-border bg-card px-1 text-[10px] tabular-nums",
                    onHour ? "font-semibold text-foreground" : "font-normal text-muted-foreground"
                  )}
                >
                  {minToLabel(start)}
                </th>
                {cols.map((c) => {
                  const mark = markAt(c, start);
                  const sel = selected && selected.dateKey === c.dk && selected.start === start;
                  const clickable = mark !== "FULL";
                  return (
                    <td key={c.dk} className="border-b border-border/30 p-0.5">
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => clickable && onPick(c.d, start)}
                        title={clickable ? `${minToLabel(start)}〜${minToLabel(start + occ)}` : undefined}
                        className={cn(
                          "flex h-7 w-full items-center justify-center rounded transition-colors",
                          sel
                            ? "bg-primary/15 ring-2 ring-primary"
                            : clickable
                            ? "hover:bg-secondary"
                            : "cursor-not-allowed"
                        )}
                      >
                        <Glyph mark={mark} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
