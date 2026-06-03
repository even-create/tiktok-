alter table public.account_daily_snapshots add column if not exists collects_count bigint not null default 0;
