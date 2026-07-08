# DB設計（Supabase / PostgreSQL）

Supabase Authの `auth.users` を認証ソースに、業務データは `public` スキーマに置く。
検索・レコメンド用に `pgvector` 拡張を有効化する。

```sql
create extension if not exists "pgcrypto";
create extension if not exists "vector";
```

## 1. ER概念図（テキスト）

```
auth.users 1─1 profiles 1─* subscriptions
profiles 1─* progress *─1 lessons *─1 sections *─1 courses
courses 1─* lesson_embeddings（レコメンド用）
profiles 1─* board_posts 1─* board_comments
profiles 1─* live_registrations *─1 live_events
profiles 1─* watch_events   （視聴ログ）
profiles 1─* audit_logs
```

## 2. テーブル定義

### 2.1 profiles（会員プロフィール）
```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  clinic_name text,
  avatar_url text,
  role text not null default 'free' check (role in ('free','member','admin')),
  notify_email boolean not null default true,
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```
- `role` はStripe webhook or 管理画面で更新。RLSの主軸。
- `profiles.id = auth.users.id` を必ず保つトリガを用意（`handle_new_user`）。

### 2.2 subscriptions（Stripeサブスクの写像）
```sql
create table public.subscriptions (
  id text primary key,                       -- Stripe subscription id
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null,                      -- active/trialing/past_due/canceled...
  price_id text not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
create index on public.subscriptions (user_id);
```
- webhookで upsert。`status in ('active','trialing')` を「有効会員」判定に使う。

### 2.3 courses / sections / lessons
```sql
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  cover_url text,
  category text,                             -- 'basic' / 'advanced' / 'case' など
  is_published boolean not null default false,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  order_index int not null default 0
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete cascade,
  slug text not null,
  title text not null,
  summary text,
  vimeo_id text not null,
  duration_seconds int not null default 0,
  is_preview boolean not null default false, -- 未加入でも視聴可
  resource_urls text[] default '{}',
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, slug)
);
create index on public.lessons (section_id, order_index);
```

### 2.4 progress / watch_events（学習進捗）
```sql
create table public.progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  watched_seconds int not null default 0,
  completed boolean not null default false,
  last_position int not null default 0,      -- 続き再生用（秒）
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.watch_events (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  event text not null check (event in ('play','pause','progress','ended')),
  position int not null,
  created_at timestamptz not null default now()
);
create index on public.watch_events (user_id, created_at desc);
```
- 90%以上で `completed=true` に更新（アプリ側で判定）。
- `watch_events` はダッシュボード集計とレコメンドの重み付けに使用。

### 2.5 live_events / live_registrations
```sql
create table public.live_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  join_url text,                             -- Zoom/Vimeo Live
  archive_vimeo_id text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.live_registrations (
  user_id uuid references public.profiles(id) on delete cascade,
  live_event_id uuid references public.live_events(id) on delete cascade,
  registered_at timestamptz not null default now(),
  primary key (user_id, live_event_id)
);
```

### 2.6 board_posts / board_comments（症例相談）
```sql
create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,                    -- '腰痛' '肩' '頸部' など
  title text not null,
  body text not null,
  image_urls text[] default '{}',
  is_hidden boolean not null default false,  -- モデレーション
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.board_posts (created_at desc);

create table public.board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  image_urls text[] default '{}',
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.board_comments (post_id, created_at);
```

### 2.7 lesson_embeddings（AI関連動画レコメンド）
```sql
create table public.lesson_embeddings (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  content text not null,                     -- 埋め込み対象のテキスト（title+summary+transcript要約）
  embedding vector(1536) not null,           -- text-embedding-3-small
  updated_at timestamptz not null default now()
);
create index on public.lesson_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```
- レコメンドは以下の関数で近傍検索。

```sql
create or replace function public.match_lessons(
  query_embedding vector(1536),
  match_count int default 5,
  exclude_lesson_id uuid default null
)
returns table(lesson_id uuid, similarity float)
language sql stable as $$
  select
    le.lesson_id,
    1 - (le.embedding <=> query_embedding) as similarity
  from public.lesson_embeddings le
  where exclude_lesson_id is null or le.lesson_id <> exclude_lesson_id
  order by le.embedding <=> query_embedding
  limit match_count;
$$;
```

### 2.8 audit_logs / announcements
```sql
create table public.audit_logs (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_published boolean not null default true
);
```

## 3. Row Level Security（RLS）

方針: 「自分のデータは自分のみ、公開コンテンツは有効会員のみ、管理は admin のみ」。

```sql
-- 全テーブルでRLSをON
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.courses enable row level security;
alter table public.sections enable row level security;
alter table public.lessons enable row level security;
alter table public.progress enable row level security;
alter table public.watch_events enable row level security;
alter table public.live_events enable row level security;
alter table public.live_registrations enable row level security;
alter table public.board_posts enable row level security;
alter table public.board_comments enable row level security;
alter table public.lesson_embeddings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.announcements enable row level security;
```

代表ポリシー：

```sql
-- 有効会員判定関数
create or replace function public.is_member()
returns boolean language sql stable as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('member','admin')
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- profiles: 本人のみread/write、adminは全read
create policy "profiles_self_select" on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy "profiles_self_update" on public.profiles for update
  using (id = auth.uid());

-- courses/sections/lessons: 公開+有効会員のみselect（preview lessonは全員）
create policy "courses_read" on public.courses for select
  using (is_published and public.is_member());
create policy "sections_read" on public.sections for select
  using (exists(select 1 from public.courses c
                where c.id = sections.course_id and c.is_published)
         and public.is_member());
create policy "lessons_read" on public.lessons for select
  using (
    is_preview
    or (
      exists(select 1 from public.sections s join public.courses c on c.id = s.course_id
             where s.id = lessons.section_id and c.is_published)
      and public.is_member()
    )
  );

-- progress/watch_events: 本人のみ
create policy "progress_owner" on public.progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "watch_events_owner" on public.watch_events for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 掲示板: 有効会員のみread、書き込みは本人のみ
create policy "board_posts_read" on public.board_posts for select
  using (public.is_member() and not is_hidden);
create policy "board_posts_insert" on public.board_posts for insert
  with check (public.is_member() and author_id = auth.uid());
create policy "board_posts_update" on public.board_posts for update
  using (author_id = auth.uid() or public.is_admin());

-- 管理系（audit/announcements 一部・CRUD）はadminのみ
create policy "admin_only" on public.audit_logs for all
  using (public.is_admin());
```

Stripe webhookなどサーバー側はSupabaseの `service_role` キー経由でRLSをバイパスする（Next.jsのRoute Handlerからのみ使用）。

## 4. Storageバケット

| バケット | 用途 | 公開/非公開 | 備考 |
| --- | --- | --- | --- |
| `avatars` | プロフィール画像 | 公開 | 認可済ユーザーのみアップロード |
| `board-attachments` | 掲示板画像 | サイン付きURL | 画像最大5MB、jpeg/png/webp |
| `resources` | 講座資料 (PDF) | サイン付きURL | 有効会員のみ発行 |

## 5. インデックス方針まとめ

- 参照が多い外部キー全てに index を明示（Supabaseは自動作成しないため）
- `lessons(section_id, order_index)` `board_posts(created_at desc)` `subscriptions(user_id)` は必須
- `lesson_embeddings` は `ivfflat`。件数が1万を超えたら `lists` を再チューニング

## 6. マイグレーション運用

- `supabase/migrations/*.sql` にすべての DDL を保存し、`supabase db push` でリモート反映
- サンプルデータは `supabase/seed.sql` に集約（ローカル開発のみ）
- 本番はGitHub Actionsで `supabase link` → `supabase db push` を実行
