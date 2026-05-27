"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Users,
  FileText,
  Receipt,
  Ticket,
  MessageCircle,
  BarChart3,
  Settings,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { label: "予約台帳", href: "/reservations", icon: CalendarDays, enabled: true },
  { label: "顧客", href: "/customers", icon: Users, enabled: true },
  { label: "カルテ", href: "/records", icon: FileText, enabled: true },
  { label: "会計", href: "/pos", icon: Receipt, enabled: false },
  { label: "回数券", href: "/tickets", icon: Ticket, enabled: false },
  { label: "LINE", href: "/line", icon: MessageCircle, enabled: false },
  { label: "KPI分析", href: "/analytics", icon: BarChart3, enabled: false },
  { label: "設定", href: "/settings", icon: Settings, enabled: false },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-wide">リピスト</div>
          <div className="text-[10px] text-muted-foreground">再来特化型 CRM</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-3">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          const base =
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
          if (!item.enabled) {
            return (
              <span
                key={item.href}
                className={cn(base, "cursor-not-allowed text-muted-foreground/50")}
                title="準備中"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                base,
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            店長
          </div>
          <div className="leading-tight">
            <div className="text-xs font-medium">佐々木 マネージャー</div>
            <div className="text-[10px] text-muted-foreground">MANAGER</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
