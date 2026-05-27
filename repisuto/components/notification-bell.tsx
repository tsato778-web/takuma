"use client";

import * as React from "react";
import {
  Bell,
  CalendarPlus,
  CalendarClock,
  CalendarX2,
  MessageCircle,
  Wallet,
  FileWarning,
  CheckCheck,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/lib/notifications";

const META: Record<NotificationType, { icon: LucideIcon; label: string; cls: string }> = {
  NEW_RESERVATION: { icon: CalendarPlus, label: "新規予約", cls: "bg-primary/10 text-primary" },
  CHANGE_RESERVATION: { icon: CalendarClock, label: "予約変更", cls: "bg-amber-100 text-amber-600" },
  CANCEL: { icon: CalendarX2, label: "キャンセル", cls: "bg-rose-100 text-rose-600" },
  LINE_MESSAGE: { icon: MessageCircle, label: "LINE", cls: "bg-emerald-100 text-emerald-600" },
  UNPAID: { icon: Wallet, label: "未会計", cls: "bg-rose-100 text-rose-600" },
  NO_CHART: { icon: FileWarning, label: "未カルテ", cls: "bg-slate-100 text-slate-500" },
};

interface Props {
  notifications: AppNotification[];
  onJump: (n: AppNotification) => void;
  onMarkAllRead: () => void;
}

export function NotificationBell({ notifications, onJump, onMarkAllRead }: Props) {
  const [open, setOpen] = React.useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="通知"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-card">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-[360px] overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                通知
                {unread > 0 && (
                  <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">
                    未読 {unread}
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  すべて既読
                </button>
              )}
            </div>

            <div className="max-h-[420px] overflow-auto">
              {notifications.length === 0 && (
                <div className="px-4 py-12 text-center text-xs text-muted-foreground">
                  通知はありません
                </div>
              )}
              {notifications.map((n) => {
                const meta = META[n.type];
                const Icon = meta.icon;
                const jumpable = !!n.reservationId;
                return (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => onJump(n)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-secondary/60",
                      !n.read && "bg-primary/[0.04]"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        meta.cls
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs leading-snug text-foreground">
                        {n.message}
                      </p>
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        {meta.label} · {n.timeLabel}
                        {jumpable && <span className="text-primary/70"> · 予約を表示</span>}
                      </span>
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
