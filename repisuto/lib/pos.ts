// 会計(チェックアウト)のモックデータ・型・計算ロジック。
// 金額はすべて税込で扱い、税抜/税は逆算して表示する。

import { menuById, ticketRemainingTotal, type Customer, type Reservation } from "./mock-data";
import { aiStrategy, jpDate, TODAY } from "./customer-data";

export const TAX_RATE = 0.1;

export interface CatalogItem {
  id: string;
  name: string;
  price: number;
}

export const PRODUCTS: CatalogItem[] = [
  { id: "p_shampoo", name: "シャンプー(サロン専売)", price: 3300 },
  { id: "p_treat", name: "洗い流さないトリートメント", price: 4400 },
  { id: "p_styling", name: "スタイリング剤", price: 2200 },
  { id: "p_serum", name: "美容液", price: 6600 },
];

export const OPTIONS: CatalogItem[] = [
  { id: "o_spa", name: "炭酸スパ", price: 1100 },
  { id: "o_brow", name: "眉カット", price: 1650 },
  { id: "o_head", name: "ヘッドマッサージ10分", price: 1100 },
];

export interface Coupon {
  id: string;
  name: string;
  kind: "percent" | "amount";
  value: number;
}
export const COUPONS: Coupon[] = [
  { id: "c_first", name: "初回20%OFF", kind: "percent", value: 20 },
  { id: "c_line", name: "LINE友だち ¥500OFF", kind: "amount", value: 500 },
  { id: "c_bday", name: "誕生月10%OFF", kind: "percent", value: 10 },
];

export interface TicketPlan {
  id: string;
  name: string;
  price: number;
  count: number;
  validMonths: number;
  menus: string;
}
export const TICKET_PLANS: TicketPlan[] = [
  { id: "t_cut10", name: "カット10回券", price: 40000, count: 10, validMonths: 12, menus: "カット" },
  { id: "t_color6", name: "カラー6回券", price: 36000, count: 6, validMonths: 12, menus: "カラー" },
  { id: "t_spa5", name: "スパ5回券", price: 25000, count: 5, validMonths: 6, menus: "ヘッドスパ" },
  { id: "t_face4", name: "フェイシャル4回券", price: 36000, count: 4, validMonths: 6, menus: "フェイシャル" },
];

export const MEMBERSHIP_PLANS: CatalogItem[] = [
  { id: "m_standard", name: "スタンダード会員(月額)", price: 11000 },
  { id: "m_premium", name: "プレミアム会員(月額)", price: 22000 },
];
export const ENROLLMENT_FEE = 3300; // 入会金
export const REFERRAL_DISCOUNT = 1000; // 紹介特典

export type LineKind =
  | "menu"
  | "product"
  | "option"
  | "ticketUse"
  | "ticketBuy"
  | "membership"
  | "enrollment"
  | "discount"
  | "coupon"
  | "referral";

export interface LineItem {
  id: string;
  kind: LineKind;
  name: string;
  amount: number; // 税込・割引はマイナス
}

export const LINE_KIND_LABEL: Record<LineKind, string> = {
  menu: "施術",
  product: "店販",
  option: "オプション",
  ticketUse: "回数券消化",
  ticketBuy: "回数券購入",
  membership: "サブスク",
  enrollment: "入会金",
  discount: "値引き",
  coupon: "クーポン",
  referral: "紹介特典",
};

export type PaymentMethod = "現金" | "クレジット" | "PayPay" | "QR";
export const PAYMENT_METHODS: PaymentMethod[] = ["現金", "クレジット", "PayPay", "QR"];

export interface Payment {
  method: PaymentMethod;
  amount: number;
}

export function initialLines(r: Reservation): LineItem[] {
  return r.menuIds.map((id, i) => {
    const m = menuById(id);
    return { id: `menu-${i}`, kind: "menu" as LineKind, name: m?.name ?? "施術", amount: m?.price ?? 0 };
  });
}

export interface Totals {
  total: number; // 税込合計
  taxExcluded: number;
  tax: number;
  tech: number; // 技術売上(施術+オプション)
  retail: number; // 店販売上
  ticket: number; // 回数券売上
  membership: number; // 会員・入会金
}

export function computeTotals(lines: LineItem[]): Totals {
  const sumKind = (kinds: LineKind[]) =>
    lines.filter((l) => kinds.includes(l.kind)).reduce((s, l) => s + l.amount, 0);
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const taxExcluded = Math.round(total / (1 + TAX_RATE));
  return {
    total,
    taxExcluded,
    tax: total - taxExcluded,
    tech: sumKind(["menu", "option"]),
    retail: sumKind(["product"]),
    ticket: sumKind(["ticketBuy"]),
    membership: sumKind(["membership", "enrollment"]),
  };
}

export const yen = (n: number) => `${n < 0 ? "-" : ""}¥${Math.abs(n).toLocaleString()}`;

// ===== 会計後 AI提案 =====
export interface CheckoutAI {
  churnRisk: "低" | "中" | "高";
  needsFollow: boolean;
  nextVisitRecommend: string;
  recommendedTicket: string;
  lineMessage: string;
  nextProposal: string;
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function checkoutAI(c: Customer): CheckoutAI {
  const ai = aiStrategy(c);
  const interval = c.messageTags.includes("フェイシャル") || c.tags.includes("VIP") ? 28 : 35;
  const rec = addDaysISO(TODAY, interval);
  const recTicket =
    c.messageTags.find((t) => t.includes("フェイシャル"))
      ? "フェイシャル4回券"
      : c.messageTags.includes("カラー")
      ? "カラー6回券"
      : c.messageTags.includes("スパ")
      ? "スパ5回券"
      : "カット10回券";
  const needsFollow = ticketRemainingTotal(c) <= 1 || !c.nextVisitDate;
  return {
    churnRisk: ai.churnRisk,
    needsFollow,
    nextVisitRecommend: jpDate(rec),
    recommendedTicket: recTicket,
    lineMessage: `${c.name.split(" ")[0]}様、本日はありがとうございました！次回は${jpDate(rec)}頃が目安です。ご予約お待ちしています🌿`,
    nextProposal: ai.nextBestAction,
  };
}
