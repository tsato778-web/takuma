import { describe, expect, it } from "vitest";
import {
  DEFAULT_YEAR_AXIS,
  joinFiscalYearOf,
  offerYearOf,
  yearLabel,
  yearRange,
} from "@/lib/fiscal-year";

/** JST の日時を UTC の Date として作る */
const jst = (iso: string) => new Date(`${iso}+09:00`);

describe("年度の集計軸（A-5）", () => {
  it("既定の集計軸は内定日ベース", () => {
    expect(DEFAULT_YEAR_AXIS).toBe("offer_year");
  });

  describe("内定年（暦年 1〜12月）", () => {
    it("年始・年末を JST で判定する", () => {
      expect(offerYearOf(jst("2026-01-01T00:00:00"))).toBe(2026);
      expect(offerYearOf(jst("2026-12-31T23:59:59"))).toBe(2026);
    });

    it("JST で年をまたぐ境界を取り違えない", () => {
      // UTC では 2025-12-31T15:00Z だが JST では 2026-01-01
      expect(offerYearOf(new Date("2025-12-31T15:00:00Z"))).toBe(2026);
    });

    it("内定日が無ければ null", () => {
      expect(offerYearOf(null)).toBeNull();
    });
  });

  describe("入社年度（4月始まり）", () => {
    it("3月入社は前年度、4月入社は当年度", () => {
      expect(joinFiscalYearOf(jst("2026-03-31T00:00:00"))).toBe(2025);
      expect(joinFiscalYearOf(jst("2026-04-01T00:00:00"))).toBe(2026);
    });

    it("開始月を変更できる", () => {
      expect(joinFiscalYearOf(jst("2026-03-31T00:00:00"), 1)).toBe(2026);
    });

    it("入社日が無ければ null", () => {
      expect(joinFiscalYearOf(undefined)).toBeNull();
    });
  });

  describe("期間の算出", () => {
    it("内定年は 1/1 00:00 JST から翌年 1/1 00:00 JST まで", () => {
      const { start, end } = yearRange("offer_year", 2026);
      expect(start.toISOString()).toBe("2025-12-31T15:00:00.000Z");
      expect(end.toISOString()).toBe("2026-12-31T15:00:00.000Z");
    });

    it("入社年度は 4/1 00:00 JST から翌年 4/1 00:00 JST まで", () => {
      const { start, end } = yearRange("join_fiscal_year", 2026);
      expect(start.toISOString()).toBe("2026-03-31T15:00:00.000Z");
      expect(end.toISOString()).toBe("2027-03-31T15:00:00.000Z");
    });
  });

  it("表示ラベルが軸ごとに変わる", () => {
    expect(yearLabel("offer_year", 2026)).toBe("2026年内定");
    expect(yearLabel("join_fiscal_year", 2026)).toBe("2026年度入社");
  });
});
