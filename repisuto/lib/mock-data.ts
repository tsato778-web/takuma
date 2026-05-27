// MVP 予約台帳のモックデータ。schema.prisma の構造を簡略化して反映。
// store_id 多店舗前提のため、すべてのエンティティは storeId を持つ。

export type ReservationStatus =
  | "CONFIRMED"
  | "ARRIVED"
  | "DONE"
  | "NO_SHOW"
  | "CANCELED";

export type ReservationSource = "LINE" | "PHONE" | "WALK_IN" | "MANUAL";

export interface Store {
  id: string;
  name: string;
}

export interface Staff {
  id: string;
  storeId: string;
  name: string;
  color: string; // 予約台帳の色 (hex)
  acceptsNomination: boolean;
}

export interface Ticket {
  name: string;
  remaining: number;
}

export interface Customer {
  id: string;
  storeId: string;
  name: string;
  kana: string;
  phone: string;
  tags: string[];
  lineLinked: boolean; // LineLink の有無
  tickets: Ticket[]; // ACTIVE な回数券
  visitCount: number;
}

export interface Menu {
  id: string;
  storeId: string;
  name: string;
  durationMin: number;
  price: number;
}

export interface Reservation {
  id: string;
  storeId: string;
  dateKey: string; // YYYY-MM-DD
  customerId: string;
  staffId: string;
  menuIds: string[];
  start: number; // 0時からの分
  end: number;
  status: ReservationStatus;
  source: ReservationSource;
  isNominated: boolean;
  paid: boolean; // 会計済みか (未会計表示用)
  hasChart: boolean; // カルテ記入済みか (未カルテ表示用)
}

export const STORE: Store = { id: "store_shibuya", name: "渋谷店" };
export const STORES: Store[] = [
  STORE,
  { id: "store_shinjuku", name: "新宿店" },
  { id: "store_ginza", name: "銀座店" },
];

export const STAFF: Staff[] = [
  { id: "stf_tanaka", storeId: STORE.id, name: "田中 美咲", color: "#0ea5b7", acceptsNomination: true },
  { id: "stf_sato", storeId: STORE.id, name: "佐藤 健", color: "#7c6df2", acceptsNomination: true },
  { id: "stf_suzuki", storeId: STORE.id, name: "鈴木 葵", color: "#e8739a", acceptsNomination: true },
  { id: "stf_takahashi", storeId: STORE.id, name: "高橋 涼", color: "#f0a13b", acceptsNomination: false },
];

export const MENUS: Menu[] = [
  { id: "menu_cut", storeId: STORE.id, name: "カット", durationMin: 60, price: 4400 },
  { id: "menu_color", storeId: STORE.id, name: "カラー", durationMin: 90, price: 6600 },
  { id: "menu_perm", storeId: STORE.id, name: "パーマ", durationMin: 120, price: 8800 },
  { id: "menu_treat", storeId: STORE.id, name: "トリートメント", durationMin: 30, price: 3300 },
  { id: "menu_spa", storeId: STORE.id, name: "ヘッドスパ", durationMin: 45, price: 5500 },
  { id: "menu_face", storeId: STORE.id, name: "フェイシャル", durationMin: 60, price: 9900 },
];

export const CUSTOMERS: Customer[] = [
  { id: "cus_yamada", storeId: STORE.id, name: "山田 花子", kana: "ヤマダ ハナコ", phone: "090-1111-2222", tags: ["VIP", "敏感肌"], lineLinked: true, tickets: [{ name: "カット10回券", remaining: 3 }], visitCount: 12 },
  { id: "cus_nakamura", storeId: STORE.id, name: "中村 ゆい", kana: "ナカムラ ユイ", phone: "090-3333-4444", tags: ["学割"], lineLinked: true, tickets: [], visitCount: 3 },
  { id: "cus_ito", storeId: STORE.id, name: "伊藤 さくら", kana: "イトウ サクラ", phone: "090-5555-6666", tags: ["新規"], lineLinked: false, tickets: [], visitCount: 1 },
  { id: "cus_takahashi", storeId: STORE.id, name: "高橋 健", kana: "タカハシ ケン", phone: "090-7777-8888", tags: [], lineLinked: true, tickets: [{ name: "カラー6回券", remaining: 1 }], visitCount: 8 },
  { id: "cus_kobayashi", storeId: STORE.id, name: "小林 真央", kana: "コバヤシ マオ", phone: "090-9999-0000", tags: ["VIP"], lineLinked: true, tickets: [{ name: "スパ5回券", remaining: 4 }], visitCount: 21 },
  { id: "cus_watanabe", storeId: STORE.id, name: "渡辺 あおい", kana: "ワタナベ アオイ", phone: "080-1234-5678", tags: ["敏感肌"], lineLinked: false, tickets: [], visitCount: 2 },
  { id: "cus_saito", storeId: STORE.id, name: "斎藤 美月", kana: "サイトウ ミヅキ", phone: "080-8765-4321", tags: [], lineLinked: true, tickets: [], visitCount: 5 },
  { id: "cus_kato", storeId: STORE.id, name: "加藤 結衣", kana: "カトウ ユイ", phone: "080-2222-3333", tags: ["紹介"], lineLinked: true, tickets: [{ name: "フェイシャル4回券", remaining: 2 }], visitCount: 7 },
];

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// 「今日」基準でシード予約を生成 (起動時にその日のデータが見える)
function buildSeed(): Reservation[] {
  const today = dateKey(new Date());
  return [
    { id: "r1", storeId: STORE.id, dateKey: today, customerId: "cus_yamada", staffId: "stf_tanaka", menuIds: ["menu_cut", "menu_color"], start: 10 * 60, end: 10 * 60 + 150, status: "ARRIVED", source: "LINE", isNominated: true, paid: false, hasChart: false },
    { id: "r2", storeId: STORE.id, dateKey: today, customerId: "cus_takahashi", staffId: "stf_sato", menuIds: ["menu_cut"], start: 10 * 60 + 30, end: 10 * 60 + 90, status: "CONFIRMED", source: "PHONE", isNominated: false, paid: false, hasChart: false },
    { id: "r3", storeId: STORE.id, dateKey: today, customerId: "cus_ito", staffId: "stf_suzuki", menuIds: ["menu_face"], start: 12 * 60 + 30, end: 13 * 60 + 30, status: "CONFIRMED", source: "WALK_IN", isNominated: false, paid: false, hasChart: false },
    { id: "r4", storeId: STORE.id, dateKey: today, customerId: "cus_nakamura", staffId: "stf_tanaka", menuIds: ["menu_spa"], start: 13 * 60, end: 13 * 60 + 45, status: "DONE", source: "LINE", isNominated: false, paid: false, hasChart: true },
    { id: "r5", storeId: STORE.id, dateKey: today, customerId: "cus_kobayashi", staffId: "stf_takahashi", menuIds: ["menu_treat"], start: 11 * 60, end: 11 * 60 + 30, status: "DONE", source: "MANUAL", isNominated: false, paid: true, hasChart: true },
    { id: "r6", storeId: STORE.id, dateKey: today, customerId: "cus_kato", staffId: "stf_suzuki", menuIds: ["menu_perm"], start: 14 * 60 + 30, end: 16 * 60 + 30, status: "CONFIRMED", source: "LINE", isNominated: true, paid: false, hasChart: false },
    { id: "r7", storeId: STORE.id, dateKey: today, customerId: "cus_saito", staffId: "stf_sato", menuIds: ["menu_color"], start: 15 * 60, end: 16 * 60 + 30, status: "CONFIRMED", source: "PHONE", isNominated: false, paid: false, hasChart: false },
    { id: "r8", storeId: STORE.id, dateKey: today, customerId: "cus_watanabe", staffId: "stf_tanaka", menuIds: ["menu_face"], start: 16 * 60, end: 17 * 60, status: "CONFIRMED", source: "WALK_IN", isNominated: false, paid: false, hasChart: false },
  ];
}

export const SEED_RESERVATIONS: Reservation[] = buildSeed();

export const customerById = (id: string) => CUSTOMERS.find((c) => c.id === id);
export const staffById = (id: string) => STAFF.find((s) => s.id === id);
export const menuById = (id: string) => MENUS.find((m) => m.id === id);

export function menuNames(ids: string[]): string {
  return ids.map((id) => menuById(id)?.name ?? "").filter(Boolean).join(" + ");
}

export function ticketRemainingTotal(c: Customer | undefined): number {
  if (!c) return 0;
  return c.tickets.reduce((s, t) => s + t.remaining, 0);
}
