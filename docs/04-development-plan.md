# 開発手順

MVPは概ね **12〜14週間 / 8スプリント（1sprint = 1.5週間）** を想定。
各フェーズは「実装 → 動作確認 → ステージング反映 → レビュー」で締める。

## フェーズ 0: 準備（1週目）

1. **リポジトリ整備**
   - `apps/web` （Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui）
   - `packages/db` (Supabase migration & 型), `packages/config` (eslint/tsconfig)
   - pnpm workspace + Turborepo
2. **外部サービス開設**
   - Supabase プロジェクト（Tokyo リージョン）作成、pgvector有効化
   - Stripe テストモード + Products（Monthly / Yearly）
   - Vimeo Pro以上 + ドメイン制限、Playerパラメータ整理
   - OpenAI Business API Key、Resend、Vercel、Sentry
3. **環境変数の設計**
   - `.env.local.example` に以下を定義
     ```
     NEXT_PUBLIC_SUPABASE_URL=
     NEXT_PUBLIC_SUPABASE_ANON_KEY=
     SUPABASE_SERVICE_ROLE_KEY=
     STRIPE_SECRET_KEY=
     STRIPE_WEBHOOK_SECRET=
     STRIPE_PRICE_MONTHLY=
     STRIPE_PRICE_YEARLY=
     OPENAI_API_KEY=
     VIMEO_ACCESS_TOKEN=
     RESEND_API_KEY=
     APP_URL=
     ```
4. **CI/CD**
   - GitHub Actions: `lint`, `typecheck`, `test`, `supabase db diff` を PR で必須
   - Vercel Preview を PR ごとに払い出し

## フェーズ 1: 認証と骨組み（2〜3週目）

- `supabase/migrations/0001_init.sql` に `profiles`, `subscriptions`, RLS を投入
- `handle_new_user` トリガでauth作成時に `profiles` を自動作成
- Next.js側で `@supabase/ssr` を使ったサーバーサイド認証（Cookieベース）
- 画面: `/signup`, `/login`, `/reset`, `/verify`, `/dashboard`（プレースホルダ）
- ミドルウェア `middleware.ts` でセッションリフレッシュ、`(app)` は要ログイン
- ✅ 完了条件: メール登録・OAuthログインでダッシュボードに到達できる

## フェーズ 2: サブスク課金（3〜4週目）

- Stripe Products 参照ページ `/pricing`
- Route Handler `POST /api/stripe/checkout` で Checkout Session 作成
- Webhook `POST /api/stripe/webhook`
  - `checkout.session.completed` → subscriptions upsert, `profiles.role = 'member'`
  - `customer.subscription.updated/deleted` → status反映
  - 署名検証必須（`Stripe.webhooks.constructEvent`）
- `/settings/billing` から Stripe Customer Portal を起動
- ペイウォール: `(app)` レイアウトで `is_member()` を確認、falseなら `/subscribe`
- ✅ 完了条件: テストカードで課金 → member化 → 会員ページに入れる

## フェーズ 3: コース・動画視聴（5〜6週目）

- マイグレーション: `courses`, `sections`, `lessons`
- 管理画面（最小）: `/admin/courses` でCRUD、Vimeo ID入力
- 会員画面: `/courses`（一覧）、`/courses/[slug]`（詳細）、`/courses/[slug]/lessons/[slug]`
- Vimeoは `iframe` + JS SDK（`@vimeo/player`）で
  - `timeupdate` イベントを 5秒間隔でスロットル送信
  - `ended` で `completed=true`
- `POST /api/watch` で `watch_events` と `progress` を更新（Server Action可）
- ✅ 完了条件: コース→レッスンで動画を最後まで見ると進捗が90%以上で完了になる

## フェーズ 4: 進捗ダッシュボード（6〜7週目）

- `/dashboard` に「続きから」「進行中コース」「完了コース」を表示
- `/progress` に累計視聴時間、週次学習時間チャート、コース別進捗
- Supabase RPC or ビューで集計（`select coalesce(sum(watched_seconds),0) ...`）
- ✅ 完了条件: 実データからダッシュボードが復元される

## フェーズ 5: 月1ライブ（7〜8週目）

- `live_events` `live_registrations` マイグレーション
- 管理画面: `/admin/live` でCRUD、Zoom/Vimeo LiveのURL入力
- 会員画面: `/live`（次回＋アーカイブ一覧）、`/live/[id]`
- 参加ボタン押下で `live_registrations` に登録、確認メールを Resend で送信
- ✅ 完了条件: 予定→当日参加→アーカイブ公開までを一貫して回せる

## フェーズ 6: 症例相談掲示板（8〜10週目）

- `board_posts` `board_comments` マイグレーション、Storageバケット `board-attachments`
- 一覧・詳細・新規投稿・返信のUI、画像アップロード（署名URL経由）
- 通報機能（`is_hidden` 制御）、adminモデレーション画面
- 新規返信で投稿者にメール通知（`profiles.notify_email` を尊重）
- 免責文言（「医療診断ではありません」）を投稿画面に必ず表示
- ✅ 完了条件: 会員が投稿→他会員が返信→通知メール到着

## フェーズ 7: AI関連動画レコメンド（10〜11週目）

- `lesson_embeddings` テーブル + `match_lessons` 関数
- バッチ: `pnpm run embed:lessons`
  - `lessons` から `title + summary + transcript` を取得（transcriptはVimeoの字幕APIを利用、なければ手動投入）
  - OpenAI `text-embedding-3-small` でベクトル化 → upsert
- 推薦API `GET /api/recommendations?lessonId=...`
  - 対象レッスンの埋め込みを取得 → `match_lessons` で近傍3件（自身を除外）
  - 会員でない場合はエラー
- 視聴画面 `/courses/[slug]/lessons/[slug]` に「関連動画」セクションを追加
- ダッシュボードの「あなたへのおすすめ」は直近10件の視聴履歴の重心ベクトルで検索
- ✅ 完了条件: 視聴中のレッスンを起点に、関連度スコア付きで3件が並ぶ

## フェーズ 8: 仕上げ・非機能・リリース（11〜14週目）

- **QA**: Playwrightで主要導線を自動化（signup / checkout / watch / board）
- **監視**: Sentry連携、Vercel Analytics、Supabase Logs
- **セキュリティ**: RLS レビュー、`service_role` の露出チェック、CSP設定
- **法務**: 特商法/規約/プライバシー、Stripe適格請求書番号設定
- **アクセシビリティ**: axe-coreによる自動チェック、キーボード操作の確認
- **パフォーマンス**: `next/image`, ISR, Vimeoの遅延ロード、Edge化できるRoute Handlerの判別
- **βテスト**: 10〜20名の招待、フィードバックをGitHub Issueに集約
- **リリース**: 本番 Stripe Live キーへ切替、`/legal/*` 公開、DNS切替、Vercel Production Deploy
- ✅ 完了条件: 本番環境で新規登録→決済→視聴→掲示板→ライブ参加を通しで実施可能

## 想定スケジュール

| Sprint | 週 | フェーズ | 主要成果物 |
| --- | --- | --- | --- |
| S1 | W1 | 0 | 環境・CI・Supabase準備 |
| S2 | W2-3 | 1 | 認証・骨組み |
| S3 | W4 | 2 | Stripe課金 |
| S4 | W5-6 | 3 | コース・視聴 |
| S5 | W7 | 4 | 進捗 |
| S6 | W8 | 5 | ライブ |
| S7 | W9-10 | 6 | 掲示板 |
| S8 | W11 | 7 | AI推薦 |
| — | W12-14 | 8 | QA・リリース |

## チーム役割の目安

- PM/PO: 1名（要件・優先順・βテスト運営）
- フロント/フル: 1〜2名（Next.js、Vercel、Stripe/Vimeo連携）
- BE/DB: 0.5〜1名（Supabase設計、RLS、AIバッチ）
- デザイン: 0.5名（デザインシステム、動画UI）
- 医療監修: 0.2名（掲示板ガイドライン、講義品質チェック）

## 直近の Next Action（このMVP開始時にやること）

1. Supabase / Stripe / Vercel / Vimeo / OpenAI のアカウントを作成し、キーを発行する
2. `apps/web` を Next.js 15 で `pnpm create next-app` して初期化する
3. `supabase/migrations/0001_init.sql` に本ドキュメントの `profiles / subscriptions / RLS` を投入
4. GitHub Actions で `lint / typecheck / supabase db diff` を PR に必須化する
5. ステージング用の Vercel Preview と Supabase Branch を紐付ける
