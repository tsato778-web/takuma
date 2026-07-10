// 出勤表・予約開放設定のモックロジック（将来DBテーブル Shift / ReservationOpening の素案）。
// 出勤表ページ・予約開放設定ページ・お客様予約画面（◯×）で共有し、
// 「出勤表 → 予約可否」を一気通貫で判定する単一ソース。
// ※ モックUI: シフトは staffIndex×日付から決定論生成（DB接続後は実シフトに差し替え）。

import { STAFF, occupiesSlot, type Reservation } from "./mock-data";
import { OPEN_MIN, CLOSE_MIN } from "./time";

// ---- 出勤表のシフトコード（出勤表セルの状態） ----
export type ShiftCode = "出" | "休" | "半" | "時" | "会";

export const SHIFT_LABEL: Record<ShiftCode, string> = {
  出: "出勤",
  休: "休み",
  半: "半休",
  時: "時間指定",
  会: "会議",
};

// スタッフ×日から決定論的にシフトを生成（出勤表ページと同一ロジック＝表示が必ず一致する）
export function shiftCodeForIndex(staffIndex: number, date: Date): ShiftCode {
  const dow = date.getDay();
  const seed = (staffIndex * 31 + date.getDate() * 7) % 10;
  if (dow === 0 && seed < 6) return "休";
  if (seed === 0) return "休";
  if (seed === 1) return "半";
  if (seed === 2) return "時";
  return "出";
}

export const staffIndexOf = (staffId: string): number => {
  const i = STAFF.findIndex((s) => s.id === staffId);
  return i < 0 ? 0 : i;
};

export const shiftCodeFor = (staffId: string, date: Date): ShiftCode =>
  shiftCodeForIndex(staffIndexOf(staffId), date);

// ---- 勤務ウィンドウ（0時からの分）。null = その日は受付不可（休み） ----
export interface WorkWindow {
  start: number;
  end: number;
  code: ShiftCode;
}

// 半休=午後のみ / 時間指定=既定窓 / 会議日も受付（会議枠は予約側で別途確保）。DB接続後は実時間に差し替え。
const HALF_DAY_START = 13 * 60; // 13:00
const TIMED_START = 12 * 60; // 12:00
const TIMED_END = 18 * 60; // 18:00

export function workWindowForIndex(staffIndex: number, date: Date): WorkWindow | null {
  const code = shiftCodeForIndex(staffIndex, date);
  switch (code) {
    case "休":
      return null;
    case "半":
      return { start: HALF_DAY_START, end: CLOSE_MIN, code };
    case "時":
      return { start: TIMED_START, end: TIMED_END, code };
    default: // 出 / 会
      return { start: OPEN_MIN, end: CLOSE_MIN, code };
  }
}

export const workWindowFor = (staffId: string, date: Date): WorkWindow | null =>
  workWindowForIndex(staffIndexOf(staffId), date);

// ---- 予約開放設定（予約開放設定ページと共有） ----
export type OpeningRule = "days30" | "days60" | "monthly" | "shift";
export interface OpeningOption {
  id: OpeningRule;
  label: string;
  desc: string;
}
export const OPENING_OPTIONS: OpeningOption[] = [
  { id: "days30", label: "30日先まで予約可能", desc: "常に当日から30日先までを開放" },
  { id: "days60", label: "60日先まで予約可能", desc: "常に当日から60日先までを開放" },
  { id: "monthly", label: "毎月1日に翌月分を開放", desc: "月初にまとめて翌月を開放" },
  { id: "shift", label: "出勤表が登録された日のみ予約可能", desc: "シフト連動。未登録日は受付不可" },
];

// 現在の店舗設定（モック既定値）。DB接続後は店舗設定から取得。
export const CURRENT_OPENING_RULE: OpeningRule = "days30";

function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function dayDiff(from: Date, to: Date): number {
  return Math.round((dateOnly(to).getTime() - dateOnly(from).getTime()) / 86400000);
}

// 開放設定上、その日付が予約受付範囲内か（過去・範囲外は false）。基準日は実行時の「今日」。
export function isDateWithinOpening(
  date: Date,
  rule: OpeningRule = CURRENT_OPENING_RULE,
  today: Date = new Date()
): boolean {
  const diff = dayDiff(today, date);
  if (diff < 0) return false;
  switch (rule) {
    case "days30":
      return diff <= 30;
    case "days60":
      return diff <= 60;
    case "monthly": {
      // 当月＋翌月末まで（簡易）
      const endOfNext = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      return dateOnly(date) <= dateOnly(endOfNext);
    }
    case "shift":
      // シフト連動: 範囲は60日。実際の受付可否は workWindow（出勤日か）で判定する。
      return diff <= 60;
  }
}

// ---- ◯×空き判定（出勤表 × 重複 × 営業時間を合成） ----
// スタッフの当日占有セグメント（担当ブロック単位・キャンセルは空き＝除外）
export interface BusySeg {
  start: number;
  end: number;
}
export function staffBusySegments(staffId: string, dayReservations: Reservation[]): BusySeg[] {
  const segs: BusySeg[] = [];
  for (const r of dayReservations) {
    if (!occupiesSlot(r)) continue; // キャンセルは再解放（空き枠）
    if (r.assignments && r.assignments.length) {
      for (const a of r.assignments) if (a.staffId === staffId) segs.push({ start: a.start, end: a.end });
    } else if (r.staffId === staffId) {
      segs.push({ start: r.start, end: r.end });
    }
  }
  return segs;
}

// スタッフが [start, end) を空けているか（勤務ウィンドウ内 かつ 既存予約と重複なし）
export function staffFreeForSlot(
  staffId: string,
  date: Date,
  start: number,
  end: number,
  dayReservations: Reservation[]
): boolean {
  const win = workWindowFor(staffId, date);
  if (!win) return false; // 休み
  if (start < win.start || end > win.end) return false; // 勤務時間外
  return !staffBusySegments(staffId, dayReservations).some((s) => start < s.end && s.start < end);
}
