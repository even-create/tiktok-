create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid()
);

alter table public.accounts add column if not exists tiktok_user_id text;
alter table public.accounts add column if not exists handle text;
alter table public.accounts add column if not exists display_name text;
alter table public.accounts add column if not exists profile_url text;
alter table public.accounts add column if not exists avatar_url text;
alter table public.accounts add column if not exists followers_count bigint not null default 0;
alter table public.accounts add column if not exists likes_count bigint not null default 0;
alter table public.accounts add column if not exists video_count bigint not null default 0;
alter table public.accounts add column if not exists total_views bigint not null default 0;
alter table public.accounts add column if not exists engagement_rate numeric(5, 2) not null default 0;
alter table public.accounts add column if not exists last_synced_at timestamptz;
alter table public.accounts add column if not exists created_at timestamptz not null default now();
alter table public.accounts add column if not exists updated_at timestamptz not null default now();

update public.accounts
set handle = coalesce(handle, tiktok_user_id, id::text),
    profile_url = coalesce(profile_url, 'https://www.tiktok.com/@' || coalesce(handle, tiktok_user_id, id::text))
where handle is null or profile_url is null;

alter table public.accounts alter column handle set not null;
alter table public.accounts alter column profile_url set not null;

create unique index if not exists accounts_handle_key on public.accounts (handle);
create index if not exists accounts_handle_idx on public.accounts (handle);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid()
);

alter table public.videos add column if not exists account_id uuid;
alter table public.videos add column if not exists tiktok_video_id text;
alter table public.videos add column if not exists title text;
alter table public.videos add column if not exists video_url text;
alter table public.videos add column if not exists thumbnail_url text;
alter table public.videos add column if not exists views_count bigint not null default 0;
alter table public.videos add column if not exists likes_count bigint not null default 0;
alter table public.videos add column if not exists comments_count bigint not null default 0;
alter table public.videos add column if not exists shares_count bigint not null default 0;
alter table public.videos add column if not exists retention_rate numeric(5, 2);
alter table public.videos add column if not exists posted_at timestamptz;
alter table public.videos add column if not exists created_at timestamptz not null default now();
alter table public.videos add column if not exists updated_at timestamptz not null default now();

update public.videos
set title = coalesce(title, 'Untitled TikTok video')
where title is null;

alter table public.videos alter column title set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'videos_account_id_fkey'
      and conrelid = 'public.videos'::regclass
  ) then
    alter table public.videos
      add constraint videos_account_id_fkey
      foreign key (account_id)
      references public.accounts(id)
      on delete cascade;
  end if;
end;
$$;

create unique index if not exists videos_account_tiktok_video_key
  on public.videos (account_id, tiktok_video_id);
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

notify pgrst, 'reload schema';
