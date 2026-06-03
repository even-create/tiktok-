alter table public.videos add column if not exists collects_count bigint not null default 0;
