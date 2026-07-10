export const OPEN_MIN = 9 * 60; // 09:00
export const CLOSE_MIN = 20 * 60; // 20:00
export const TOTAL_MIN = CLOSE_MIN - OPEN_MIN;

export type Granularity = 15 | 30 | 60;

export const GRAN_CONFIG: Record<Granularity, { slot: number; pxPerMin: number }> = {
  15: { slot: 15, pxPerMin: 2.4 }, // 15分 = 36px / 1時間 = 144px
  30: { slot: 30, pxPerMin: 1.8 }, // 30分 = 54px / 1時間 = 108px
  60: { slot: 60, pxPerMin: 1.2 }, // 60分 = 72px / 1時間 = 72px
};

export function minToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function snapTo(min: number, slot: number): number {
  return Math.round(min / slot) * slot;
}

export function clampMin(min: number): number {
  return Math.max(OPEN_MIN, Math.min(CLOSE_MIN, min));
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function formatDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")} (${WEEKDAYS[d.getDay()]})`;
}

export function addDays(d: Date, days: number): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "YYYY-MM-DD" -> Date (通知からのジャンプで日付を切り替える際に使用) */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 時間ヘッダーに表示する正時の配列 */
export function hourMarks(): number[] {
  const marks: number[] = [];
  for (let m = OPEN_MIN; m <= CLOSE_MIN; m += 60) marks.push(m);
  return marks;
}
