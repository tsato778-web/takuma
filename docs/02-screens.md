# 画面一覧

App Router（Next.js）想定のルーティングでまとめる。`(marketing)` `(auth)` `(app)` `(admin)` のRoute Groupで責務を分離する。

## 1. 未ログイン領域 `(marketing)`

| ID | 画面名 | パス | 主なUI要素 | 備考 |
| --- | --- | --- | --- | --- |
| M-01 | ランディング | `/` | ヒーロー、講師紹介、受講メリット、料金、FAQ、CTA | ISR。SEO対応。 |
| M-02 | 料金 | `/pricing` | 月額/年額プラン比較、Stripe Checkoutへの誘導 | 未ログインは登録画面へリダイレクト |
| M-03 | 特商法 | `/legal/tokusho` | 事業者情報 | 静的MD |
| M-04 | プライバシーポリシー | `/legal/privacy` | 個人情報の扱い | 静的MD |
| M-05 | 利用規約 | `/legal/terms` | 会員規約 | 静的MD |
| M-06 | お問い合わせ | `/contact` | フォーム | Resendでメール送信 |

## 2. 認証 `(auth)`

| ID | 画面名 | パス | 主なUI要素 |
| --- | --- | --- | --- |
| A-01 | 新規登録 | `/signup` | メール/PW/Google。同意チェック |
| A-02 | ログイン | `/login` | メール/PW/Google。パスワード再発行導線 |
| A-03 | パスワード再設定リクエスト | `/reset` | メール入力 |
| A-04 | パスワード再設定 | `/reset/confirm` | 新パスワード |
| A-05 | メール確認済み | `/verify` | 完了メッセージ |

## 3. 会員エリア `(app)`（要ログイン + サブスク判定）

| ID | 画面名 | パス | 主なUI要素 | 権限 |
| --- | --- | --- | --- | --- |
| U-01 | ダッシュボード | `/dashboard` | 続きから、進行中コース、次回ライブ、AI推薦、新着掲示板 | member |
| U-02 | コース一覧 | `/courses` | カテゴリタブ、検索、コースカード、進捗バー | member |
| U-03 | コース詳細 | `/courses/[courseSlug]` | カリキュラム、講師、進捗、開始ボタン | member |
| U-04 | レッスン視聴 | `/courses/[courseSlug]/lessons/[lessonSlug]` | Vimeoプレイヤー、章メモ、次のレッスン、関連動画(AI) | member |
| U-05 | 進捗ダッシュボード | `/progress` | 累計視聴時間、コース別％、直近ログ | member |
| U-06 | ライブ | `/live` | 次回ライブ告知（日時/参加URL/カウントダウン）、アーカイブ一覧 | member |
| U-07 | ライブ詳細 | `/live/[liveId]` | 概要、参加ボタン、資料、アーカイブ | member |
| U-08 | 症例相談 一覧 | `/board` | カテゴリ、検索、新規投稿ボタン、スレッド一覧 | member |
| U-09 | 症例相談 詳細 | `/board/[postId]` | 本文、画像、返信スレッド、返信フォーム | member |
| U-10 | 症例相談 新規 | `/board/new` | タイトル、本文、画像アップロード、カテゴリ | member |
| U-11 | プロフィール | `/settings/profile` | 氏名、所属、アイコン | member/free |
| U-12 | 通知・アカウント | `/settings/account` | メール通知、パスワード変更、退会 | member/free |
| U-13 | サブスク管理 | `/settings/billing` | 現プラン、次回請求、Stripe Portal起動 | member/free |
| U-14 | プラン未加入案内 | `/subscribe` | 決済導線、無料会員向けアップグレード | free |

## 4. 管理エリア `(admin)`（admin限定）

| ID | 画面名 | パス | 主なUI要素 |
| --- | --- | --- | --- |
| ADM-01 | 管理ダッシュボード | `/admin` | 会員数、MRR、直近登録、アラート |
| ADM-02 | 会員一覧 | `/admin/members` | 検索、状態フィルタ、詳細遷移 |
| ADM-03 | 会員詳細 | `/admin/members/[id]` | プロフィール、サブスク、視聴履歴 |
| ADM-04 | コース管理 | `/admin/courses` | 一覧・CRUD |
| ADM-05 | コース編集 | `/admin/courses/[id]` | 章、レッスン、Vimeo ID、公開設定 |
| ADM-06 | レッスン編集 | `/admin/courses/[id]/lessons/[lessonId]` | Vimeo ID、資料、公開、順序 |
| ADM-07 | ライブ管理 | `/admin/live` | ライブCRUD、URL、アーカイブ紐付け |
| ADM-08 | 掲示板モデレーション | `/admin/board` | 通報一覧、非公開化、削除 |
| ADM-09 | お知らせ配信 | `/admin/announcements` | ダッシュボード上部バナー用 |

## 5. 共通コンポーネント

- グローバルヘッダー（ロゴ、ナビ、通知アイコン、アバター）
- サイドナビ（会員エリアのみ、`/dashboard` `/courses` `/progress` `/live` `/board` `/settings`）
- コースカード、レッスン行、動画プレイヤーラッパ、進捗バー、AIレコメンドカード
- モーダル（未加入時のペイウォール、投稿削除確認）
- Empty state / Loading skeleton / Error boundary

## 6. 主要導線（ハッピーパス）

1. `/` → `/pricing` → `/signup` → Supabase Auth → `/subscribe`（Stripe Checkout） → 決済完了webhook → `/dashboard`
2. `/dashboard` → `/courses/[slug]` → `/courses/[slug]/lessons/[slug]` → 90%視聴で進捗更新 → 次のレッスン or 関連動画（AI）
3. `/dashboard` → `/board/new` → 投稿 → 返信通知メール → `/board/[postId]`
4. `/live` → 参加URLで外部（Zoom/Vimeo Live） → 終了後 `/live/[id]` にアーカイブ掲載
