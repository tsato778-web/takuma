# リピスト（Repisuto）設計ドキュメント

サロン向け **再来特化型 CRM**。予約・カルテ・会計・回数券・LINE CRM・KPI を統合した、美容クリニック風 UI のサロン向け CRM。今後の多店舗展開を前提に、全テーブルを **`store_id` ベース** で設計する。

> 本ディレクトリは設計フェーズの成果物。実装はまだ開始していない。

## 目次

### 基盤設計
- [00-overview.md](./00-overview.md) — 要件定義 / MVP / 画面一覧 / 権限 / 予約フロー / LINE構成 / 会計 / KPI / ディレクトリ / 技術スタック / ロードマップ
- [schema.prisma](./schema.prisma) — DB スキーマ（Prisma 形式・正本）
- [wireframes.md](./wireframes.md) — 主要画面のワイヤーフレーム

### 詳細設計（深掘り）
- [design/availability-search.md](./design/availability-search.md) — 空き枠検索アルゴリズム（予約台帳パフォーマンス）
- [design/rls-policies.md](./design/rls-policies.md) — RLS ポリシー定義（store_id 多店舗分離）
- [design/segment-dsl.md](./design/segment-dsl.md) — セグメント条件 DSL（LINE CRM）
- [design/accounting.md](./design/accounting.md) — 会計の税計算 / 赤伝仕様
- [design/ticket-logic.md](./design/ticket-logic.md) — 回数券消化ロジック（総売上 / 消化売上 分離）
- [design/kpi-aggregation.md](./design/kpi-aggregation.md) — KPI 集計ロジック

## 設計の中核となる不変条件（invariant）

1. すべての業務テーブルに `store_id`（NOT NULL / FK / INDEX）を持ち、子行の `store_id` は親と必ず一致する。
2. 回数券は **販売時に売上計上**（`TICKET_SALE`）、**消化は売上ゼロ明細**（`TICKET_USE`）。総売上に二重計上しない。
3. `CustomerTicket.remaining` の増減は `TicketUsage`（または購入/取消）と対でトランザクション実行する。
4. 未会計 = `Visit` が存在し、対応する `Sale.status != CLOSED`。
5. 1 Visit = 最大 1 Sale、Sale は複数 Payment を持てる（現金+カード）。

## エンティティ連鎖（全機能を貫く背骨）

```
Customer ──┬─< Reservation ─1:1─ Visit ─1:1─ Sale ─1:N─ Payment
           │        │                 │           │
           │   ReservationItem    MedicalRecord   SaleItem ──(kind)──┬─ Menu
           │   (Menu)             RecordPhoto                        ├─ Product
           │                                                         └─ TicketUsage
           ├─< CustomerTicket ─1:N─ TicketUsage ──(Visit/Sale に紐付く)
           ├─< PrepaidBalance
           ├─1:1─ LineLink ──(line_user_id ↔ customer)
           └─< MessageLog
```
