"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate, isSameDay } from "@/lib/time";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function DatePicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) setView(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [open, value]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const y = view.getFullYear();
  const m = view.getMonth();
  const firstWeekday = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div ref={ref} className="relative ml-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-semibold tabular-nums transition-colors hover:bg-secondary"
      >
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        {formatDate(value)}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-border bg-card p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => setView(new Date(y, m - 1, 1))}
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-semibold tabular-nums">
              {y}年{m + 1}月
            </div>
            <button
              onClick={() => setView(new Date(y, m + 1, 1))}
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-[10px] text-muted-foreground">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={cn(i === 0 && "text-rose-500", i === 6 && "text-sky-500")}>
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const cellDate = new Date(y, m, d);
              const isToday = isSameDay(cellDate, today);
              const isSelected = isSameDay(cellDate, value);
              const dow = cellDate.getDay();
              return (
                <button
                  key={i}
                  onClick={() => {
                    onChange(cellDate);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-8 items-center justify-center rounded-md text-xs tabular-nums transition-colors",
                    isSelected
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "hover:bg-secondary",
                    !isSelected && isToday && "font-semibold text-primary ring-1 ring-primary/40",
                    !isSelected && dow === 0 && "text-rose-500",
                    !isSelected && dow === 6 && "text-sky-500"
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              onChange(new Date());
              setOpen(false);
            }}
            className="mt-2 w-full rounded-md border border-border py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary"
          >
            今日へ
          </button>
        </div>
      )}
    </div>
  );
}
