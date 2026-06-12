-- Benchmark (competitor) accounts: per-user private libraries, isolated from tracked accounts.

create table if not exists public.benchmark_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  platform text not null default 'tiktok',
  tiktok_user_id text,
  handle text not null,
  display_name text,
  profile_url text not null,
  avatar_url text,
  followers_count bigint not null default 0,
  likes_count bigint not null default 0,
  video_count bigint not null default 0,
  total_views bigint not null default 0,
  engagement_rate numeric(5, 2) not null default 0,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, platform, handle)
);

create table if not exists public.benchmark_videos (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.benchmark_accounts(id) on delete cascade,
  tiktok_video_id text,
  title text not null,
  video_url text,
  thumbnail_url text,
  views_count bigint not null default 0,
  likes_count bigint not null default 0,
  comments_count bigint not null default 0,
  shares_count bigint not null default 0,
  collects_count bigint not null default 0,
  retention_rate numeric(5, 2),
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, tiktok_video_id)
);

create index if not exists benchmark_accounts_owner_id_idx on public.benchmark_accounts (owner_id);
create index if not exists benchmark_accounts_platform_idx on public.benchmark_accounts (platform);
create index if not exists benchmark_videos_account_id_idx on public.benchmark_videos (account_id);
create index if not exists benchmark_videos_posted_at_idx on public.benchmark_videos (posted_at desc);

drop trigger if exists set_benchmark_accounts_updated_at on public.benchmark_accounts;
create trigger set_benchmark_accounts_updated_at
  before update on public.benchmark_accounts
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_benchmark_videos_updated_at on public.benchmark_videos;
create trigger set_benchmark_videos_updated_at
  before update on public.benchmark_videos
  for each row
  execute function public.set_updated_at();

alter table public.benchmark_accounts enable row level security;
alter table public.benchmark_videos enable row level security;

drop policy if exists "Allow public read benchmark_accounts" on public.benchmark_accounts;
create policy "Allow public read benchmark_accounts"
  on public.benchmark_accounts for select using (true);

drop policy if exists "Allow public insert benchmark_accounts" on public.benchmark_accounts;
create policy "Allow public insert benchmark_accounts"
  on public.benchmark_accounts for insert with check (true);

drop policy if exists "Allow public update benchmark_accounts" on public.benchmark_accounts;
create policy "Allow public update benchmark_accounts"
  on public.benchmark_accounts for update using (true) with check (true);

drop policy if exists "Allow public delete benchmark_accounts" on public.benchmark_accounts;
create policy "Allow public delete benchmark_accounts"
  on public.benchmark_accounts for delete using (true);

drop policy if exists "Allow public read benchmark_videos" on public.benchmark_videos;
create policy "Allow public read benchmark_videos"
  on public.benchmark_videos for select using (true);

drop policy if exists "Allow public insert benchmark_videos" on public.benchmark_videos;
create policy "Allow public insert benchmark_videos"
  on public.benchmark_videos for insert with check (true);

drop policy if exists "Allow public update benchmark_videos" on public.benchmark_videos;
create policy "Allow public update benchmark_videos"
  on public.benchmark_videos for update using (true) with check (true);

drop policy if exists "Allow public delete benchmark_videos" on public.benchmark_videos;
create policy "Allow public delete benchmark_videos"
  on public.benchmark_videos for delete using (true);

grant all on table public.benchmark_accounts to anon, authenticated, service_role;
grant all on table public.benchmark_videos to anon, authenticated, service_role;

notify pgrst, 'reload schema';
