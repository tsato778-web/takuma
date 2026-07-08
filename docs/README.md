# NAORU技術アカデミー 会員サイトMVP ドキュメント

Next.js + Supabase + Stripe + Vimeo + OpenAI + Vercel で構築する会員サイトMVPの設計ドキュメント一式。

| ファイル | 内容 |
| --- | --- |
| [01-requirements.md](./01-requirements.md) | 要件定義（スコープ、ロール、非機能要件、外部サービス構成） |
| [02-screens.md](./02-screens.md) | 画面一覧（マーケ / 認証 / 会員 / 管理 / 共通コンポーネント / 主要導線） |
| [03-database.md](./03-database.md) | DB設計（テーブル定義、RLS、Storage、pgvectorレコメンド、マイグレーション運用） |
| [04-development-plan.md](./04-development-plan.md) | 開発手順（フェーズ0〜8、スケジュール、Next Action） |

## 想定技術スタック

- **フロント**: Next.js 15 (App Router, TypeScript, Tailwind, shadcn/ui)
- **BaaS**: Supabase (Postgres 15, Auth, Storage, pgvector)
- **課金**: Stripe (Checkout / Customer Portal / Webhook)
- **動画**: Vimeo Pro (Private + Domain制限, @vimeo/player)
- **AI**: OpenAI `text-embedding-3-small` + `gpt-4o-mini`
- **配信/監視**: Vercel, Sentry, Resend
