# リピスト（再来特化型サロンCRM）

美容室・整体・リラクゼーション・エステ・ネイルなど、**サロン系店舗のリピート率最大化**を目的にした CRM。
「ただの予約管理」ではなく、来店前・中・後の感情設計／行動設計をシステム化し、LINE を中心に**再来店を自動で生み出すプラットフォーム**を目指す。

プロダクトの思想の詳細は [`CLAUDE.md`](./CLAUDE.md)、これまでの機能まとめは [`docs/HANDOFF.md`](./docs/HANDOFF.md) を参照。

## 起動

```bash
npm install
npm run dev
# → http://localhost:3000
```

Node は 18 以上を推奨。

## 技術スタック

- Next.js 14（App Router）／ TypeScript
- Tailwind CSS ／ Radix Dialog ／ lucide-react
- Prisma + PostgreSQL（Phase 1 移行中：予約台帳から順次）
- 現状の大半は **モックUI**（メモリ上のダミーデータで動作。リロードで初期化）

## 主な画面（サイドバー）

- 予約台帳 `/reservations`
- 顧客 `/customers`（ドロワー＋詳細ページ）
- カルテ `/records`（お客様入力＋スタッフ記録）
- 会計 `/pos`
- 回数券 `/tickets` ／ ポイント `/points`
- LINE `/line/*`（自動トリガー・状態別配信・セグメント・シナリオ・一斉・自動応答・テンプレ・マイページ）
- KPI分析 `/analytics`（経営者／現場ビュー・月末着地予測・広告予算シミュ）
- 強制リンク `/links`（媒体別URLの一括生成）
- 回答フォーム `/forms` ／ Googleマップ `/google-business` ／ メニュー作成 `/menus`
- 基本マスター `/master/*` ／ スタッフ `/staff`・出勤表・予約開放
- 外部連携 `/integrations` ／ メンテナンス `/maintenance`

## リポジトリ構成

```
app/          Next.js App Router (ページ)
components/   UI コンポーネント (reservation/ customer/ chart/ pos/ admin/ など)
lib/          データ・型・ロジック (mock-data / customer-data / charts / pos /
              analytics / forms / links / line-triggers / notifications / memos)
prisma/       Prisma スキーマ（DB移行用）
docs/         引き継ぎ・仕様ドキュメント
```

## 開発方針（詳細は `CLAUDE.md`）

- 目的は **リピート率最大化**。判断に迷ったら「これはリピート率最大化に効くか？」を基準に。
- 一気通貫データ：**媒体 → フォーム → LINE → 施術/回数券/会員 → 次回予約** を顧客×店舗×媒体で追える。
- 売上は必ず 2系統：**総売上ベース**（決済額＝CF）／**消化売上ベース**（役務）。回数券は購入売上と消化売上を分離。
- 予約は「1予約＝複数担当ブロック（主/サブ/補助・担当メニュー・時間・売上配分）」。予約可否・稼働率は担当ブロック単位で判定。お客様側は主担当のみ表示。
- スタッフ番号 S0001…は全体一意・退職後も保持（論理削除）。顧客Noは4桁ゼロ埋め。
- UIは美容クリニック系の高級感＋現場が迷わず高速操作。日本語UI。
