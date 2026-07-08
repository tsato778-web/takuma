# リピスト バックエンド Phase 1 セットアップガイド

Phase 1 のスコープ：**予約台帳** をモックデータから **Prisma + PostgreSQL** に置き換え。
予約の作成／更新／削除／ドラッグ移動／時間変更がすべてデータベースへ永続保存されます。

UI は変更なし。DB 未接続時は台帳が空表示になり、非侵襲な赤バナーで通知されます。

---

## 1. 前提

- Node.js 20 以上
- PostgreSQL 14+（Docker、Vercel Postgres、Supabase など何でも可）

## 2. セットアップ手順

```bash
# リポジトリのブランチ
git checkout claude/awesome-feynman-FhMo5

# アプリのディレクトリへ
cd repisuto

# 依存関係をインストール（postinstall で prisma generate まで走ります）
npm install

# .env を作成
cp .env.example .env
# .env の DATABASE_URL をお使いの PostgreSQL に合わせて編集

# スキーマを DB に反映
npm run db:push          # モック用の初期化。マイグレーション運用にするなら db:migrate

# シード（現行モックデータを DB に投入）
npm run db:seed

# 起動
npm run dev              # http://localhost:3000
```

### ローカル PostgreSQL を Docker で立てる例

```bash
docker run --name repisuto-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=repisuto \
  -p 5432:5432 -d postgres:16
```

その上で `.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/repisuto?schema=public"
```

## 3. 使えるコマンド（package.json）

| コマンド            | 内容                                       |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Next.js 開発サーバ                         |
| `npm run build`     | `prisma generate` → Next.js ビルド        |
| `npm run db:push`   | schema.prisma を DB に反映（開発向け）    |
| `npm run db:migrate` | マイグレーション作成＋反映                 |
| `npm run db:seed`   | モックデータを DB に投入                   |
| `npm run db:studio` | Prisma Studio で DB を目視確認             |
| `npm run db:reset`  | DB を全リセット→再マイグレーション→再シード |

## 4. スキーマ概要（prisma/schema.prisma）

| モデル         | 主なフィールド                                                   |
| -------------- | ---------------------------------------------------------------- |
| `Company`      | `code`（C0001）, `name`                                          |
| `Brand`        | `code`（B0001）, `bookingConfig`(JSON), `kpis`(JSON)             |
| `Store`        | `code`（T0001）, `brandCode`, `address`, `photoUrls[]`           |
| `Staff`        | `staffNo`（S00001・一意）, `menuIds[]`, `active`（論理削除）     |
| `Customer`     | `customerNo`（一意採番）, `tags[]`, `monthlyMember`(JSON)         |
| `Ticket`       | `remaining`, `validUntil`（Customer に紐付き）                    |
| `Menu`         | `nomination`, `forcedStaffId`, `capacity`                        |
| `Reservation`  | `dateKey`, `kind`, `status`, `assignments[]`                     |
| `Assignment`   | `role`, `share`（1予約に対する複数担当ブロック）                 |

- 顧客No／社員番号／店舗コード／ブランドコード／企業コードはすべて**永続**（欠番なし・削除不可）。
- 退職／退会は物理削除ではなく `active=false` / `archived` フラグで論理削除する運用。

## 5. API エンドポイント（Next.js Route Handlers）

| メソッド | パス                          | 用途                                    |
| -------- | ----------------------------- | --------------------------------------- |
| GET      | `/api/reservations`           | `?dateKey=YYYY-MM-DD&storeId=...` で一覧 |
| POST     | `/api/reservations`           | 予約作成（Assignment 含む）             |
| GET      | `/api/reservations/[id]`      | 単一取得                                 |
| PATCH    | `/api/reservations/[id]`      | 部分更新（ドラッグ・時間変更・状態変更） |
| DELETE   | `/api/reservations/[id]`      | 削除                                     |
| GET      | `/api/stores`                 | 店舗一覧                                 |
| GET      | `/api/staff`                  | スタッフ一覧                             |
| GET      | `/api/customers`              | 顧客検索（`?q=&phone=&storeId=`）        |
| POST     | `/api/customers`              | 新規顧客登録（customerNo 自動採番）      |
| GET      | `/api/menus`                  | メニュー一覧                             |

## 6. Phase 2 以降で対応予定

- `/customers`, `/records`, `/analytics` などのモック依存を DB に置換
- 予約側の Assignment 全置換ロジックのトランザクション化
- 監査ログ（誰がいつ何を変更したか）
- Auth.js による認証と、リクエストからの権限判定
- Supabase Storage / S3 での写真・カルテ画像保存

## 7. トラブルシュート

| 症状 | 原因 | 対処 |
| --- | --- | --- |
| 台帳上部に「DBエラー: …」の赤バナー | DATABASE_URL 未設定 or DB 未起動 | `.env` を確認、DB を起動 |
| `Environment variable not found: DATABASE_URL` | `.env` が読まれていない | ファイル名・パスを確認（`repisuto/.env`） |
| `prisma generate` が失敗 | node_modules 破損 | `rm -rf node_modules && npm install` |
| 予約は増えるが再読み込みで消える | POST は成功しているが GET が別 dateKey | ブラウザ日付・DB の `dateKey` を確認 |
