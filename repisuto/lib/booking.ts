// お客様予約画面（◯×）の空き判定エンジン（将来DBの予約可否ロジック素案）。
// 「店舗営業時間 × 出勤表 × 勤務時間 × 休憩/会議/ブロック × メニュー所要+インターバル ×
//  同時予約可能数 × 対応可能スタッフ × 複数担当 × 予約開放設定 × キャンセル空き」を合成して
//  ◯（予約可能）/△（残りわずか・条件付き）/×（不可）を返す単一ソース。

import {
  STAFF,
  menuById,
  staffById,
  staffHandlesMenu,
  suggestedInterval,
  occupiesSlot,
  nominationOf,
  type Staff,
  type Reservation,
} from "./mock-data";
import { staffFreeForSlot } from "./shifts";
import { CLOSE_MIN } from "./time";

export type SlotMark = "OPEN" | "FEW" | "FULL"; // ◯ / △ / ×
export const MARK_GLYPH: Record<SlotMark, string> = { OPEN: "◯", FEW: "△", FULL: "×" };

export const serviceMinOf = (menuIds: string[]): number =>
  menuIds.reduce((a, id) => a + (menuById(id)?.durationMin ?? 0), 0);
export const occupancyOf = (menuIds: string[]): number =>
  serviceMinOf(menuIds) + suggestedInterval(menuIds);
export const priceOf = (menuIds: string[]): number =>
  menuIds.reduce((a, id) => a + (menuById(id)?.price ?? 0), 0);

// 選択メニュー全てに対応できる在籍スタッフ
export const candidateStaff = (menuIds: string[]): Staff[] =>
  STAFF.filter((s) => s.active && menuIds.every((m) => staffHandlesMenu(s.id, m)));

export interface BookingPolicy {
  candidates: Staff[]; // おまかせ時の割当候補（全メニュー対応・在籍）
  forcedStaff?: Staff; // 強制指名スタッフ（あれば担当固定）
  hasNoneMenu: boolean; // 指名不可メニューを含む
  allowNomination: boolean; // 指名（スタッフ別）タブを出すか
  nominatable: Staff[]; // 指名で選べるスタッフ
}

// 選択メニュー集合から、担当選択のルールを解決する
export function resolveBookingPolicy(menuIds: string[]): BookingPolicy {
  const candidates = candidateStaff(menuIds);
  const policies = menuIds.map((id) => nominationOf(menuById(id)));
  const hasNoneMenu = policies.includes("NONE");
  const forcedMenu = menuIds.map((id) => menuById(id)).find((m) => m && nominationOf(m) === "FORCED");
  const forcedStaff = forcedMenu?.forcedStaffId ? staffById(forcedMenu.forcedStaffId) : undefined;

  let nominatable: Staff[] = [];
  let allowNomination = false;
  if (forcedStaff) {
    nominatable = [forcedStaff];
    allowNomination = true;
  } else if (!hasNoneMenu) {
    nominatable = candidates.filter((s) => s.acceptsNomination);
    allowNomination = nominatable.length > 0;
  }
  return { candidates, forcedStaff, hasNoneMenu, allowNomination, nominatable };
}

// メニューの同時予約可能数の残り（capacity 指定メニューのみ）。null=設備上の制限なし
export function remainingCapacity(
  menuIds: string[],
  start: number,
  end: number,
  dayReservations: Reservation[]
): number | null {
  const caps = menuIds
    .map((id) => menuById(id)?.capacity)
    .filter((c): c is number => typeof c === "number");
  if (caps.length === 0) return null;
  const cap = Math.min(...caps);
  const concurrent = dayReservations.filter(
    (r) => occupiesSlot(r) && r.menuIds.some((m) => menuIds.includes(m)) && start < r.end && r.start < end
  ).length;
  return cap - concurrent;
}

// おまかせ（店舗全体）の◯△×。staffPool = 割当候補。
export function omakaseMark(
  menuIds: string[],
  staffPool: Staff[],
  date: Date,
  start: number,
  dayReservations: Reservation[]
): SlotMark {
  const occ = occupancyOf(menuIds);
  const end = start + occ;
  if (occ <= 0 || end > CLOSE_MIN) return "FULL";
  const pool = staffPool.length;
  const freeN = staffPool.filter((s) => staffFreeForSlot(s.id, date, start, end, dayReservations)).length;
  const rem = remainingCapacity(menuIds, start, end, dayReservations);
  const eff = rem !== null ? Math.min(freeN, rem) : freeN;
  if (eff <= 0) return "FULL";
  // △: 対応可能スタッフが残り1名（候補が複数いる中で）/ 同時予約可能数が残り1枠
  const scarce = (pool >= 2 && freeN === 1) || (rem !== null && eff === 1);
  return scarce ? "FEW" : "OPEN";
}

// 指名（特定スタッフ）の◯△×
export function staffMark(
  staffId: string,
  menuIds: string[],
  date: Date,
  start: number,
  dayReservations: Reservation[]
): SlotMark {
  const occ = occupancyOf(menuIds);
  const end = start + occ;
  if (occ <= 0 || end > CLOSE_MIN) return "FULL";
  if (!menuIds.every((m) => staffHandlesMenu(staffId, m))) return "FULL"; // 対応不可メニュー
  if (!staffFreeForSlot(staffId, date, start, end, dayReservations)) return "FULL";
  const rem = remainingCapacity(menuIds, start, end, dayReservations);
  if (rem !== null && rem <= 0) return "FULL"; // 設備満席
  if (rem !== null && rem === 1) return "FEW"; // 設備が残り1枠
  return "OPEN";
}
