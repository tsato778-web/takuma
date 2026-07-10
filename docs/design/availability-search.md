# 空き枠検索アルゴリズム / 予約台帳パフォーマンス

> 重点: **大量予約でも重くならない**こと。クエリは常に「店舗 × 日付レンジ」で境界づけ、台帳の付帯バッジ（回数券残・LINE未追加・タグ・未会計）は **一括取得で N+1 を回避**する。

---

## 1. 入力 / 出力

**入力**
- `storeId`（必須・スコープの起点）
- `menuIds[]` → 合計所要時間 `duration = Σ Menu.durationMin`
- 期間 `from`〜`to`（例: 1日 / 7日）
- `staffId?`（指名）/ `resourceType?`（席 or 個室）
- スロット粒度 `grid`（既定 15分）

**出力**: 予約可能なスロット `{ startAt, endAt, staffId, resourceId }[]`

---

## 2. アルゴリズム（スイープライン）

1日・1リソース（スタッフ or 席）あたりで実行し、結果を結合する。

```
1. 営業時間を取得          : Store.businessHours から当日の [open, close]
2. 占有区間を取得          : 下記クエリで当日の reservations を取得し
                            status ∈ {CONFIRMED, ARRIVED, DONE} のみを busy 区間化
                            (CANCELED / NO_SHOW / REQUESTED は占有としない設定が既定)
3. busy 区間をマージ        : start でソート → 重なりを統合 (sweep line, O(n log n))
4. 空き(free)区間を算出     : [open, close] から busy を差し引いた隙間
5. スロット生成            : 各 free 区間内で grid 刻みに [t, t+duration] を列挙し、
                            free 区間に収まるものだけを候補化
6. 指名/リソース制約        : staffId 指定時はそのスタッフのみ。
                            「指名なし」は全スタッフの free を union。
                            席/個室が必要なメニューは resource の free と AND を取る
                            (= スタッフ空き ∩ 席空き の交差区間で再度スロット生成)
```

`n` = その日・その店舗の予約件数（数十件程度）なので、計算は常に小さい。

---

## 3. パフォーマンス設計の核心

### 3-1. クエリは必ず「店舗 × 日付レンジ」で境界づける
```sql
SELECT id, staff_id, resource_id, start_at, end_at, status
FROM "Reservation"
WHERE store_id = $1
  AND start_at < $dayEnd     -- レンジの上端
  AND end_at   > $dayStart   -- レンジの下端(またぎ予約も拾う)
  AND status IN ('CONFIRMED','ARRIVED','DONE');
```
- 利用インデックス: `@@index([storeId, startAt])`（複合）。`store_id` で絞った上で `start_at` レンジスキャン。
- **全予約を走査しない**。返るのは「その日その店舗」の数十行のみ → 予約総数が数百万でも応答は一定。
- 指名検索は `@@index([storeId, staffId, startAt])`、席検索は `@@index([storeId, resourceId, startAt])` を使用。

### 3-2. 予約台帳（1日表示）のバッジを一括取得（N+1回避）
台帳は予約ブロックごとに「回数券残・LINE未追加・タグ・指名・未会計」を表示する。これを予約ごとに個別取得すると N+1 になるため、**1リクエスト = 固定本数のクエリ**にする。

```
Q1: 当日予約 + customer(name, tags, status) を JOIN で取得          … 1 query
        → ここで customerIds の集合が確定
Q2: SELECT customerId FROM LineLink WHERE storeId=$1
        AND customerId = ANY($customerIds)                          … 1 query (LINE連携有無)
Q3: SELECT customerId, SUM(remaining) FROM CustomerTicket
        WHERE storeId=$1 AND status='ACTIVE'
        AND customerId = ANY($customerIds) GROUP BY customerId      … 1 query (回数券残)
Q4: SELECT v.reservationId FROM Visit v JOIN Sale s ON s.visitId=v.id
        WHERE v.storeId=$1 AND v.reservationId = ANY($reservationIds)
        AND s.status <> 'CLOSED'                                    … 1 query (未会計)
→ アプリ側で customerId / reservationId をキーにマージ
```
予約件数に関係なく **4 クエリ固定**。`isNominated` と `tags` は Q1 で取得済み。

### 3-3. 非正規化キャッシュで再計算を避ける
- `Customer.visitCount` / `lastVisitAt`: 来店確定時に更新。再来判定・顧客一覧で集計不要。
- `CustomerTicket.unitValue`: 按分額を保持。表示時に割り算しない。
- 台帳サマリ（予約/来店/未会計/売上）は当日分の軽量集計のみ。

### 3-4. 同時予約（ダブルブッキング）防止
空き枠検索は楽観的なので、**確定時に DB レベルで重なりを排除**する。PostgreSQL の排他制約を使う。

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Reservation"
  ADD CONSTRAINT reservation_no_overlap_staff
  EXCLUDE USING gist (
    store_id WITH =,
    staff_id WITH =,
    tstzrange(start_at, end_at) WITH &&
  ) WHERE (status IN ('CONFIRMED','ARRIVED','DONE') AND staff_id IS NOT NULL);
-- 席/個室にも同様の制約(resource_id版)を追加
```
- 検索→確定の間に他者が同枠を取っても、INSERT 時に制約違反で弾かれる → 再検索を促す。
- アプリ層では `$transaction` 内で挿入し、違反を捕捉してユーザーに「枠が埋まりました」を返す。

### 3-5. キャッシュ戦略（任意・スケール時）
- 当日空き枠を Redis にキャッシュ（キー `avail:{storeId}:{date}:{staffId}`）、予約 CRUD でその店舗・日付のキーを invalidate。
- LIFF からの同時アクセスが多い場合に有効。MVP では on-demand 計算で十分（n が小さいため）。

### 3-6. 週表示・大量データ
- 週表示は同じレンジクエリを `from=週初 to=週末` にするだけ（依然インデックスレンジスキャン）。
- 超大規模・多店舗では `Reservation` を `store_id` または月単位で **パーティション**し、レンジスキャン範囲をさらに限定可能（将来）。

---

## 4. store_id 多店舗分離の担保
- すべての検索・台帳クエリは `store_id = :currentStore` を先頭条件に持つ（複合インデックスの先頭列）。
- RLS（[rls-policies.md](./rls-policies.md)）でアプリのバグがあっても他店舗データは読めない。
- 排他制約も `store_id WITH =` を含むため、店舗間で枠が干渉しない。
