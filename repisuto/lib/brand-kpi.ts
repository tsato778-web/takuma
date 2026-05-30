// KPI カタログ：システムが計算源を持つ標準KPI。
// ブランドごとに Brand.kpis[] でカタログから選択・並び順・目標値/警告値を設定。
// 「業種依存」ではなく「ブランド依存」で表示KPIを切り替える単一ソース。

import { CUSTOMERS } from "./mock-data";
import { repeatRateOverall, reviewRateOverall, referralCountOverall } from "./repeat-rate";
import { churnRiskCount } from "./churn";

export type KpiKind = "rate" | "count" | "yen";

export interface KpiDef {
  key: string;
  label: string;
  kind: KpiKind;
  description: string;
  compute: () => number; // 将来は brandCode で集計範囲を絞る（モックは全体）
}

export const KPI_CATALOG: KpiDef[] = [
  { key: "repeat_rate", label: "次回予約率", kind: "rate", description: "次回予約取得率（全顧客）", compute: () => repeatRateOverall() },
  { key: "churn_risk", label: "離脱リスク人数", kind: "count", description: "離脱危険度★3以上の顧客数", compute: () => churnRiskCount(3) },
  { key: "review_rate", label: "口コミ取得率", kind: "rate", description: "Google/ホットペッパー口コミ取得率", compute: () => reviewRateOverall() },
  { key: "referral_count", label: "紹介発生数", kind: "count", description: "紹介経由顧客数", compute: () => referralCountOverall() },
  { key: "ltv_avg", label: "平均LTV", kind: "yen", description: "1顧客あたりLTV平均", compute: () => avg(CUSTOMERS.map((c) => c.ltv)) },
  { key: "avg_visits", label: "平均来店回数", kind: "count", description: "顧客あたり来店回数", compute: () => avg(CUSTOMERS.map((c) => c.visitCount)) },
  { key: "member_rate", label: "会員化率", kind: "rate", description: "月額会員継続中の顧客率", compute: () => CUSTOMERS.filter((c) => c.monthlyMember.active).length / Math.max(1, CUSTOMERS.length) },
  { key: "ticket_holder_rate", label: "回数券保有率", kind: "rate", description: "回数券保有顧客率", compute: () => CUSTOMERS.filter((c) => c.tickets.length > 0).length / Math.max(1, CUSTOMERS.length) },
  // 将来追加: 解約率 / 入会率 / 契約率 / 失客復帰率 / 月次着地予測 etc.
];

export function kpiByKey(key: string): KpiDef | undefined {
  return KPI_CATALOG.find((k) => k.key === key);
}

export function formatKpiValue(kind: KpiKind, n: number): string {
  if (kind === "rate") return `${Math.round(n * 100)}%`;
  if (kind === "yen") return `¥${Math.round(n).toLocaleString()}`;
  return `${Math.round(n * 10) / 10}`;
}

// 値が「良好/警告/危険」のいずれかをスコアリング（目標達成は緑、警告以下は赤、間は黄）
// rate/yen は「高いほど良い」、count は「churn_risk のみ低いほど良い」+他は高いほど良いと仮定。
export type KpiHealth = "ok" | "warn" | "bad";
export function kpiHealth(key: string, value: number, target: number, warn: number): KpiHealth {
  const lowerIsBetter = key === "churn_risk";
  if (lowerIsBetter) {
    if (value <= target) return "ok";
    if (value <= warn) return "warn";
    return "bad";
  }
  if (value >= target) return "ok";
  if (value >= warn) return "warn";
  return "bad";
}

function avg(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
}
