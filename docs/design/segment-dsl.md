# セグメント条件 DSL（LINE CRM）

> 目的: `Campaign.segmentJson` に保存する配信対象の条件を、安全に SQL へコンパイルする宣言的 DSL を定義する。**store_id は常にシステム側で注入**し、DSL からは指定できない。LINE 配信なので **LINE 連携済みのみ**が実際の配信対象になる。

---

## 1. データ構造（JSON）

AND/OR で入れ子にできる条件木。葉は `{ field, op, value }`。

```jsonc
{
  "op": "and",
  "conditions": [
    { "field": "lastVisitDaysAgo", "op": "gte", "value": 30 },
    { "field": "ticketRemaining",  "op": "gt",  "value": 0 },
    {
      "op": "or",
      "conditions": [
        { "field": "tags",   "op": "contains", "value": "VIP" },
        { "field": "ltv",    "op": "gte",      "value": 100000 }
      ]
    }
  ]
}
```

TypeScript 型（設計メモ）:
```ts
type SegmentNode =
  | { op: "and" | "or"; conditions: SegmentNode[] }
  | { field: Field; op: Operator; value: string | number | string[] };
```

---

## 2. 許可フィールド（ホワイトリスト）

DSL で参照できるのは下表のみ。未知フィールドはコンパイルエラー（インジェクション防止）。

| field | 型 | 対応データ | 備考 |
|---|---|---|---|
| `lastVisitDaysAgo` | number | `now - Customer.lastVisitAt`(日) | 失客抽出の主役 |
| `visitCount` | number | `Customer.visitCount` | 新規/リピート判定 |
| `ageYears` | number | `Customer.birthday` から算出 | |
| `gender` | string | `Customer.gender` | |
| `status` | enum | `Customer.status` | ACTIVE/DORMANT/LOST |
| `tags` | string[] | `Customer.tags` | `contains` で部分一致 |
| `ltv` | number | `Σ Sale.total`(顧客別) | サブクエリ/集計列 |
| `ticketRemaining` | number | `Σ CustomerTicket.remaining`(ACTIVE) | 回数券キャンペーン |
| `ticketExpiringDays` | number | `CustomerTicket.expiresAt - now`(最小) | 期限切れ前促進 |
| `lineLinked` | boolean | `LineLink` 有無 | 既定で true を強制付与 |
| `lastMenuCategory` | string | 直近 `SaleItem`→`Menu.categoryId` | |
| `birthdayMonth` | number | `Customer.birthday` の月 | 誕生日施策 |

---

## 3. 演算子

| op | 適用型 | SQL |
|---|---|---|
| `eq` / `ne` | 数値/文字列/bool | `=` / `<>` |
| `gt` / `gte` / `lt` / `lte` | 数値 | `>` `>=` `<` `<=` |
| `in` / `nin` | 文字列/enum | `IN (...)` / `NOT IN (...)` |
| `contains` | 配列(tags) | `tags @> ARRAY[...]` |
| `between` | 数値 | `BETWEEN a AND b` |

---

## 4. コンパイル（SQL 生成）

1. ルートに **必ず**システム条件を AND 結合する:
   ```sql
   store_id = :storeId               -- 多店舗分離(DSLからは指定不可)
   AND status <> 'BLOCKED'
   AND EXISTS (SELECT 1 FROM "LineLink" l                  -- 配信可能(LINE連携済)
               WHERE l.customer_id = "Customer".id
                 AND l.store_id = :storeId)
   ```
2. 各葉を **パラメータ化**した SQL 断片に変換（値はバインド変数。文字列連結しない）。
3. AND/OR ノードは `(child1 AND child2 ...)` / `(child1 OR ...)` で括る。
4. 集計系フィールド（`ltv`, `ticketRemaining`）は事前集計したサブクエリ or 相関サブクエリで解決。

### フィールド→SQL 断片の対応例
```
lastVisitDaysAgo gte 30
  → "Customer".last_visit_at <= now() - make_interval(days => :p1)
ticketRemaining gt 0
  → COALESCE((SELECT SUM(remaining) FROM "CustomerTicket" t
              WHERE t.customer_id = "Customer".id
                AND t.store_id = :storeId AND t.status = 'ACTIVE'), 0) > :p2
tags contains "VIP"
  → "Customer".tags @> ARRAY[:p3]::text[]
lineLinked eq true
  → EXISTS (SELECT 1 FROM "LineLink" l WHERE l.customer_id = "Customer".id
            AND l.store_id = :storeId)
```

---

## 5. プレビュー（対象人数）

配信 UI の「→ 対象 42名」は、生成 SQL を `SELECT count(*)` でラップして即時表示。実配信時は同条件で対象 `customerId` を列挙し、`MessageLog` を `QUEUED` で作成 → ジョブキューが LINE push。

---

## 6. 整合性・安全性のポイント
- **store_id 注入はシステム固定**。DSL からテナント境界を越えられない（RLS とも二重防御）。
- フィールド/演算子はホワイトリスト。値はバインド変数 → SQL インジェクション不可。
- `lineLinked = true` を常時 AND し、**未連携顧客には配信しない**（無効送信・課金浪費を防止）。LINE 未連携者は別途「友だち追加導線」施策へ回す。
- セグメント定義は `Campaign.segmentJson` に保存され、再現・監査可能。
- 配信結果は `MessageLog`（status: QUEUED→SENT/DELIVERED/FAILED）で追跡し、KPI（反応率・予約転換）に接続。
