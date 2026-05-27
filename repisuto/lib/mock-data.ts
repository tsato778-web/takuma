// MVP 予約台帳のモックデータ。schema.prisma の構造を簡略化して反映。
// store_id 多店舗前提のため、すべてのエンティティは storeId を持つ。

export type ReservationStatus =
  | "CONFIRMED"
  | "ARRIVED"
  | "DONE"
  | "NO_SHOW"
  | "CANCELED";

export type ReservationSource = "LINE" | "PHONE" | "WALK_IN" | "MANUAL";

// キャンセル種別 (KPI分析用に保持)
export type CancelType = "ADVANCE" | "SAME_DAY" | "NO_SHOW";
export const CANCEL_TYPE_LABEL: Record<CancelType, string> = {
  ADVANCE: "事前キャンセル",
  SAME_DAY: "当日キャンセル",
  NO_SHOW: "無断キャンセル",
};

// コース別カラー (淡い高級感トーン)
export type MenuColor = "blue" | "purple" | "green" | "pink" | "teal" | "amber" | "slate";
export const MENU_COLOR: Record<MenuColor, { tint: string; ring: string; dot: string }> = {
  blue: { tint: "bg-sky-50/90", ring: "ring-sky-200", dot: "bg-sky-400" },
  purple: { tint: "bg-violet-50/90", ring: "ring-violet-200", dot: "bg-violet-400" },
  green: { tint: "bg-emerald-50/90", ring: "ring-emerald-200", dot: "bg-emerald-400" },
  pink: { tint: "bg-pink-50/90", ring: "ring-pink-200", dot: "bg-pink-400" },
  teal: { tint: "bg-teal-50/90", ring: "ring-teal-200", dot: "bg-teal-400" },
  amber: { tint: "bg-amber-50/90", ring: "ring-amber-200", dot: "bg-amber-400" },
  slate: { tint: "bg-card", ring: "ring-border", dot: "bg-slate-400" },
};

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
  gender: "F" | "M";
  firstSource: string; // 初回媒体
  registerMedia: string; // 登録メディア
  funnel: string; // 流入経路(要約)
  tags: string[]; // 顧客タグ
  messageTags: string[]; // LINEメッセージタグ
  ltv: number; // 累計売上
  lastVisitDate: string; // 最終来店日
  nextVisitDate?: string; // 次回予約(日付)
  nextVisitTime?: string; // 次回予約(時刻 HH:MM)
  monthlyMember: { active: boolean; plan?: string }; // 月額会員状況
  lineLinked: boolean; // LineLink の有無
  lineName?: string; // LINE登録名
  tickets: Ticket[]; // ACTIVE な回数券
  visitCount: number;
}

// 登録メディア / 流入経路 / 媒体の選択肢 (フォーム・分析で共用)
export const MEDIA_OPTIONS = ["Instagram", "Meta広告", "Google", "ホットペッパー", "紹介", "公式LINE", "店頭"];

export interface Menu {
  id: string;
  storeId: string;
  name: string;
  durationMin: number; // 施術時間 (売上・コース表示はこちらを使用)
  intervalMin: number; // 施術後のインターバル/準備時間 (台帳占有のみ)
  price: number;
  color: MenuColor;
}

// 店舗設定。メニュー個別にインターバル未設定の場合はこの既定値を使用
export const STORE_SETTINGS = {
  defaultIntervalMin: 0,
};

export const INTERVAL_OPTIONS = [0, 5, 10, 15, 30];

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
  end: number; // 占有終了 (= 施術 + インターバル)
  intervalMin: number; // 末尾のインターバル/準備時間 (台帳占有のみ・売上には含めない)
  status: ReservationStatus;
  cancelType?: CancelType; // status=CANCELED のとき種別を保持 (KPI用)
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
  { id: "menu_cut", storeId: STORE.id, name: "カット", durationMin: 60, intervalMin: 0, price: 4400, color: "blue" },
  { id: "menu_color", storeId: STORE.id, name: "カラー", durationMin: 90, intervalMin: 15, price: 6600, color: "purple" },
  { id: "menu_perm", storeId: STORE.id, name: "パーマ", durationMin: 120, intervalMin: 15, price: 8800, color: "amber" },
  { id: "menu_treat", storeId: STORE.id, name: "トリートメント", durationMin: 30, intervalMin: 0, price: 3300, color: "teal" },
  { id: "menu_spa", storeId: STORE.id, name: "ヘッドスパ", durationMin: 45, intervalMin: 10, price: 5500, color: "green" },
  { id: "menu_face", storeId: STORE.id, name: "フェイシャル", durationMin: 60, intervalMin: 10, price: 9900, color: "pink" },
];

export const CUSTOMERS: Customer[] = [
  { id: "cus_kobayashi", storeId: STORE.id, customerNo: 3, name: "小林 真央", kana: "コバヤシ マオ", phone: "090-9999-0000", gender: "F", firstSource: "Instagram", registerMedia: "公式LINE", funnel: "Instagram → 初回フェイシャル → 回数券 → 月額会員", tags: ["VIP"], messageTags: ["VIP", "乾燥肌", "30代"], ltv: 482000, lastVisitDate: "2026-05-10", nextVisitDate: "2026-06-02", nextVisitTime: "14:00", monthlyMember: { active: true, plan: "プレミアム会員 ¥22,000/月" }, lineLinked: true, lineName: "まお", tickets: [{ name: "スパ5回券", remaining: 4 }], visitCount: 21 },
  { id: "cus_yamada", storeId: STORE.id, customerNo: 8, name: "山田 花子", kana: "ヤマダ ハナコ", phone: "090-1111-2222", gender: "F", firstSource: "Meta広告", registerMedia: "公式LINE", funnel: "Meta広告 → カウンセリングフォーム → カラー → 回数券", tags: ["VIP", "敏感肌"], messageTags: ["敏感肌", "カラー", "40代"], ltv: 256000, lastVisitDate: "2026-05-20", monthlyMember: { active: true, plan: "スタンダード会員 ¥11,000/月" }, lineLinked: true, lineName: "hanako🌸", tickets: [{ name: "カット10回券", remaining: 3 }], visitCount: 12 },
  { id: "cus_takahashi", storeId: STORE.id, customerNo: 12, name: "高橋 健", kana: "タカハシ ケン", phone: "090-7777-8888", gender: "M", firstSource: "ホットペッパー", registerMedia: "Web予約", funnel: "ホットペッパー → 初回カット → カラー", tags: [], messageTags: ["カラー", "30代"], ltv: 132000, lastVisitDate: "2026-04-28", monthlyMember: { active: false }, lineLinked: true, lineName: "ケン", tickets: [{ name: "カラー6回券", remaining: 1 }], visitCount: 8 },
  { id: "cus_nakamura", storeId: STORE.id, customerNo: 15, name: "中村 ゆい", kana: "ナカムラ ユイ", phone: "090-3333-4444", gender: "F", firstSource: "Instagram", registerMedia: "公式LINE", funnel: "Instagram → 学割フォーム → ヘッドスパ", tags: ["学割"], messageTags: ["学割", "20代", "スパ"], ltv: 28600, lastVisitDate: "2026-05-01", monthlyMember: { active: false }, lineLinked: true, lineName: "yui.n", tickets: [], visitCount: 3 },
  { id: "cus_saito", storeId: STORE.id, customerNo: 19, name: "斎藤 美月", kana: "サイトウ ミヅキ", phone: "080-8765-4321", gender: "F", firstSource: "Google", registerMedia: "Web予約", funnel: "Google → 初回カラー → リピート", tags: [], messageTags: ["カラー", "30代"], ltv: 64800, lastVisitDate: "2026-05-15", monthlyMember: { active: false }, lineLinked: true, lineName: "mizuki", tickets: [], visitCount: 5 },
  { id: "cus_kato", storeId: STORE.id, customerNo: 22, name: "加藤 結衣", kana: "カトウ ユイ", phone: "080-2222-3333", gender: "F", firstSource: "紹介", registerMedia: "公式LINE", funnel: "紹介 → 初回フェイシャル → 回数券 → 月額会員", tags: ["紹介"], messageTags: ["肩こり", "紹介", "フェイシャル", "30代"], ltv: 198000, lastVisitDate: "2026-05-18", nextVisitDate: "2026-05-27", nextVisitTime: "14:30", monthlyMember: { active: true, plan: "スタンダード会員 ¥11,000/月" }, lineLinked: true, lineName: "ゆい", tickets: [{ name: "フェイシャル4回券", remaining: 2 }], visitCount: 7 },
  { id: "cus_watanabe", storeId: STORE.id, customerNo: 27, name: "渡辺 あおい", kana: "ワタナベ アオイ", phone: "080-1234-5678", gender: "F", firstSource: "Instagram", registerMedia: "店頭", funnel: "Instagram → 店頭来店 → フェイシャル", tags: ["敏感肌"], messageTags: ["敏感肌", "20代"], ltv: 18700, lastVisitDate: "2026-05-05", monthlyMember: { active: false }, lineLinked: false, tickets: [], visitCount: 2 },
  { id: "cus_ito", storeId: STORE.id, customerNo: 31, name: "伊藤 さくら", kana: "イトウ サクラ", phone: "090-5555-6666", gender: "F", firstSource: "Meta広告", registerMedia: "公式LINE", funnel: "Meta広告 → 初回カウンセリングフォーム → 初回フェイシャル", tags: ["新規"], messageTags: ["新規", "肩こり", "20代"], ltv: 9900, lastVisitDate: "2026-05-27", monthlyMember: { active: false }, lineLinked: false, tickets: [], visitCount: 1 },
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
    intervalMin: 0,
    status: "CONFIRMED",
    source: "MANUAL",
    isNominated: false,
    paid: false,
    hasChart: false,
    ...o,
  });
  return [
    R({ id: "r1", customerId: "cus_yamada", staffId: "stf_tanaka", menuIds: ["menu_cut", "menu_color"], start: 10 * 60, end: 10 * 60 + 165, intervalMin: 15, status: "ARRIVED", source: "LINE", isNominated: true }),
    R({ id: "r2", customerId: "cus_takahashi", staffId: "stf_sato", menuIds: ["menu_cut"], start: 10 * 60 + 30, end: 10 * 60 + 90, source: "PHONE" }),
    R({ id: "r3", customerId: "cus_ito", staffId: "stf_suzuki", menuIds: ["menu_face"], start: 12 * 60 + 30, end: 13 * 60 + 40, intervalMin: 10, source: "WALK_IN" }),
    R({ id: "r4", customerId: "cus_nakamura", staffId: "stf_tanaka", menuIds: ["menu_spa"], start: 13 * 60, end: 13 * 60 + 55, intervalMin: 10, status: "DONE", source: "LINE", hasChart: true }),
    R({ id: "r5", customerId: "cus_kobayashi", staffId: "stf_takahashi", menuIds: ["menu_treat"], start: 11 * 60, end: 11 * 60 + 30, status: "DONE", paid: true, hasChart: true }),
    R({ id: "r6", customerId: "cus_kato", staffId: "stf_suzuki", menuIds: ["menu_perm"], start: 14 * 60 + 30, end: 16 * 60 + 45, intervalMin: 15, source: "LINE", isNominated: true }),
    R({ id: "r7", customerId: "cus_saito", staffId: "stf_sato", menuIds: ["menu_color"], start: 15 * 60, end: 16 * 60 + 45, intervalMin: 15, source: "PHONE" }),
    R({ id: "r8", customerId: "cus_watanabe", staffId: "stf_tanaka", menuIds: ["menu_face"], start: 16 * 60, end: 17 * 60 + 10, intervalMin: 10, source: "WALK_IN" }),
    // 重複(ダブルブッキング)のサンプル: 鈴木の r3 と時間が重なる
    R({ id: "r9", customerId: "cus_takahashi", staffId: "stf_suzuki", menuIds: ["menu_cut"], start: 13 * 60, end: 14 * 60, source: "MANUAL" }),
    // キャンセル履歴のサンプル(当日キャンセル)
    R({ id: "rc1", customerId: "cus_kobayashi", staffId: "stf_sato", menuIds: ["menu_spa"], start: 13 * 60 + 30, end: 14 * 60 + 15, status: "CANCELED", cancelType: "SAME_DAY", source: "LINE" }),
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

// 新規顧客判定 (来店1回以下 or 新規タグ)。台帳で強調表示する
export const isNewCustomer = (c: Customer | undefined): boolean =>
  !!c && (c.visitCount <= 1 || c.tags.includes("新規"));

// 離反リスク判定: 回数券残なし AND 次回予約なし → 要フォロー
export const isChurnRisk = (c: Customer): boolean =>
  ticketRemainingTotal(c) === 0 && !c.nextVisitDate;

// コース別カラー (先頭メニュー基準)。メニュー未設定は slate
export const reservationColor = (r: Reservation): MenuColor =>
  menuById(r.menuIds[0] ?? "")?.color ?? "slate";

// 顧客予約画面(◯×)での枠占有判定。キャンセルは空き枠として再解放する
export const occupiesSlot = (r: Reservation): boolean => r.status !== "CANCELED";

// 施術本体の終了時刻 (占有終了 - インターバル)
export const serviceEndOf = (r: Reservation): number => r.end - (r.intervalMin ?? 0);

// 選択メニューからインターバルを推定 (最大値・未設定は店舗既定)
export function suggestedInterval(menuIds: string[]): number {
  const vals = menuIds.map((id) => menuById(id)?.intervalMin ?? STORE_SETTINGS.defaultIntervalMin);
  return vals.length ? Math.max(...vals) : STORE_SETTINGS.defaultIntervalMin;
}

// 2枠が同一スタッフで時間的に重複しているか (占有時間=インターバル込みで判定)
export function slotsOverlap(a: Reservation, b: Reservation): boolean {
  return (
    a.id !== b.id &&
    a.staffId === b.staffId &&
    occupiesSlot(a) &&
    occupiesSlot(b) &&
    a.start < b.end &&
    b.start < a.end
  );
}

// target と重複する既存枠を返す (二重予約の警告に使用)。お客様側は重複不可、管理画面は警告付きで許可
export function findConflicts(target: Reservation, slots: Reservation[]): Reservation[] {
  return slots.filter((s) => slotsOverlap(target, s));
}

// 枠のタイトル表示(予約は顧客名、それ以外は種別ラベル/カスタムラベル)
export function blockTitle(r: Reservation): string {
  if (r.kind === "RESERVATION") return customerById(r.customerId ?? "")?.name ?? "(顧客未設定)";
  if (r.kind === "OTHER") return r.label?.trim() || BLOCK_KIND_LABEL.OTHER;
  return BLOCK_KIND_LABEL[r.kind];
}
