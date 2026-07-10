"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CalendarDays,
  CalendarCheck,
  Users,
  FileText,
  Receipt,
  Ticket,
  MessageCircle,
  BarChart3,
  Repeat,
  AlertTriangle,
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
import { BRANDS } from "@/lib/mock-data";
import { useBrand } from "@/lib/brand-context";
import { useCurrentUser } from "@/lib/user-context";
import { hasMin, ROLE_LABEL, ROLE_SHORT, type Role } from "@/lib/permissions";

type Leaf = { label: string; href: string; min?: Role };
type NavItem = { label: string; icon: typeof CalendarDays; href?: string; min?: Role; children?: Leaf[] };

const NAV: NavItem[] = [
  { label: "ホーム", icon: Home, href: "/", min: "STAFF" },
  { label: "次回予約率", icon: Repeat, href: "/repeat", min: "STAFF" },
  { label: "離脱リスク管理", icon: AlertTriangle, href: "/churn-risk", min: "STAFF" },
  { label: "予約台帳", icon: CalendarDays, href: "/reservations", min: "STAFF" },
  { label: "お客様予約（◯×）", icon: CalendarCheck, href: "/booking", min: "STAFF" },
  { label: "顧客", icon: Users, href: "/customers", min: "STAFF" },
  { label: "カルテ", icon: FileText, href: "/records", min: "STAFF" },
  { label: "会計", icon: Receipt, href: "/pos", min: "STAFF" },
  { label: "回数券", icon: Ticket, href: "/tickets", min: "STAFF" },
  { label: "ポイント", icon: Gift, href: "/points", min: "STAFF" },
  {
    label: "LINE",
    icon: MessageCircle,
    children: [
      { label: "自動トリガー", href: "/line/triggers", min: "STORE_ADMIN" },
      { label: "状態別配信", href: "/line/state-delivery", min: "STORE_ADMIN" },
      { label: "セグメント配信", href: "/line/segments", min: "STORE_ADMIN" },
      { label: "シナリオ配信", href: "/line/scenarios", min: "STORE_ADMIN" },
      { label: "一斉配信", href: "/line/broadcast", min: "STORE_ADMIN" },
      { label: "自動応答", href: "/line/auto-reply", min: "STORE_ADMIN" },
      { label: "テンプレート", href: "/line/templates", min: "STORE_ADMIN" },
      { label: "マイページ（プレビュー）", href: "/line/mypage", min: "STAFF" },
    ],
  },
  { label: "KPI分析", icon: BarChart3, href: "/analytics", min: "STORE_ADMIN" },
  {
    label: "強制リンク作成",
    icon: Link2,
    children: [
      { label: "リンク作成・一括作成", href: "/links", min: "BRAND_ADMIN" },
      { label: "個人情報入力テンプレート", href: "/links/personal-info", min: "BRAND_ADMIN" },
      { label: "確認画面テンプレート", href: "/links/confirm", min: "BRAND_ADMIN" },
      { label: "サンクスページテンプレート", href: "/links/thanks", min: "BRAND_ADMIN" },
      { label: "リマインドテンプレート", href: "/links/reminder", min: "BRAND_ADMIN" },
      { label: "タグテンプレート", href: "/links/tags", min: "BRAND_ADMIN" },
    ],
  },
  { label: "回答フォーム作成", icon: ClipboardList, href: "/forms", min: "BRAND_ADMIN" },
  { label: "メニュー作成", icon: Scissors, href: "/menus", min: "STORE_ADMIN" },
  { label: "Googleマップ", icon: MapPin, href: "/google-business", min: "STORE_ADMIN" },
  {
    label: "基本マスター",
    icon: Database,
    children: [
      { label: "企業マスター", href: "/master/companies", min: "SUPER_ADMIN" },
      { label: "ブランドマスター", href: "/master/brands", min: "COMPANY_ADMIN" },
      { label: "店舗マスター", href: "/master/stores", min: "BRAND_ADMIN" },
      { label: "顧客タグマスター", href: "/master/customer-tags", min: "STORE_ADMIN" },
      { label: "メニューカテゴリー", href: "/master/menu-categories", min: "STORE_ADMIN" },
      { label: "メニューマスター", href: "/master/menus", min: "STORE_ADMIN" },
      { label: "売上カテゴリー", href: "/master/sales-categories", min: "STORE_ADMIN" },
      { label: "売上メニュー", href: "/master/sales-menus", min: "STORE_ADMIN" },
      { label: "決済種別マスター", href: "/master/payment-types", min: "STORE_ADMIN" },
      { label: "口コミ種別マスター", href: "/master/review-types", min: "STORE_ADMIN" },
      { label: "キャンセル理由マスター", href: "/master/cancel-reasons", min: "STORE_ADMIN" },
    ],
  },
  { label: "スタッフ登録", icon: UserCog, href: "/staff", min: "STORE_ADMIN" },
  { label: "出勤表", icon: CalendarRange, href: "/staff/shifts", min: "STORE_ADMIN" },
  { label: "予約開放設定", icon: CalendarClock, href: "/staff/reservation-opening", min: "STORE_ADMIN" },
  { label: "外部連携", icon: Plug, href: "/integrations", min: "BRAND_ADMIN" },
  { label: "メンテナンス", icon: Wrench, href: "/maintenance", min: "SUPER_ADMIN" },
];

const ALL_HREFS = NAV.flatMap((i) => (i.children ? i.children.map((c) => c.href) : [i.href!]));

function canSee(role: Role, min?: Role): boolean {
  return hasMin(role, min ?? "STAFF");
}

function filterNav(role: Role): NavItem[] {
  return NAV
    .map((it) => {
      if (it.children) {
        const children = it.children.filter((c) => canSee(role, c.min));
        if (children.length === 0) return null;
        return { ...it, children };
      }
      return canSee(role, it.min) ? it : null;
    })
    .filter((x): x is NavItem => x !== null);
}

export function AppSidebar() {
  const pathname = usePathname();
  const { role } = useCurrentUser();
  const best = ALL_HREFS.filter((h) => pathname === h || pathname.startsWith(h + "/")).sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === best;
  const visibleNav = filterNav(role);

  return (
    <aside className="flex w-[230px] shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-16 shrink-0 items-center gap-2 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-wide">リピスト</div>
          <div className="text-[10px] text-muted-foreground">再来率向上CRM</div>
        </div>
      </div>

      <BrandSwitcher />

      <nav className="thin-scrollbar flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {visibleNav.map((item) => (item.children ? <Group key={item.label} item={item} isActive={isActive} /> : <TopLink key={item.label} item={item} active={isActive(item.href!)} />))}
      </nav>

      <UserRoleSwitcher />
    </aside>
  );
}

function BrandSwitcher() {
  const { brand, setBrandCode } = useBrand();
  return (
    <div className="shrink-0 border-y border-border bg-secondary/30 px-3 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">運用中のブランド</div>
      <select
        value={brand.code}
        onChange={(e) => setBrandCode(e.target.value)}
        className="mt-1 h-7 w-full rounded-md border border-input bg-card px-2 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {BRANDS.map((b) => (
          <option key={b.code} value={b.code}>
            {b.code}・{b.name}
          </option>
        ))}
      </select>
      <div className="mt-1 text-[9px] text-muted-foreground">企業 {brand.companyCode} ／ {industryLabel(brand.industryPreset)}</div>
    </div>
  );
}

function industryLabel(p?: string): string {
  return p === "beauty" ? "美容（雛形）"
    : p === "chiropractic" ? "整体（雛形）"
    : p === "esthetic" ? "エステ（雛形）"
    : p === "pilates" ? "ピラティス（雛形）"
    : p === "membership" ? "会員制（雛形）"
    : "カスタム";
}

function UserRoleSwitcher() {
  const { role, name, setRole } = useCurrentUser();
  const roles: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "BRAND_ADMIN", "STORE_ADMIN", "STAFF", "READONLY"];
  return (
    <div className="shrink-0 border-t border-border px-3 py-3">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">ログイン中（ロール切替）</div>
      <div className="mt-1 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">{name.slice(0, 1)}</div>
        <div className="flex-1 leading-tight">
          <div className="text-xs font-medium">{name}</div>
          <div className="text-[9px] text-muted-foreground">{ROLE_SHORT[role]}</div>
        </div>
      </div>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="mt-1.5 h-7 w-full rounded-md border border-input bg-card px-2 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="ロール切替"
      >
        {roles.map((r) => (
          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
        ))}
      </select>
      <p className="mt-1 text-[9px] text-muted-foreground">※ サイドバーの可視範囲・スタッフ別比較の表示はロールで制御されます。</p>
    </div>
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
