create table if not exists public.account_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  snapshot_date date not null,
  followers_count bigint not null default 0,
  likes_count bigint not null default 0,
  total_views bigint not null default 0,
  video_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, snapshot_date)
);

create index if not exists account_daily_snapshots_date_idx
  on public.account_daily_snapshots (snapshot_date desc);

create index if not exists account_daily_snapshots_account_date_idx
  on public.account_daily_snapshots (account_id, snapshot_date desc);

drop trigger if exists set_account_daily_snapshots_updated_at on public.account_daily_snapshots;
create trigger set_account_daily_snapshots_updated_at
  before update on public.account_daily_snapshots
  for each row
  execute function public.set_updated_at();

alter table public.account_daily_snapshots enable row level security;

drop policy if exists "Allow public read account_daily_snapshots" on public.account_daily_snapshots;
create policy "Allow public read account_daily_snapshots"
  on public.account_daily_snapshots
  for select
  using (true);

drop policy if exists "Allow public insert account_daily_snapshots" on public.account_daily_snapshots;
create policy "Allow public insert account_daily_snapshots"
  on public.account_daily_snapshots
  for insert
  with check (true);

drop policy if exists "Allow public update account_daily_snapshots" on public.account_daily_snapshots;
create policy "Allow public update account_daily_snapshots"
  on public.account_daily_snapshots
  for update
  using (true);
