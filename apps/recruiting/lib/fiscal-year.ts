/**
 * 年度の集計軸（設計 A-5）
 *
 * - 既定は「内定日ベース・暦年（1〜12月）」= offer_year
 * - 切替で「入社日ベース・年度（4月始まり）」= join_fiscal_year
 *
 * 候補者テーブルにはこの2つを別列で保持し、内定日・入社日から自動計算する。
 * 日付は UTC で保存し、年度の判定は日本時間（JST）で行う。
 */

export type YearAxis = "offer_year" | "join_fiscal_year";

export const DEFAULT_YEAR_AXIS: YearAxis = "offer_year";

/** 入社年度の開始月（4月始まり）。設定で変更できるようにしておく */
export const FISCAL_YEAR_START_MONTH = 4;

const JST_OFFSET_MINUTES = 9 * 60;

/** UTC の Date を JST の年月日に変換する */
function toJstParts(date: Date): { year: number; month: number; day: number } {
  const jst = new Date(date.getTime() + JST_OFFSET_MINUTES * 60_000);
  return {
    year: jst.getUTCFullYear(),
    month: jst.getUTCMonth() + 1,
    day: jst.getUTCDate(),
  };
}

/**
 * 内定年（暦年 1〜12月）を返す。ダッシュボードの既定軸。
 * 「2026年内定済み」＝ 2026-01-01〜2026-12-31 に内定した候補者。
 */
export function offerYearOf(offeredAt: Date | null | undefined): number | null {
  if (!offeredAt) return null;
  return toJstParts(offeredAt).year;
}

/**
 * 入社年度（4月始まり）を返す。
 * 例：2026-03-31 入社 → 2025年度 / 2026-04-01 入社 → 2026年度
 */
export function joinFiscalYearOf(
  joinDate: Date | null | undefined,
  startMonth: number = FISCAL_YEAR_START_MONTH,
): number | null {
  if (!joinDate) return null;
  const { year, month } = toJstParts(joinDate);
  return month >= startMonth ? year : year - 1;
}

/** 指定した年度の期間（JST基準の開始・終了）を UTC の Date で返す */
export function yearRange(
  axis: YearAxis,
  year: number,
  startMonth: number = FISCAL_YEAR_START_MONTH,
): { start: Date; end: Date } {
  const firstMonth = axis === "offer_year" ? 1 : startMonth;
  const start = new Date(
    Date.UTC(year, firstMonth - 1, 1, 0, 0, 0) - JST_OFFSET_MINUTES * 60_000,
  );
  const end = new Date(
    Date.UTC(year + 1, firstMonth - 1, 1, 0, 0, 0) - JST_OFFSET_MINUTES * 60_000,
  );
  return { start, end };
}

/** 画面表示用のラベル */
export function yearAxisLabel(axis: YearAxis): string {
  return axis === "offer_year" ? "内定年（1〜12月）" : "入社年度（4月始まり）";
}

export function yearLabel(axis: YearAxis, year: number): string {
  return axis === "offer_year" ? `${year}年内定` : `${year}年度入社`;
}

export function isYearAxis(value: string | null | undefined): value is YearAxis {
  return value === "offer_year" || value === "join_fiscal_year";
}
