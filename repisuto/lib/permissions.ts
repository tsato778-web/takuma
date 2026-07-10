// 階層権限の土台。マルチテナント前提で、SUPER → COMPANY → BRAND → STORE → STAFF
// の順に強い権限を持つ。スコープ（自企業/自ブランド/自店舗）は今後の拡張で追加し、
// まずは「ロール最低必要レベル」での画面/機能のゲートを実装する。

export type Role =
  | "SUPER_ADMIN"
  | "COMPANY_ADMIN"
  | "BRAND_ADMIN"
  | "STORE_ADMIN"
  | "STAFF"
  | "READONLY";

export const ROLE_RANK: Record<Role, number> = {
  SUPER_ADMIN: 100,
  COMPANY_ADMIN: 80,
  BRAND_ADMIN: 60,
  STORE_ADMIN: 40,
  STAFF: 20,
  READONLY: 10,
};

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin（リピスト運営）",
  COMPANY_ADMIN: "企業オーナー",
  BRAND_ADMIN: "ブランド管理者",
  STORE_ADMIN: "店舗オーナー／店長",
  STAFF: "スタッフ",
  READONLY: "閲覧のみ",
};

export const ROLE_SHORT: Record<Role, string> = {
  SUPER_ADMIN: "SUPER",
  COMPANY_ADMIN: "COMPANY",
  BRAND_ADMIN: "BRAND",
  STORE_ADMIN: "STORE",
  STAFF: "STAFF",
  READONLY: "VIEW",
};

// 最低限のロールを満たすか（rank 比較）
export function hasMin(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

// 機能/画面ごとの最低ロール（仕様の「スタッフへのプレッシャー回避」を集中管理）
export const FEATURE_MIN_ROLE = {
  // ホーム/予約運用：全員アクセス可
  home: "STAFF" as Role,
  reservations: "STAFF" as Role,
  booking: "STAFF" as Role,
  customers: "STAFF" as Role,
  records: "STAFF" as Role,
  pos: "STAFF" as Role,
  tickets: "STAFF" as Role,
  points: "STAFF" as Role,
  churnRisk: "STAFF" as Role,
  // 再来率ダッシュボードは全員可だが、スタッフ別タブのみ後段でゲート
  repeat: "STAFF" as Role,
  // 経営/管理者層
  analytics: "STORE_ADMIN" as Role,
  staffComparison: "STORE_ADMIN" as Role, // スタッフ別比較・稼働率レポート
  lineDelivery: "STORE_ADMIN" as Role,
  menus: "STORE_ADMIN" as Role,
  shifts: "STORE_ADMIN" as Role,
  reservationOpening: "STORE_ADMIN" as Role,
  staffMaster: "STORE_ADMIN" as Role,
  googleBusiness: "STORE_ADMIN" as Role,
  forms: "BRAND_ADMIN" as Role,
  forceLinks: "BRAND_ADMIN" as Role,
  storesMaster: "BRAND_ADMIN" as Role,
  integrations: "BRAND_ADMIN" as Role,
  // ブランド・企業
  brandsMaster: "COMPANY_ADMIN" as Role,
  companiesMaster: "SUPER_ADMIN" as Role,
  maintenance: "SUPER_ADMIN" as Role,
};
export type FeatureKey = keyof typeof FEATURE_MIN_ROLE;
