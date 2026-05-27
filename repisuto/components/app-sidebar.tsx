"use client";

import * as React from "react";
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
  Link2,
  Database,
  UserCog,
  CalendarClock,
  CalendarRange,
  ClipboardList,
  MapPin,
  Scissors,
  Gift,
  Plug,
  Wrench,
  Sparkles,
  ChevronDown,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Leaf = { label: string; href: string };
type NavItem = { label: string; icon: typeof CalendarDays; href?: string; children?: Leaf[] };

const NAV: NavItem[] = [
  { label: "予約台帳", icon: CalendarDays, href: "/reservations" },
  { label: "顧客", icon: Users, href: "/customers" },
  { label: "カルテ", icon: FileText, href: "/records" },
  { label: "会計", icon: Receipt, href: "/pos" },
  { label: "回数券", icon: Ticket, href: "/tickets" },
  { label: "ポイント", icon: Gift, href: "/points" },
  {
    label: "LINE",
    icon: MessageCircle,
    children: [
      { label: "状態別配信", href: "/line/state-delivery" },
      { label: "セグメント配信", href: "/line/segments" },
      { label: "シナリオ配信", href: "/line/scenarios" },
      { label: "一斉配信", href: "/line/broadcast" },
      { label: "自動応答", href: "/line/auto-reply" },
      { label: "テンプレート", href: "/line/templates" },
      { label: "マイページ（プレビュー）", href: "/line/mypage" },
    ],
  },
  { label: "KPI分析", icon: BarChart3, href: "/analytics" },
  {
    label: "強制リンク作成",
    icon: Link2,
    children: [
      { label: "リンク作成・一括作成", href: "/links" },
      { label: "個人情報入力テンプレート", href: "/links/personal-info" },
      { label: "確認画面テンプレート", href: "/links/confirm" },
      { label: "サンクスページテンプレート", href: "/links/thanks" },
      { label: "リマインドテンプレート", href: "/links/reminder" },
      { label: "タグテンプレート", href: "/links/tags" },
    ],
  },
  { label: "回答フォーム作成", icon: ClipboardList, href: "/forms" },
  { label: "メニュー作成", icon: Scissors, href: "/menus" },
  { label: "Googleマップ", icon: MapPin, href: "/google-business" },
  {
    label: "基本マスター",
    icon: Database,
    children: [
      { label: "ブランドマスター", href: "/master/brands" },
      { label: "店舗マスター", href: "/master/stores" },
      { label: "顧客タグマスター", href: "/master/customer-tags" },
      { label: "メニューカテゴリー", href: "/master/menu-categories" },
      { label: "メニューマスター", href: "/master/menus" },
      { label: "売上カテゴリー", href: "/master/sales-categories" },
      { label: "売上メニュー", href: "/master/sales-menus" },
      { label: "決済種別マスター", href: "/master/payment-types" },
      { label: "口コミ種別マスター", href: "/master/review-types" },
      { label: "キャンセル理由マスター", href: "/master/cancel-reasons" },
    ],
  },
  { label: "スタッフ登録", icon: UserCog, href: "/staff" },
  { label: "出勤表", icon: CalendarRange, href: "/staff/shifts" },
  { label: "予約開放設定", icon: CalendarClock, href: "/staff/reservation-opening" },
  { label: "外部連携", icon: Plug, href: "/integrations" },
  { label: "メンテナンス", icon: Wrench, href: "/maintenance" },
];

const ALL_HREFS = NAV.flatMap((i) => (i.children ? i.children.map((c) => c.href) : [i.href!]));

export function AppSidebar() {
  const pathname = usePathname();
  const best = ALL_HREFS.filter((h) => pathname === h || pathname.startsWith(h + "/")).sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === best;

  return (
    <aside className="flex w-[230px] shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-16 shrink-0 items-center gap-2 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-wide">リピスト</div>
          <div className="text-[10px] text-muted-foreground">再来特化型 CRM</div>
        </div>
      </div>

      <nav className="thin-scrollbar flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {NAV.map((item) => (item.children ? <Group key={item.label} item={item} isActive={isActive} /> : <TopLink key={item.label} item={item} active={isActive(item.href!)} />))}
      </nav>

      <div className="shrink-0 border-t border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">店長</div>
          <div className="leading-tight">
            <div className="text-xs font-medium">佐々木 マネージャー</div>
            <div className="text-[10px] text-muted-foreground">MANAGER</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href!}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-secondary hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function Group({ item, isActive }: { item: NavItem; isActive: (href: string) => boolean }) {
  const Icon = item.icon;
  const hasActive = item.children!.some((c) => isActive(c.href));
  const [open, setOpen] = React.useState(hasActive);
  React.useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          hasActive ? "text-primary" : "text-foreground/70 hover:bg-secondary hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        {item.label}
        <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mb-1 ml-4 space-y-0.5 border-l border-border pl-3">
          {item.children!.map((c) => {
            const active = isActive(c.href);
            return (
              <Link
                key={c.href}
                href={c.href}
                className={cn(
                  "block rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                  active ? "bg-primary/10 font-medium text-primary" : "text-foreground/65 hover:bg-secondary hover:text-foreground"
                )}
              >
                {c.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
