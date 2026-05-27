"use client";

import * as React from "react";
import { Search, Ticket as TicketIcon, MessageCircleOff, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { CUSTOMERS, ticketRemainingTotal, type Customer } from "@/lib/mock-data";

interface Props {
  value: string | null;
  onChange: (id: string) => void;
}

export function CustomerCombobox({ value, onChange }: Props) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const selected = value ? CUSTOMERS.find((c) => c.id === value) : undefined;

  const results = React.useMemo(() => {
    const q = query.trim();
    if (!q) return CUSTOMERS.slice(0, 6);
    return CUSTOMERS.filter(
      (c) => c.name.includes(q) || c.kana.includes(q) || c.phone.includes(q)
    );
  }, [query]);

  function pick(c: Customer) {
    onChange(c.id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="顧客を検索（名前・カナ・電話）"
          value={open ? query : selected ? selected.name : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>

      {selected && !open && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-medium text-foreground">{selected.name}</span>
          <span className="text-muted-foreground">／来店{selected.visitCount}回</span>
          {selected.tags.map((t) => (
            <span
              key={t}
              className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
            >
              {t}
            </span>
          ))}
          {ticketRemainingTotal(selected) > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded bg-accent/12 px-1.5 py-0.5 text-[10px] text-accent">
              <TicketIcon className="h-3 w-3" />
              残{ticketRemainingTotal(selected)}
            </span>
          )}
          {!selected.lineLinked && (
            <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
              <MessageCircleOff className="h-3 w-3" />
              LINE未追加
            </span>
          )}
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg">
          {results.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              該当する顧客がいません
            </div>
          )}
          {results.map((c) => (
            <button
              type="button"
              key={c.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(c)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-secondary"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{c.name}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{c.kana}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {c.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-secondary px-1 py-px text-[9px] text-secondary-foreground"
                    >
                      {t}
                    </span>
                  ))}
                  {ticketRemainingTotal(c) > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] text-accent">
                      <TicketIcon className="h-2.5 w-2.5" />
                      残{ticketRemainingTotal(c)}
                    </span>
                  )}
                  {!c.lineLinked && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-700">
                      <MessageCircleOff className="h-2.5 w-2.5" />
                      LINE未
                    </span>
                  )}
                </div>
              </div>
              {value === c.id && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
