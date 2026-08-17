# NAORU 採用管理システム（Recruiting ATS）

LINE 登録から入社までを一元管理する採用管理システム。
設計は [`docs/recruiting-ats/`](../../docs/recruiting-ats/) を参照。

- 技術構成：Next.js 15（App Router）/ TypeScript / PostgreSQL（Supabase）/ Prisma / Auth.js v5（共通管理者アカウント1つ）
- ホスティング：Vercel（このディレクトリを Root Directory に指定した専用プロジェクト）

現在の進捗：**Sprint 0（基盤構築）完了**。画面は空のレイアウトのみで、業務機能は Sprint 1 以降に実装する。

---

## セットアップ手順

### 1. 依存関係のインストール

```bash
cd apps/recruiting
npm install
```

### 2. 環境変数

```bash
cp .env.example .env
```

`.env` に以下を設定する。

| 変数 | 取得元 |
| --- | --- |
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string（**Transaction pooler / ポート 6543**） |
| `DIRECT_URL` | 同上（**Direct connection / ポート 5432**）。マイグレーション実行に使う |
| `AUTH_SECRET` | `openssl rand -base64 32` の出力 |
| `ADMIN_USER_ID` | ログインID（任意の文字列。例：`naoru-recruit`） |
| `ADMIN_PASSWORD_HASH` | パスワードのハッシュ（下記で生成） |
| `SEED_MEMBERS` | ログインしない担当者（面談担当・評価者）の「氏名:区分」をカンマ区切り |

### 3. 管理者パスワードの設定

本部3名で**共通の管理者アカウント1つ**を使う運用のため、個人別アカウントは作らない。

```bash
npm run auth:hash -- "実際に使うパスワード"
# → scrypt:xxxxx:yyyyy が出力されるので ADMIN_PASSWORD_HASH に設定する
```

平文のまま運用したい場合は `ADMIN_PASSWORD` に直接設定してもよい（`ADMIN_PASSWORD_HASH` が優先される）。

> パスワードに `$` を含めても問題ないが、`.env` に書く値は `$` が変数展開として解釈されることがあるため、
> ハッシュ（`$` を含まない形式）での設定を推奨する。

### 4. データベースの作成

```bash
npm run db:deploy   # テーブル作成（マイグレーション適用）
npm run db:seed     # 初期データ投入（選考フェーズ・タグ・フォーム・ユーザー）
```

`db:seed` は何度実行しても同じ結果になる（upsert）。ログイン可能ユーザーを追加した場合は再実行すればよい。

### 5. 起動

```bash
npm run dev     # http://localhost:3000
```

---

## 動作確認

| 確認内容 | 方法 | 期待結果 |
| --- | --- | --- |
| 死活監視 | `curl http://localhost:3000/api/health` | `{"status":"ok","checks":{"database":true,"auth":true,...}}` |
| 未ログイン時の保護 | ブラウザで `/` を開く | `/login` へリダイレクトされる |
| ログイン | `/login` で ID とパスワードを入力 | ダッシュボードが表示される |
| 誤ったパスワード | わざと違うパスワードを入力 | ログインできず「ID またはパスワードが違います」と表示される |
| 総当たり対策 | パスワードを8回続けて間違える | 一定時間ログインを受け付けなくなる |
| ダッシュボード | ログイン後のトップ | 21フェーズのカードが 0 件で表示される |
| サイドメニュー | 左メニューの各項目 | 各画面が開き、未実装画面は実装予定スプリントが表示される |

---

## 開発コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` / `npm run start` | 本番ビルド／起動 |
| `npm run typecheck` | 型チェック |
| `npm run lint` | ESLint |
| `npm run test` | 単体テスト（Vitest） |
| `npm run db:migrate` | スキーマ変更からマイグレーションを作成（開発時） |
| `npm run db:deploy` | 既存マイグレーションの適用（本番・CI） |
| `npm run db:seed` | 初期データ投入 |
| `npm run db:studio` | Prisma Studio で DB を閲覧 |
| `npm run auth:hash -- "パスワード"` | 管理者パスワードのハッシュを生成 |

---

## ディレクトリ構成

```
apps/recruiting/
├─ app/
│  ├─ (admin)/          # 要ログイン。左サイドメニュー付きレイアウト
│  │  ├─ page.tsx       # 採用ダッシュボード
│  │  └─ .../page.tsx   # 各機能画面（Sprint 1 以降で実装）
│  ├─ login/            # ログイン画面
│  └─ api/
│     ├─ auth/          # Auth.js のエンドポイント
│     └─ health/        # 死活監視
├─ components/          # UI コンポーネント
├─ lib/
│  ├─ db.ts             # Prisma クライアント
│  ├─ password.ts       # 管理者パスワードの照合・試行制限
│  ├─ env.ts            # 環境変数の検証
│  ├─ fiscal-year.ts    # 年度の集計軸（内定年 / 入社年度）
│  ├─ dashboard.ts      # ダッシュボード集計
│  ├─ nav.ts            # サイドメニュー定義
│  └─ observability.ts  # エラー通知の入口（Sentry 導入時はここだけ差し替える）
├─ prisma/
│  ├─ schema.prisma     # 全テーブル定義
│  ├─ migrations/       # マイグレーション
│  └─ seed.ts           # 初期データ
└─ tests/               # 単体テスト
```

---

## Vercel へのデプロイ

既存の NAORU ダッシュボードとは**別の Vercel プロジェクト**として作成する。

1. Vercel で New Project → 同じリポジトリを選択
2. **Root Directory に `apps/recruiting` を指定**
3. 環境変数（`DATABASE_URL` / `DIRECT_URL` / `AUTH_SECRET` / `ADMIN_USER_ID` / `ADMIN_PASSWORD_HASH`）を登録
4. Sprint 1 以降は LINE 関連の環境変数を追加する

マイグレーションはデプロイとは別に `npm run db:deploy` で適用する（自動実行はしない）。
