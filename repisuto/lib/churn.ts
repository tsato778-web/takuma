// 離脱リスクスコアリングエンジン（再来率最大化が思想）。
// 「来店間隔・次回予約有無・LINE開封率・回数券残数・口コミ有無・担当変更履歴」を要素に
// ★1-5のスコアと推定理由・推奨アクションを返す単一ソース。
// ※ モック: LINE開封率は lineLinked の有無で代替（実装時に開封ログから算出）。

import { CUSTOMERS, ticketRemainingTotal, type Customer } from "./mock-data";
import { TODAY, daysBetween } from "./customer-data";

export interface ChurnFactor {
  key: string;
  label: string;
  weight: number;
}
export interface ChurnResult {
  score: number; // 0–5
  reasons: string[];
  actions: string[];
  factors: ChurnFactor[];
  days: number;
}

export function churnScore(c: Customer, today: string = TODAY): ChurnResult {
  const factors: ChurnFactor[] = [];
  const days = daysBetween(c.lastVisitDate, today);
  if (days >= 60) factors.push({ key: "longgap", label: `来店から${days}日経過`, weight: 2 });
  else if (days >= 30) factors.push({ key: "midgap", label: `来店から${days}日経過`, weight: 1 });
  if (!c.nextVisitDate) factors.push({ key: "nonext", label: "次回予約なし", weight: 1 });
  if (!c.lineLinked) factors.push({ key: "noline", label: "LINE未連携（送付不可）", weight: 1 });
  const rem = ticketRemainingTotal(c);
  if (c.tickets.length > 0 && rem === 0) factors.push({ key: "ticket0", label: "回数券 残0", weight: 1 });
  else if (rem === 1) factors.push({ key: "ticket1", label: "回数券 残1", weight: 0.5 });
  const reviewed = c.tags.includes("Google口コミ済") || c.tags.includes("HPB口コミ済");
  if (c.visitCount >= 2 && !reviewed) factors.push({ key: "noreview", label: "口コミ未取得", weight: 0.5 });
  if (c.mainStaffId !== c.firstStaffId) factors.push({ key: "staffchg", label: "担当変更履歴あり", weight: 0.5 });

  const total = factors.reduce((s, f) => s + f.weight, 0);
  const score = Math.min(5, Math.max(0, Math.round(total)));
  const reasons = factors.map((f) => f.label);

  const actions: string[] = [];
  if (factors.some((f) => f.key === "longgap" || f.key === "midgap")) actions.push("LINEで再来促進メッセージを送信");
  if (factors.some((f) => f.key === "nonext")) actions.push("次回予約のクーポン送信");
  if (factors.some((f) => f.key === "ticket1" || f.key === "ticket0")) actions.push("回数券の更新案内");
  if (factors.some((f) => f.key === "staffchg")) actions.push("担当者からの個別フォロー");
  if (factors.some((f) => f.key === "noreview")) actions.push("口コミ依頼テンプレートを送付");
  if (actions.length === 0) actions.push("様子見・通常配信を継続");

  return { score, reasons, actions, factors, days };
}

export function rankedByChurn(): { customer: Customer; result: ChurnResult }[] {
  return CUSTOMERS.map((c) => ({ customer: c, result: churnScore(c) }))
    .sort((a, b) => b.result.score - a.result.score || b.result.factors.length - a.result.factors.length);
}

// 離脱リスク件数（スコア閾値）。ホーム画面KPI用。
export function churnRiskCount(threshold = 3): number {
  return CUSTOMERS.filter((c) => churnScore(c).score >= threshold).length;
}
