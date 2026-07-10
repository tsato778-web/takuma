# RLS ポリシー定義（store_id 多店舗分離）

> 目的: アプリ層のバグ・実装漏れがあっても、**他店舗のデータが絶対に漏れない**ことを DB レベルで保証する。アプリ層の `where store_id = ?` 注入と合わせた多層防御。

---

## 1. 方針

1. 全業務テーブルで RLS を有効化し、さらに `FORCE ROW LEVEL SECURITY`（テーブル所有者にも適用）。
2. アプリは **非スーパーユーザー**の専用ロール（例 `repisuto_app`）で接続する（スーパーユーザーは RLS をバイパスするため不可）。
3. リクエスト/トランザクションごとに、セッション変数へ「現在許可される店舗集合」を設定する。
   - 一般スタッフ: 現在の 1 店舗
   - OWNER（横断ダッシュボード）: 所属する全店舗
4. ポリシーは「行の `store_id` が許可集合に含まれるか」で判定。

---

## 2. セッション変数とヘルパー関数

トランザクション開始時に、許可店舗 ID をカンマ区切りで設定する（トランザクションローカル）。

```sql
-- アプリが各トランザクション冒頭で実行(transaction-local: 第3引数 true)
SELECT set_config('app.store_ids', $1, true);   -- 例: 'store_aaa,store_bbb'
SELECT set_config('app.user_id',   $2, true);

-- 許可店舗集合を配列で返すヘルパー
CREATE OR REPLACE FUNCTION app_store_ids() RETURNS text[]
LANGUAGE sql STABLE AS $$
  SELECT string_to_array(
    current_setting('app.store_ids', true),  -- 未設定なら NULL(=何も読めない)
    ','
  )
$$;
```
- 未設定（`current_setting(..., true)` が NULL）の場合、`store_id = ANY(NULL)` は常に偽 → **デフォルト deny**。安全側に倒れる。

---

## 3. ポリシーのテンプレート（全業務テーブル共通）

`store_id` を持つテーブルすべてに同型のポリシーを適用する。

```sql
-- 例: Customer
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" FORCE ROW LEVEL SECURITY;

CREATE POLICY customer_isolation ON "Customer"
  USING      ( store_id = ANY (app_store_ids()) )   -- SELECT/UPDATE/DELETE の可視性
  WITH CHECK ( store_id = ANY (app_store_ids()) );  -- INSERT/UPDATE の書込制約
```
- `USING`: 読める/更新できる行を許可集合に限定。
- `WITH CHECK`: 挿入・更新後の `store_id` も許可集合内であることを強制（他店舗への書込みを防止）。

### 適用対象テーブル
`Store, StoreMembership, Staff, Customer, MedicalRecord, RecordPhoto, Consent,`
`MenuCategory, Menu, Resource, Reservation, ReservationItem, Visit,`
`Sale, SaleItem, Payment, Product, TicketPlan, CustomerTicket, TicketUsage,`
`PrepaidBalance, LineAccount, LineLink, MessageTemplate, Campaign,`
`ReminderRule, MessageLog, KpiDaily, AuditLog`

> `Store` 自体は `id = ANY(app_store_ids())` でポリシーを書く（列名が `id`）。`Tenant` / `User` はグローバル扱いだが、認証経路を限定し、テナント階層導入時に `tenant_id` ベースのポリシーへ拡張する。

---

## 4. 子テーブルの「親と同一店舗」担保（堅牢化・任意）

RLS は「許可集合に含まれるか」までは守るが、「子の `store_id` が親と一致するか」は別問題。これを DB で強制したい場合、複合一意キー + 複合外部キーを使う。

```sql
-- 親に複合ユニーク
ALTER TABLE "Reservation" ADD CONSTRAINT reservation_id_store_uq UNIQUE (id, store_id);

-- 子の FK を (id, store_id) で参照 → 異なる店舗の親を参照できない
ALTER TABLE "ReservationItem"
  ADD CONSTRAINT reservation_item_same_store_fk
  FOREIGN KEY (reservation_id, store_id)
  REFERENCES "Reservation" (id, store_id);
```
- Prisma では複合 FK を直接表現しづらいため、マイグレーションの raw SQL で付与する想定。
- コスト高なので、整合性リスクの高い連鎖（Sale↔SaleItem↔Payment、CustomerTicket↔TicketUsage、Reservation↔ReservationItem）に限定適用してもよい。

---

## 5. Prisma との接続方法

Prisma はコネクションプールを共有するため、**トランザクションごとに**セッション変数を張り直す。

```
// 擬似コード(設計メモ。実装はまだ行わない)
await prisma.$transaction(async (tx) => {
  await tx.$executeRawUnsafe(
    "SELECT set_config('app.store_ids', $1, true)", storeIdsCsv);
  await tx.$executeRawUnsafe(
    "SELECT set_config('app.user_id', $1, true)", userId);
  // 以降の tx.* クエリはすべて RLS スコープ下で実行される
});
```
- `true`（transaction-local）なのでコネクション返却後に残らない（他リクエストへの漏洩なし）。
- 単発クエリでも必ずトランザクションで包み、先に `set_config` する運用に統一する。

---

## 6. OWNER 横断アクセス
- ログイン時に `store_memberships` を引き、ロールと所属店舗を解決。
- 一般スタッフ: `app.store_ids` = 現在選択中の 1 店舗。
- OWNER が「全店」を選択: `app.store_ids` = 所属する全店舗 ID。
- KPI の全店集計はこのモードで動作し、RLS は許可集合内のみ返す。

---

## 7. テスト観点
- 別店舗の ID を直接指定して取得 → 0 件（漏れない）。
- 別店舗 `store_id` で INSERT → `WITH CHECK` 違反。
- `app.store_ids` 未設定 → 何も読めない（デフォルト deny）。
- OWNER 全店モードで複数店舗が見える。スタッフは 1 店舗のみ。
