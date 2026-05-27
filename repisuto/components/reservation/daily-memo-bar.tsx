"use client";

import * as React from "react";
import { Plus, User, Trash2, StickyNote } from "lucide-react";

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
import { OPEN_MIN, CLOSE_MIN, minToLabel } from "@/lib/time";
import { CURRENT_USER, STORE } from "@/lib/mock-data";
import {
  MEMO_COLOR_META,
  type DailyMemo,
  type MemoColor,
  type MemoScope,
} from "@/lib/memos";

const TIME_OPTIONS = (() => {
  const arr: number[] = [];
  for (let m = OPEN_MIN; m <= CLOSE_MIN; m += 30) arr.push(m);
  return arr;
})();

const COLORS: MemoColor[] = ["red", "blue", "yellow", "green"];

interface Props {
  memos: DailyMemo[]; // 表示対象(店舗+日付+可視性で絞り込み済み)
  dateKey: string;
  onSave: (memo: DailyMemo) => void;
  onDelete: (id: string) => void;
}

export function DailyMemoBar({ memos, dateKey, onSave, onDelete }: Props) {
  const [editing, setEditing] = React.useState<DailyMemo | null>(null);
  const [open, setOpen] = React.useState(false);

  const sorted = React.useMemo(
    () =>
      [...memos].sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return (a.time ?? 0) - (b.time ?? 0);
      }),
    [memos]
  );

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(m: DailyMemo) {
    setEditing(m);
    setOpen(true);
  }

  return (
    <div className="flex items-center gap-2 border-b border-border bg-card px-5 py-2">
      <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground">
        <StickyNote className="h-3.5 w-3.5" />
        本日のメモ
      </span>

      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        {sorted.length === 0 && (
          <span className="text-[11px] text-muted-foreground/70">メモはありません</span>
        )}
        {sorted.map((m) => {
          const meta = MEMO_COLOR_META[m.color];
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => openEdit(m)}
              className={cn(
                "inline-flex max-w-[260px] items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-opacity hover:opacity-80",
                meta.chip
              )}
              title={m.text}
            >
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
              {m.scope === "PERSONAL" && <User className="h-2.5 w-2.5 shrink-0 opacity-70" />}
              <span className="shrink-0 font-semibold tabular-nums">
                {m.allDay ? "終日" : `${minToLabel(m.time ?? OPEN_MIN)}〜`}
              </span>
              <span className="truncate">{m.text}</span>
            </button>
          );
        })}
      </div>

      <Button variant="outline" size="sm" className="ml-auto shrink-0" onClick={openNew}>
        <Plus className="h-4 w-4" /> メモ
      </Button>

      <MemoDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        dateKey={dateKey}
        onSave={onSave}
        onDelete={onDelete}
      />
    </div>
  );
}

function MemoDialog({
  open,
  onOpenChange,
  editing,
  dateKey,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: DailyMemo | null;
  dateKey: string;
  onSave: (m: DailyMemo) => void;
  onDelete: (id: string) => void;
}) {
  const [scope, setScope] = React.useState<MemoScope>("STORE");
  const [allDay, setAllDay] = React.useState(false);
  const [time, setTime] = React.useState(14 * 60);
  const [color, setColor] = React.useState<MemoColor>("blue");
  const [text, setText] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setScope(editing?.scope ?? "STORE");
      setAllDay(editing?.allDay ?? false);
      setTime(editing?.time ?? 14 * 60);
      setColor(editing?.color ?? "blue");
      setText(editing?.text ?? "");
    }
  }, [open, editing]);

  function handleSave() {
    if (!text.trim()) return;
    onSave({
      id: editing?.id ?? `mem${Date.now()}`,
      storeId: STORE.id,
      dateKey,
      scope,
      ownerId: scope === "PERSONAL" ? CURRENT_USER.id : undefined,
      allDay,
      time: allDay ? undefined : time,
      color,
      text: text.trim(),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "メモを編集" : "メモを追加"}</DialogTitle>
          <DialogDescription>その日の連絡事項を記録します</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>公開範囲</Label>
            <div className="flex overflow-hidden rounded-md border border-border">
              {(
                [
                  { v: "STORE", label: "店舗全体" },
                  { v: "PERSONAL", label: "個人（自分のみ）" },
                ] as { v: MemoScope; label: string }[]
              ).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setScope(o.v)}
                  className={cn(
                    "flex-1 px-2 py-1.5 text-xs font-medium transition-colors",
                    scope === o.v
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>タイミング</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                終日
              </label>
              {!allDay && (
                <select
                  value={time}
                  onChange={(e) => setTime(Number(e.target.value))}
                  className="h-9 rounded-md border border-input bg-card px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TIME_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {minToLabel(m)}〜
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>色分け</Label>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => {
                const meta = MEMO_COLOR_META[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                      color === c ? meta.chip : "border-border text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>内容</Label>
            <Input
              placeholder="例：18:00〜 VIP来店 / 機械メンテ / 早退"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {editing ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                onDelete(editing.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-4 w-4" /> 削除
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={!text.trim()}>
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
