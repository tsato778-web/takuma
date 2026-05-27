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
  customerNo: number; // 顧客No(カルテ番号)。表示は4桁ゼロ埋め
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

// 枠の種別。RESERVATION のみ顧客を伴う。他は「予約不可枠」(ダークアウト表示)
export type BlockKind = "RESERVATION" | "BREAK" | "MEETING" | "BLOCK" | "OTHER";

export interface Reservation {
  id: string;
  storeId: string;
  dateKey: string; // YYYY-MM-DD
  kind: BlockKind;
  customerId?: string; // RESERVATION のみ
  staffId: string;
  menuIds: string[];
  label?: string; // 予約以外の表示ラベル(その他/メモ)
  start: number; // 0時からの分
  end: number;
  status: ReservationStatus;
  source: ReservationSource;
  isNominated: boolean;
  paid: boolean; // 会計済みか (未会計表示用)
  hasChart: boolean; // カルテ記入済みか (未カルテ表示用)
}

export const BLOCK_KIND_LABEL: Record<Exclude<BlockKind, "RESERVATION">, string> = {
  BREAK: "休憩",
  MEETING: "MTG",
  BLOCK: "BLOCK",
  OTHER: "その他",
};

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
  { id: "cus_kobayashi", storeId: STORE.id, customerNo: 3, name: "小林 真央", kana: "コバヤシ マオ", phone: "090-9999-0000", tags: ["VIP"], lineLinked: true, tickets: [{ name: "スパ5回券", remaining: 4 }], visitCount: 21 },
  { id: "cus_yamada", storeId: STORE.id, customerNo: 8, name: "山田 花子", kana: "ヤマダ ハナコ", phone: "090-1111-2222", tags: ["VIP", "敏感肌"], lineLinked: true, tickets: [{ name: "カット10回券", remaining: 3 }], visitCount: 12 },
  { id: "cus_takahashi", storeId: STORE.id, customerNo: 12, name: "高橋 健", kana: "タカハシ ケン", phone: "090-7777-8888", tags: [], lineLinked: true, tickets: [{ name: "カラー6回券", remaining: 1 }], visitCount: 8 },
  { id: "cus_nakamura", storeId: STORE.id, customerNo: 15, name: "中村 ゆい", kana: "ナカムラ ユイ", phone: "090-3333-4444", tags: ["学割"], lineLinked: true, tickets: [], visitCount: 3 },
  { id: "cus_saito", storeId: STORE.id, customerNo: 19, name: "斎藤 美月", kana: "サイトウ ミヅキ", phone: "080-8765-4321", tags: [], lineLinked: true, tickets: [], visitCount: 5 },
  { id: "cus_kato", storeId: STORE.id, customerNo: 22, name: "加藤 結衣", kana: "カトウ ユイ", phone: "080-2222-3333", tags: ["紹介"], lineLinked: true, tickets: [{ name: "フェイシャル4回券", remaining: 2 }], visitCount: 7 },
  { id: "cus_watanabe", storeId: STORE.id, customerNo: 27, name: "渡辺 あおい", kana: "ワタナベ アオイ", phone: "080-1234-5678", tags: ["敏感肌"], lineLinked: false, tickets: [], visitCount: 2 },
  { id: "cus_ito", storeId: STORE.id, customerNo: 31, name: "伊藤 さくら", kana: "イトウ サクラ", phone: "090-5555-6666", tags: ["新規"], lineLinked: false, tickets: [], visitCount: 1 },
];

export function formatCustomerNo(no: number): string {
  return String(no).padStart(4, "0");
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// 「今日」基準でシード予約を生成 (起動時にその日のデータが見える)
function buildSeed(): Reservation[] {
  const today = dateKey(new Date());
  const R = (o: Partial<Reservation> & Pick<Reservation, "id" | "staffId" | "start" | "end">): Reservation => ({
    storeId: STORE.id,
    dateKey: today,
    kind: "RESERVATION",
    menuIds: [],
    status: "CONFIRMED",
    source: "MANUAL",
    isNominated: false,
    paid: false,
    hasChart: false,
    ...o,
  });
  return [
    R({ id: "r1", customerId: "cus_yamada", staffId: "stf_tanaka", menuIds: ["menu_cut", "menu_color"], start: 10 * 60, end: 10 * 60 + 150, status: "ARRIVED", source: "LINE", isNominated: true }),
    R({ id: "r2", customerId: "cus_takahashi", staffId: "stf_sato", menuIds: ["menu_cut"], start: 10 * 60 + 30, end: 10 * 60 + 90, source: "PHONE" }),
    R({ id: "r3", customerId: "cus_ito", staffId: "stf_suzuki", menuIds: ["menu_face"], start: 12 * 60 + 30, end: 13 * 60 + 30, source: "WALK_IN" }),
    R({ id: "r4", customerId: "cus_nakamura", staffId: "stf_tanaka", menuIds: ["menu_spa"], start: 13 * 60, end: 13 * 60 + 45, status: "DONE", source: "LINE", hasChart: true }),
    R({ id: "r5", customerId: "cus_kobayashi", staffId: "stf_takahashi", menuIds: ["menu_treat"], start: 11 * 60, end: 11 * 60 + 30, status: "DONE", paid: true, hasChart: true }),
    R({ id: "r6", customerId: "cus_kato", staffId: "stf_suzuki", menuIds: ["menu_perm"], start: 14 * 60 + 30, end: 16 * 60 + 30, source: "LINE", isNominated: true }),
    R({ id: "r7", customerId: "cus_saito", staffId: "stf_sato", menuIds: ["menu_color"], start: 15 * 60, end: 16 * 60 + 30, source: "PHONE" }),
    R({ id: "r8", customerId: "cus_watanabe", staffId: "stf_tanaka", menuIds: ["menu_face"], start: 16 * 60, end: 17 * 60, source: "WALK_IN" }),
    // 予約不可枠(ダークアウト)のサンプル
    R({ id: "b1", kind: "BREAK", staffId: "stf_sato", start: 12 * 60, end: 13 * 60 }),
    R({ id: "b2", kind: "MEETING", staffId: "stf_suzuki", start: 18 * 60, end: 18 * 60 + 30 }),
    R({ id: "b3", kind: "BLOCK", staffId: "stf_takahashi", start: 16 * 60, end: 18 * 60 }),
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

// ログイン中ユーザー(個人メモの所有者判定などに使用)
export const CURRENT_USER = { id: "user_sasaki", name: "佐々木", role: "MANAGER" as const };

// 枠のタイトル表示(予約は顧客名、それ以外は種別ラベル/カスタムラベル)
export function blockTitle(r: Reservation): string {
  if (r.kind === "RESERVATION") return customerById(r.customerId ?? "")?.name ?? "(顧客未設定)";
  if (r.kind === "OTHER") return r.label?.trim() || BLOCK_KIND_LABEL.OTHER;
  return BLOCK_KIND_LABEL[r.kind];
}
