// 日毎メモのモックデータ。store_id + 日付で分離。
// scope=STORE は店舗全体、PERSONAL は所有者本人のみ表示。

import { dateKey, STORE, CURRENT_USER } from "./mock-data";

export type MemoScope = "STORE" | "PERSONAL";
export type MemoColor = "red" | "blue" | "yellow" | "green";

export interface DailyMemo {
  id: string;
  storeId: string;
  dateKey: string;
  scope: MemoScope;
  ownerId?: string; // PERSONAL の所有者
  allDay: boolean;
  time?: number; // 時間指定メモ(0時からの分)。allDay=false のとき使用
  color: MemoColor;
  text: string;
}

export const MEMO_COLOR_META: Record<MemoColor, { label: string; dot: string; chip: string }> = {
  red: { label: "注意", dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700 border-rose-200" },
  blue: { label: "共有", dot: "bg-sky-500", chip: "bg-sky-50 text-sky-700 border-sky-200" },
  yellow: { label: "VIP", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 border-amber-200" },
  green: { label: "業務連絡", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function buildSeed(): DailyMemo[] {
  const today = dateKey(new Date());
  return [
    { id: "m1", storeId: STORE.id, dateKey: today, scope: "STORE", allDay: false, time: 18 * 60, color: "yellow", text: "VIP来店（小林様）ドリンク準備" },
    { id: "m2", storeId: STORE.id, dateKey: today, scope: "STORE", allDay: false, time: 14 * 60, color: "blue", text: "全体MTG（バックヤード）" },
    { id: "m3", storeId: STORE.id, dateKey: today, scope: "STORE", allDay: true, color: "green", text: "新人(高橋)同行日。フォローお願いします" },
    { id: "m4", storeId: STORE.id, dateKey: today, scope: "STORE", allDay: true, color: "red", text: "16時〜 カラー機メンテのため1台使用不可" },
    { id: "m5", storeId: STORE.id, dateKey: today, scope: "PERSONAL", ownerId: CURRENT_USER.id, allDay: false, time: 19 * 60, color: "red", text: "発注の締め切り確認" },
  ];
}

export const SEED_MEMOS: DailyMemo[] = buildSeed();
