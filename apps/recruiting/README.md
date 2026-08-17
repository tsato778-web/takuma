# NAORU 採用管理システム（Recruiting ATS）

LINE 登録から入社までを一元管理する採用管理システム。
設計は [`docs/recruiting-ats/`](../../docs/recruiting-ats/) を参照。

- 技術構成：Next.js 15（App Router）/ TypeScript / PostgreSQL（Supabase）/ Prisma / Auth.js v5（共通管理者アカウント1つ）
- ホスティング：Vercel（このディレクトリを Root Directory に指定した専用プロジェクト）

現在の進捗：**Sprint 1（LINE連携基盤・友だち管理）完了**。友だち追加から候補者の自動登録・挨拶送信・トーク履歴保存までが動作する。

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
| `LINE_CHANNEL_SECRET` | LINE Developers Console → Messaging API チャネル |
| `LINE_CHANNEL_ACCESS_TOKEN` | 同上（発行ボタンで生成） |
| `LINE_DRY_RUN` | **既定は `true`（実送信しない）**。実送信テスト時のみ一時的に `false` |
| `CRON_SECRET` | 送信キューの定期実行を保護するトークン（本番必須。任意の長い文字列） |

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
| ダッシュボード | ログイン後のトップ | 21フェーズのカードが表示される |
| サイドメニュー | 左メニューの各項目 | 各画面が開き、未実装画面は実装予定スプリントが表示される |
| 友だち自動登録 | `npm run line:simulate -- follow` | 友だち情報に1件増え、タグ「LINE登録」・フェーズ「アンケート未回答」・挨拶2通が記録される |
| トーク履歴 | `npm run line:simulate -- message "テスト"` | 受信メッセージが履歴に残る |
| ブロック | `npm run line:simulate -- unfollow` | 状態が「ブロック」になり、送信待ちジョブが取り消される |
| 署名検証 | 署名なしで Webhook に POST | 400 が返る |

---

## LINE 連携（Sprint 1）

### 実送信の扱い

`LINE_DRY_RUN=true`（既定）では **LINE へ実際の送信を行わない**。送信内容はログに出力され、トーク履歴には「DRY_RUN（実送信なし）」付きで記録されるため、動作確認は一通りできる。プロフィール取得などの読み取り API は `true` のままでも実行される。

**実送信テストを行うときだけ、依頼者の確認を取ってから一時的に `false` にする。** テスト終了後は `true` に戻す。

### LINE アカウントなしで動作確認する

シミュレータで Webhook を模擬できる。実際の LINE 公式アカウントが無くても、友だち追加からトーク履歴保存まで検証できる。

```bash
npm run dev                                  # 別ターミナルで起動しておく

npm run line:simulate -- follow              # 友だち追加
npm run line:simulate -- message "テスト送信" # メッセージ受信
npm run line:simulate -- follow --user U_test_002
npm run line:simulate -- unfollow            # ブロック
```

結果は管理画面の **友だち情報** と **設定 → LINE公式アカウント設定** で確認できる。

### 実際の LINE 公式アカウントに接続する

1. LINE Developers Console で Messaging API チャネルを作成
2. `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` を環境変数に設定
3. 管理画面の **設定 → LINE公式アカウント設定** に表示される Webhook URL を、Console の Webhook URL に登録して「検証」
4. 同画面の「接続確認」でアカウント名・応答モード・メッセージ残数が表示されれば接続完了
5. LINE 公式アカウント側で **あいさつメッセージ・応答メッセージをオフ**、**応答モードを Bot**、**Webhook をオン** にする

### 処理の流れ

```
LINE → /api/line/webhook
        ├ 署名検証（不一致は 400）
        ├ WebhookEvent に生ログ保存（webhookEventId で重複排除）
        ├ MessageJob に登録
        ├ 短時間だけその場で処理（挨拶を待たせないため）
        └ 200 を返す
                     ↓
        /api/cron/dispatch（毎分・Vercel Cron）が残りを処理
        └ 失敗時は 1分 → 5分 → 30分 → 2時間 → 6時間 で再試行（最大5回）
```

> Vercel の毎分 Cron は Pro プラン以上が必要。Hobby プランの場合は Cron が1日1回になるため、
> Webhook 受信時のインライン処理が主経路になる（挨拶などの即時処理は動作する）。

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
| `npm run line:simulate -- follow` | Webhook を模擬して動作確認（LINE アカウント不要） |

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
│     ├─ line/webhook/  # LINE Webhook 受信
│     ├─ cron/dispatch/ # 送信キューの定期処理
│     └─ health/        # 死活監視
├─ components/          # UI コンポーネント
├─ lib/
│  ├─ line/             # 署名検証・API クライアント・イベント処理・テンプレート描画
│  ├─ jobs/             # 送信キュー（登録・取り出し・再試行）
│  ├─ pipeline/         # 選考フェーズ変更（履歴を必ず残す）
│  ├─ tags.ts           # タグ付与
│  ├─ storage.ts        # 受信メディアの保存
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
3. 環境変数を登録
   - `DATABASE_URL` / `DIRECT_URL` / `AUTH_SECRET` / `ADMIN_USER_ID` / `ADMIN_PASSWORD_HASH`
   - `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_DRY_RUN` / `CRON_SECRET`
4. `vercel.json` の Cron 設定により、送信キューが毎分処理される（Pro プラン以上）

マイグレーションはデプロイとは別に `npm run db:deploy` で適用する（自動実行はしない）。
