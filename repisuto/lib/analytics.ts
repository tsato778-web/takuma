// 集計/KPI用のモック取引データと集計関数。
// 2026-04-01〜2026-05-31 の来店取引を決定論的に生成し、期間・軸で集計する。

import { MENUS, STAFF } from "./mock-data";

export interface Txn {
  date: string; // YYYY-MM-DD
  staffId: string;
  menuId: string;
  media: string;
  isNew: boolean;
  collected: number; // 会計済み売上(収受)
  ticketBuy: number; // うち回数券購入売上
  redeem: number; // 回数券消化売上(別計上)
  nextReserved: boolean;
  returned: boolean; // 後日また来店したか(リピート判定)
  payMethod: string; // 主決済種別
}

export const PAY_METHODS = ["現金", "クレジット", "PayPay", "QR", "ホットペッパーポイント", "その他"];
const PAY_W: [string, number][] = [
  ["現金", 0.2],
  ["クレジット", 0.45],
  ["PayPay", 0.12],
  ["QR", 0.1],
  ["ホットペッパーポイント", 0.08],
  ["その他", 0.05],
];

const MEDIA_W: [string, number][] = [
  ["Instagram", 0.28],
  ["Meta広告", 0.2],
  ["ホットペッパー", 0.22],
  ["Google", 0.12],
  ["紹介", 0.1],
  ["公式LINE", 0.05],
  ["店頭", 0.03],
];
const STAFF_NEXT: Record<string, number> = {
  stf_tanaka: 0.72,
  stf_sato: 0.56,
  stf_suzuki: 0.66,
  stf_takahashi: 0.5,
};
const RETAIL_PRICES = [3300, 4400, 2200, 6600];
const TICKET_PRICES = [40000, 36000, 25000];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pickWeighted(r: number, w: [string, number][]) {
  let acc = 0;
  for (const [k, p] of w) {
    acc += p;
    if (r <= acc) return k;
  }
  return w[w.length - 1][0];
}

function build(): Txn[] {
  const txns: Txn[] = [];
  const start = new Date(2026, 3, 1);
  const end = new Date(2026, 4, 31);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dow = d.getDay();
    const r = rng(hash(iso));
    const count = (dow === 0 || dow === 6 ? 8 : 5) + Math.floor(r() * 5);
    for (let i = 0; i < count; i++) {
      const staff = STAFF[Math.floor(r() * STAFF.length)];
      const menu = MENUS[Math.floor(r() * MENUS.length)];
      const media = pickWeighted(r(), MEDIA_W);
      const isNew = r() < 0.25;
      const redeemFlag = r() < 0.15;
      const retail = r() < 0.25 ? RETAIL_PRICES[Math.floor(r() * RETAIL_PRICES.length)] : 0;
      const ticketBuy = r() < 0.08 ? TICKET_PRICES[Math.floor(r() * TICKET_PRICES.length)] : 0;
      const collectedTech = redeemFlag ? 0 : menu.price;
      const collected = collectedTech + retail + ticketBuy;
      const redeem = redeemFlag ? Math.round(menu.price * 0.9) : 0;
      const nextReserved = r() < STAFF_NEXT[staff.id] * (isNew ? 0.8 : 1.05);
      const returned = r() < (isNew ? 0.45 : 0.78) * (STAFF_NEXT[staff.id] / 0.6);
      const payMethod = pickWeighted(r(), PAY_W);
      txns.push({ date: iso, staffId: staff.id, menuId: menu.id, media, isNew, collected, ticketBuy, redeem, nextReserved, returned, payMethod });
    }
  }
  return txns;
}

export const TXNS: Txn[] = build();

export function txnsInRange(from: string, to: string): Txn[] {
  return TXNS.filter((t) => t.date >= from && t.date <= to);
}

export interface Agg {
  visits: number;
  total: number; // 総売上(収受+消化)
  collected: number; // 会計済み売上
  redeem: number; // 消化ベース売上
  ticketBuy: number; // 回数券購入売上
  nextCount: number;
  nextRate: number; // 次回予約率
  repeatCount: number; // 再来(非新規)客数
  returnedCount: number;
  repeatRate: number; // リピート率(後日再来)
  ticketBuyCount: number; // 回数券購入件数
  ticketBuyRate: number; // 回数券購入率
  avgSpend: number;
}

export function aggregate(txns: Txn[]): Agg {
  const visits = txns.length;
  const collected = txns.reduce((s, t) => s + t.collected, 0);
  const redeem = txns.reduce((s, t) => s + t.redeem, 0);
  const ticketBuy = txns.reduce((s, t) => s + t.ticketBuy, 0);
  const total = collected + redeem;
  const nextCount = txns.filter((t) => t.nextReserved).length;
  const repeatCount = txns.filter((t) => !t.isNew).length;
  const returnedCount = txns.filter((t) => t.returned).length;
  const ticketBuyCount = txns.filter((t) => t.ticketBuy > 0).length;
  return {
    visits,
    total,
    collected,
    redeem,
    ticketBuy,
    nextCount,
    nextRate: visits ? Math.round((nextCount / visits) * 100) : 0,
    repeatCount,
    returnedCount,
    repeatRate: visits ? Math.round((returnedCount / visits) * 100) : 0,
    ticketBuyCount,
    ticketBuyRate: visits ? Math.round((ticketBuyCount / visits) * 100) : 0,
    avgSpend: visits ? Math.round(total / visits) : 0,
  };
}

// 決済種別ごとの会計済み売上内訳
export function paymentBreakdown(txns: Txn[]): { method: string; amount: number }[] {
  return PAY_METHODS.map((m) => ({
    method: m,
    amount: txns.filter((t) => t.payMethod === m).reduce((s, t) => s + t.collected, 0),
  }));
}

// リピート率の切り口(全体/初回/再来)
export function repeatBreakdown(txns: Txn[]) {
  const rate = (sub: Txn[]) => (sub.length ? Math.round((sub.filter((t) => t.returned).length / sub.length) * 100) : 0);
  const first = txns.filter((t) => t.isNew);
  const repeat = txns.filter((t) => !t.isNew);
  return {
    overall: rate(txns),
    first: rate(first),
    repeat: rate(repeat),
    firstN: first.length,
    repeatN: repeat.length,
  };
}

export function groupBy(txns: Txn[], key: (t: Txn) => string): { key: string; agg: Agg }[] {
  const map = new Map<string, Txn[]>();
  for (const t of txns) {
    const k = key(t);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  }
  return Array.from(map.entries()).map(([k, ts]) => ({ key: k, agg: aggregate(ts) }));
}

export function dailySeries(txns: Txn[]): { date: string; total: number }[] {
  const map = new Map<string, number>();
  for (const t of txns) map.set(t.date, (map.get(t.date) ?? 0) + t.collected + t.redeem);
  return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, total]) => ({ date, total }));
}
