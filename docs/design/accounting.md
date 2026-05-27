# 会計の税計算 / 赤伝仕様

> 重点: 複数決済、税の内税/外税、端数処理、そして会計確定後の訂正を **赤伝（VOID）** で安全に行う。回数券の売上計上ルールは [ticket-logic.md](./ticket-logic.md) を参照（本書は税と訂正が主題）。

---

## 1. 金額モデルと整合式

```
SaleItem.amount = unitPrice × qty           (TICKET_USE は 0)
Sale.subtotal   = Σ SaleItem.amount         (TICKET_USE は寄与しない)
Sale.tax        = 税額(下記の計算)
Sale.total      = subtotal − discount + tax (外税) / subtotal − discount (内税)
確定条件        : Σ Payment.amount = Sale.total
```

- 金額はすべて **整数（円）** で保持し、浮動小数を使わない。
- `unitPrice` `name` は売価のスナップショット（マスタ変更の影響を受けない）。

---

## 2. 税計算

`Store.taxMode`（`inclusive`=内税 / `exclusive`=外税）と `Store.taxRoundMode`（`floor`/`round`/`ceil`）、明細別 `taxRate`(%) で計算。

### 2-1. 税率バケットで集計（軽減税率対応）
明細を `taxRate` ごとにまとめ、**バケット単位で課税対象額を出してから丸める**（明細ごとに丸めると合計がずれるため）。割引は課税対象額に按分する。

```
各 taxRate バケット r について:
  base_r      = Σ amount(明細 in r)
  discount_r  = discount × (base_r / subtotal)     -- 割引を按分
  taxable_r   = base_r − discount_r

  外税: tax_r = roundMode( taxable_r × r / 100 )
  内税: tax_r = taxable_r − roundMode( taxable_r × 100 / (100 + r) )

Sale.tax   = Σ tax_r
Sale.total = 外税: Σ taxable_r + Sale.tax
             内税: Σ taxable_r            (税は total に内包)
```

### 2-2. 例（外税10%、端数 floor）
- カット ¥4,000 + カラー ¥6,000 = subtotal ¥10,000、割引 ¥1,000
- taxable = 9,000、tax = floor(9,000 × 0.10) = ¥900、total = ¥9,900

### 2-3. 例（内税10%、端数 floor）
- subtotal ¥13,200、割引 ¥1,000 → 税込対象 ¥12,200
- 本体 = floor(12,200 × 100 / 110) = ¥11,090、tax = 12,200 − 11,090 = ¥1,110、total = ¥12,200

> 端数処理は店舗設定で統一。日本の実務では切り捨て（floor）が一般的。丸めは伝票単位（バケット単位）で一度だけ行い、明細ごとには丸めない。

---

## 3. 複数決済

- `Payment` を 1 Sale に N 件。例: 現金 ¥2,200 + カード ¥10,000。
- 確定の前提: `Σ Payment.amount == Sale.total`。不足/過剰は確定不可（現金はお釣り計算を UI 側で別途扱い、保存値は受領=total に一致）。
- `method=CARD` は Stripe 決済 ID を `Payment.ref` に保存。`method=TICKET`/`PREPAID` の扱いは §5。

---

## 4. 赤伝（VOID）仕様 — 確定後の訂正

**原則: 確定済み（CLOSED）の Sale / SaleItem / Payment は不変（イミュータブル）**。修正は元伝票を打ち消す赤伝を新規作成する。直接 UPDATE しない（監査・整合性のため）。

### 4-1. 全額取消
1. 元 `Sale` を `status = VOIDED`, `voidedAt` 設定。
2. 打ち消し赤伝 `Sale` を作成（`voidOfSaleId = 元ID`、各 `SaleItem.amount` は負額、`Payment` も負額）。
3. **副作用の巻き戻し**（トランザクション内）:
   - `TICKET_USE` を含む → 対応 `CustomerTicket.remaining += usedCount`、`TicketUsage.voided = true`（[ticket-logic.md](./ticket-logic.md) §6）。
   - `TICKET_SALE` を含む → 発行した `CustomerTicket` を `SUSPENDED`/取消、`PrepaidBalance` を減算。
   - `Visit.checkedOutAt` / `Customer.visitCount` の整合を必要に応じ再計算。
4. `AuditLog` に `action=void`、`diffJson` を記録。

### 4-2. 一部返金 / 一部修正
- 全額 VOID → 正しい内容で新規 Sale を切り直す（再計上）方式を基本とする。
- 部分返金のみなら、差額分の負の SaleItem/Payment を持つ赤伝を作成（元は CLOSED のまま、`voidOfSaleId` で関連付け）。

### 4-3. 集計への反映
- KPI/日次売上は `status = CLOSED` の Sale を対象に集計し、`VOIDED` と赤伝（負額・`voidOfSaleId` 有）を含めることで自動的に純額になる。
- レポートは「総売上（赤伝込みの純額）」を表示。

---

## 5. 回数券・プリペイドと会計の境界
- 回数券 **販売**（`TICKET_SALE`）は売上計上 → `Payment`（現金/カード等）で決済。
- 回数券 **消化**（`TICKET_USE`、amount 0）は売上を増やさない → この明細に対応する `Payment` は不要（total に寄与しないため）。
- プリペイド支払（`method=PREPAID`）: その分 `PrepaidBalance.balance` を減算。残高で支払った金額は `Payment(PREPAID)` として total を構成。
- 詳細な売上分離（総売上 vs 消化売上 vs 未消化残高）は [ticket-logic.md](./ticket-logic.md)。

---

## 6. 会計確定トランザクション（まとめ）
```
BEGIN
  set_config('app.store_ids', ...)            -- RLS スコープ
  検証: Σ Payment.amount == Sale.total
  Sale.status = CLOSED, closedAt = now()
  TICKET_USE 明細 → CustomerTicket.remaining 減算 + TicketUsage 追加
  TICKET_SALE 明細 → CustomerTicket 発行 / PrepaidBalance 加算
  PREPAID 支払 → PrepaidBalance 減算
  Visit.checkedOutAt 更新, Customer.lastVisitAt / visitCount 更新
  AuditLog(action=create/close)
COMMIT
```
すべて単一トランザクション。途中失敗は全ロールバックで残高不整合を防ぐ。
