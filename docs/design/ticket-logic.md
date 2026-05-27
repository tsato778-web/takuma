# 回数券消化ロジック（総売上 / 消化売上 の分離）

> 最重要: **総売上**（財務上の売上）と **消化売上**（管理指標）と **未消化残高**（前受金=負債）を厳密に分離する。回数券は「売った時に売上、使った時はサービス提供」という二重構造を持つため、ここを誤ると売上が二重計上される。

---

## 1. 3つの金額概念

| 概念 | 何か | 計上タイミング | データ |
|---|---|---|---|
| **総売上** | 財務上の売上（現金が動く）| 回数券を**販売**した時 | `SaleItem(kind=TICKET_SALE).amount`（=販売価格）|
| **消化売上** | 役務提供の管理指標（現金は動かない）| 回数券を**消化**した時 | `TicketUsage.unitValue × usedCount`（売上には**含めない**）|
| **未消化残高** | 前受金（負債）| 販売〜消化の差分 | `Σ CustomerTicket.remaining × unitValue` |

**不変条件**: 総売上に消化分を足してはいけない（二重計上禁止）。`TICKET_USE.amount = 0` がこれを物理的に保証する。

### 按分単価 `unitValue`
```
CustomerTicket.unitValue = round(TicketPlan.price / TicketPlan.totalCount)
```
発行時に確定・スナップショット保存（マスタ変更の影響を受けない）。`TicketUsage.unitValue` にも消化時点の値を写す。

---

## 2. 販売（TICKET_SALE）

会計時に「回数券を販売」を選ぶと:
```
BEGIN
  SaleItem(kind=TICKET_SALE, refId=plan, name, unitPrice=plan.price, qty=1, amount=plan.price)
      → Sale.subtotal / total に加算（= 総売上に計上）
  CustomerTicket 発行:
      totalCount = plan.totalCount
      remaining  = plan.totalCount
      unitValue  = round(plan.price / plan.totalCount)
      status     = ACTIVE
      expiresAt  = plan.validDays ? purchasedAt + validDays : null
      saleItemId = 当該明細
  Payment(現金/カード等) で plan.price を決済
COMMIT
```
→ この時点で **総売上 = 販売価格**、**未消化残高 += price**。

---

## 3. 消化（TICKET_USE）

施術が回数券対象のとき、会計で「回数券を消化」を選ぶ:
```
BEGIN
  -- 消化対象の選択(FIFO: 期限が近いものから)
  SELECT * FROM "CustomerTicket"
   WHERE store_id=:s AND customer_id=:c AND status='ACTIVE' AND remaining > 0
     AND (expires_at IS NULL OR expires_at >= now())
     AND (ticket_plan の menu が対象メニューに一致 or 共通)
   ORDER BY expires_at NULLS LAST, purchased_at        -- 先に切れるものを優先消化
   FOR UPDATE                                          -- 同時消化の競合防止(行ロック)
   LIMIT 1;

  CustomerTicket.remaining -= usedCount
  if remaining == 0: status = USED_UP
  TicketUsage(customerTicketId, visitId, usedCount, unitValue=ticket.unitValue, usedAt)
  SaleItem(kind=TICKET_USE, refId=ticketId, name, unitPrice=0, qty=usedCount, amount=0)
      → Sale.total には影響しない（消化売上は別集計）
COMMIT
```
→ **総売上は増えない**、**消化売上 += unitValue×usedCount**、**未消化残高 −= unitValue×usedCount**。

### 同時消化の競合防止
- `FOR UPDATE` で対象 `CustomerTicket` 行をロック。2 端末が同時に最後の 1 回を消化しようとしても、片方は残数 0 を見て弾く。
- 残数チェックと減算を同一トランザクションで実施（read-modify-write の原子性）。

---

## 4. 残高・指標の算出（store_id スコープ）

```sql
-- 顧客の未消化残高(前受金)
SELECT COALESCE(SUM(remaining * unit_value), 0)
FROM "CustomerTicket"
WHERE store_id = :s AND customer_id = :c AND status = 'ACTIVE';

-- 店舗の消化売上(期間) : 管理指標。財務売上とは別レポート
SELECT COALESCE(SUM(used_count * unit_value), 0)
FROM "TicketUsage"
WHERE store_id = :s AND voided = false
  AND used_at BETWEEN :from AND :to;

-- 店舗の回数券販売額(総売上の一部・期間)
SELECT COALESCE(SUM(amount), 0)
FROM "SaleItem" si JOIN "Sale" s ON s.id = si.sale_id
WHERE si.store_id = :s AND si.kind = 'TICKET_SALE'
  AND s.status = 'CLOSED' AND s.closed_at BETWEEN :from AND :to;
```
すべて `store_id` を先頭条件に持ち、`@@index([storeId, ...])` を使う。

---

## 5. 有効期限切れ（breakage）

日次バッチ:
```
UPDATE "CustomerTicket"
SET status = 'EXPIRED'
WHERE status = 'ACTIVE' AND remaining > 0
  AND expires_at IS NOT NULL AND expires_at < now();
```
- 期限切れ分は未消化残高（負債）から外れる。
- 会計方針として、失効分を「失効益（breakage 収益）」として認識するかは選択制（初期は認識せず、レポート上「失効残高」として表示）。設計上の拡張ポイント。

---

## 6. 赤伝（取消）時の巻き戻し

[accounting.md](./accounting.md) の VOID と連動:
- `TICKET_USE` の取消 → `CustomerTicket.remaining += usedCount`（`USED_UP`→`ACTIVE` に戻す）、`TicketUsage.voided = true`。消化売上集計は `voided=false` のみ対象なので自動的に除外。
- `TICKET_SALE` の取消 → 発行 `CustomerTicket` を `SUSPENDED`（または削除フラグ）、未消化残高から除外、`Payment` 返金（負額）。
- すべてトランザクション内・`AuditLog` 記録。

---

## 7. KPI への接続
- **回数券消化率** = `Σ 消化回数 / Σ 販売回数`（[kpi-aggregation.md](./kpi-aggregation.md)）。
- **未消化残高** はダッシュボードに前受金として表示（キャッシュフロー把握）。
- 消化売上はスタッフ別「施術実績」評価に使える（現金売上が立たない回数券施術もスタッフ貢献として可視化）。`TicketUsage` を担当スタッフ（`Visit.staffId`）に紐付けて集計。

---

## 8. まとめ（二重計上を防ぐ要点）
1. 売上は **販売時のみ** 計上（`TICKET_SALE.amount = price`）。
2. 消化は **必ず amount 0**（`TICKET_USE`）。total に影響させない。
3. 消化売上・未消化残高は `TicketUsage` / `CustomerTicket.remaining` から **別集計**し、財務売上に足さない。
4. 残高更新は `FOR UPDATE` + 同一トランザクションで原子的に。
