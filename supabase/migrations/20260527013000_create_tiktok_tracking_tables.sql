create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  tiktok_user_id text,
  handle text not null unique,
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
  updated_at timestamptz not null default now()
);

alter table public.accounts add column if not exists tiktok_user_id text;
alter table public.accounts add column if not exists handle text;
alter table public.accounts add column if not exists display_name text;
alter table public.accounts add column if not exists profile_url text;
alter table public.accounts add column if not exists avatar_url text;
alter table public.accounts add column if not exists likes_count bigint not null default 0;
alter table public.accounts add column if not exists video_count bigint not null default 0;
alter table public.accounts add column if not exists followers_count bigint not null default 0;
alter table public.accounts add column if not exists total_views bigint not null default 0;
alter table public.accounts add column if not exists engagement_rate numeric(5, 2) not null default 0;
alter table public.accounts add column if not exists last_synced_at timestamptz;
alter table public.accounts add column if not exists created_at timestamptz not null default now();
alter table public.accounts add column if not exists updated_at timestamptz not null default now();

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  tiktok_video_id text,
  title text not null,
  video_url text,
  thumbnail_url text,
  views_count bigint not null default 0,
  likes_count bigint not null default 0,
  comments_count bigint not null default 0,
  shares_count bigint not null default 0,
  retention_rate numeric(5, 2),
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, tiktok_video_id)
);

create index if not exists accounts_handle_idx on public.accounts (handle);
create index if not exists videos_account_id_idx on public.videos (account_id);
create index if not exists videos_posted_at_idx on public.videos (posted_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_accounts_updated_at on public.accounts;
create trigger set_accounts_updated_at
  before update on public.accounts
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_videos_updated_at on public.videos;
create trigger set_videos_updated_at
  before update on public.videos
  for each row
  execute function public.set_updated_at();

alter table public.accounts enable row level security;
alter table public.videos enable row level security;

drop policy if exists "Allow public read accounts" on public.accounts;
create policy "Allow public read accounts"
  on public.accounts
  for select
  using (true);

drop policy if exists "Allow public insert accounts" on public.accounts;
create policy "Allow public insert accounts"
  on public.accounts
  for insert
  with check (true);

drop policy if exists "Allow public update accounts" on public.accounts;
create policy "Allow public update accounts"
  on public.accounts
  for update
  using (true)
  with check (true);

drop policy if exists "Allow public read videos" on public.videos;
create policy "Allow public read videos"
  on public.videos
  for select
  using (true);

drop policy if exists "Allow public insert videos" on public.videos;
create policy "Allow public insert videos"
  on public.videos
  for insert
  with check (true);

drop policy if exists "Allow public update videos" on public.videos;
create policy "Allow public update videos"
  on public.videos
  for update
  using (true)
  with check (true);
