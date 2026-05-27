create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  account_handle text,
  sync_type text not null default 'manual',
  status text not null,
  message text,
  duration_ms integer,
  apify_calls integer not null default 0,
  videos_processed integer not null default 0,
  error_detail text,
  created_at timestamptz not null default now()
);

create index if not exists sync_logs_created_at_idx on public.sync_logs (created_at desc);
create index if not exists sync_logs_status_idx on public.sync_logs (status);

alter table public.sync_logs enable row level security;

drop policy if exists "Allow public read sync_logs" on public.sync_logs;
create policy "Allow public read sync_logs"
  on public.sync_logs
  for select
  using (true);

drop policy if exists "Allow public insert sync_logs" on public.sync_logs;
create policy "Allow public insert sync_logs"
  on public.sync_logs
  for insert
  with check (true);
