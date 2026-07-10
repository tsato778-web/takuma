# KPI 集計ロジック

> 方針: 重い集計は **日次バッチで `KpiDaily`（店舗×日付）に事前集計**し、ダッシュボードは集計テーブルを読むだけにする（高速）。当日分はイントラデイで再計算。全店表示は `KpiDaily` を `store_id` で合算（OWNER のみ）。

---

## 1. 集計アーキテクチャ

```
[明細テーブル]                      [日次バッチ cron]            [ダッシュボード]
Visit / Sale / SaleItem   ──集計──▶  KpiDaily(storeId,date)  ──読むだけ──▶ 画面
TicketUsage / Customer                upsert(idempotent)         (期間で SUM/AVG)
```
- バッチは前日確定分を計算し、`@@unique([storeId, date])` で **upsert（冪等）**。再実行しても二重計上しない。
- 当日（締め前）は同じ集計クエリをオンデマンドで実行（範囲が当日のみで軽い）。
- 期間 KPI（月/週）は `KpiDaily` を期間で集約 → 明細を触らず高速。

---

## 2. 各 KPI の定義と集計クエリ（store_id スコープ）

すべて `store_id = :s` を先頭条件に持つ。日付境界は店舗 `timezone` 基準。

### 2-1. 来店数 / 総売上 / No-show（日次の素）
```sql
-- visits, sales(財務総売上: CLOSED かつ 赤伝込み純額)
SELECT
  (SELECT count(*) FROM "Visit"
     WHERE store_id=:s AND checked_in_at::date = :d)                       AS visits,
  (SELECT COALESCE(SUM(total),0) FROM "Sale"
     WHERE store_id=:s AND status='CLOSED' AND closed_at::date = :d)       AS sales,
  (SELECT count(*) FROM "Reservation"
     WHERE store_id=:s AND status='NO_SHOW' AND start_at::date = :d)       AS no_show;
```
> 総売上は `TICKET_USE`(amount0) を含まないため二重計上にならない（[ticket-logic.md](./ticket-logic.md)）。VOID と赤伝で純額化される（[accounting.md](./accounting.md)）。

### 2-2. 新規客数 / 再来客数 / 再来率
来店した顧客を「その来店時点で初回かリピートか」で分類。`Customer.firstVisitAt` を基準にする。
```sql
WITH day_visitors AS (
  SELECT DISTINCT customer_id FROM "Visit"
  WHERE store_id=:s AND checked_in_at::date = :d
)
SELECT
  count(*) FILTER (WHERE c.first_visit_at::date  = :d) AS new_customers,
  count(*) FILTER (WHERE c.first_visit_at::date <> :d) AS repeat_customers
FROM day_visitors dv JOIN "Customer" c ON c.id = dv.customer_id;

-- 再来率(その日) = repeat_customers / (new + repeat)
```
- **再来率（期間）**は `KpiDaily` の `Σ repeatCustomers / Σ(newCustomers+repeatCustomers)` で算出（来店ベース）。
- 顧客ユニークで厳密に出す月次版は明細から別途集計可能（コホート用）。

### 2-3. 新規→再来 転換率（コホート）
ある月に初回来店した新規が、一定期間内に 2 回目来店したか。
```sql
-- 対象コホート: first_visit_at が :month の顧客
WITH cohort AS (
  SELECT id FROM "Customer"
  WHERE store_id=:s AND date_trunc('month', first_visit_at) = :month
)
SELECT
  count(*) AS cohort_size,
  count(*) FILTER (WHERE c.visit_count >= 2) AS returned     -- 期間制限する場合は Visit を期間で数える
FROM cohort co JOIN "Customer" c ON c.id = co.id;
-- 転換率 = returned / cohort_size
```
- 「90日以内の再来」など窓を切る場合は `Visit` をコホート顧客 × 期間でカウントして 2 件目の有無を判定。

### 2-4. 失客率
```sql
-- DORMANT/LOST の割合(在籍顧客に対する)
SELECT
  count(*) FILTER (WHERE status IN ('DORMANT','LOST'))::float / NULLIF(count(*),0)
FROM "Customer" WHERE store_id=:s AND status <> 'BLOCKED';
```
- `status` の更新は §3 のバッチで `lastVisitAt` 閾値により行う。

### 2-5. 客単価 / LTV / 平均来店間隔
```sql
-- 客単価(期間) = 総売上 / 来店数 : KpiDaily を期間集約
SELECT SUM(sales)::float / NULLIF(SUM(visits),0) FROM "KpiDaily"
WHERE store_id=:s AND date BETWEEN :from AND :to;

-- LTV(平均) = 顧客別累計売上の平均
SELECT AVG(ltv) FROM (
  SELECT customer_id, SUM(total) AS ltv FROM "Sale"
  WHERE store_id=:s AND status='CLOSED' GROUP BY customer_id
) t;

-- 平均来店間隔 = 連続来店の日数差の平均(顧客ごと→全体平均)
WITH gaps AS (
  SELECT customer_id,
         checked_in_at::date
         - LAG(checked_in_at::date) OVER (PARTITION BY customer_id ORDER BY checked_in_at) AS gap
  FROM "Visit" WHERE store_id=:s
)
SELECT AVG(gap) FROM gaps WHERE gap IS NOT NULL;
```

### 2-6. スタッフ別売上 / 指名率
```sql
-- スタッフ別売上(担当明細ベース)
SELECT staff_id, SUM(amount) FROM "SaleItem"
WHERE store_id=:s AND kind IN ('MENU','PRODUCT')
GROUP BY staff_id;

-- 指名率 = 指名予約 / 全予約(完了)
SELECT staff_id,
  count(*) FILTER (WHERE is_nominated)::float / NULLIF(count(*),0) AS nomination_rate
FROM "Reservation"
WHERE store_id=:s AND status='DONE' GROUP BY staff_id;
```

### 2-7. 回数券消化率 / 未消化残高
```sql
-- 消化率 = 消化回数 / 販売回数(期間)
SELECT
  (SELECT COALESCE(SUM(used_count),0) FROM "TicketUsage"
     WHERE store_id=:s AND voided=false AND used_at BETWEEN :from AND :to) ::float
  / NULLIF((SELECT COALESCE(SUM(total_count),0) FROM "CustomerTicket"
     WHERE store_id=:s AND purchased_at BETWEEN :from AND :to),0);

-- 未消化残高(現在)
SELECT COALESCE(SUM(remaining * unit_value),0) FROM "CustomerTicket"
WHERE store_id=:s AND status='ACTIVE';
```

---

## 3. 顧客ステータス更新バッチ（失客判定）

KPI とは別に、毎日 `Customer.status` を最終来店からの経過で更新（失客アラートの素）。
```sql
UPDATE "Customer" SET status='DORMANT'
WHERE store_id=:s AND status='ACTIVE'
  AND last_visit_at < now() - interval '30 days'
  AND last_visit_at >= now() - interval '90 days';

UPDATE "Customer" SET status='LOST'
WHERE store_id=:s AND status IN ('ACTIVE','DORMANT')
  AND last_visit_at < now() - interval '90 days';
```
- 閾値（30/90 日）は店舗設定化可能。
- DORMANT になった顧客は LINE 失客フォロー（[segment-dsl.md](./segment-dsl.md)）の対象になり、KPI とリテンション施策が接続する。

---

## 4. 全店（OWNER）集計
```sql
SELECT date, SUM(sales), SUM(visits),
       SUM(repeat_customers)::float / NULLIF(SUM(new_customers+repeat_customers),0) AS repeat_rate
FROM "KpiDaily"
WHERE store_id = ANY(:ownerStoreIds)      -- RLS の許可集合と一致
  AND date BETWEEN :from AND :to
GROUP BY date ORDER BY date;
```
- OWNER の許可店舗集合（RLS `app.store_ids`）と一致。店舗別内訳も同テーブルから即時。

---

## 5. パフォーマンス / 整合性
- ダッシュボードは原則 `KpiDaily` を読む（明細フルスキャンを避ける）。
- 明細を触る重い集計（コホート、LTV）はバッチ or キャッシュ。当日分のみオンデマンド。
- すべて `store_id` 先頭条件 + 既存インデックス（`[storeId, closedAt]` `[storeId, checkedInAt]` `[storeId, usedAt]` 等）でレンジスキャン。
- 集計は VOID/赤伝を考慮した純額（CLOSED かつ赤伝込み）。消化売上は財務売上と分離（二重計上しない）。
