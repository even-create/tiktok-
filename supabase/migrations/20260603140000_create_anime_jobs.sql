create table if not exists public.anime_jobs (
  id uuid primary key default gen_random_uuid(),
  character_id text not null,
  action text not null,
  status text not null default 'pending',
  stage text not null default 'queued',
  progress integer not null default 0,
  image_url text,
  video_url text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists anime_jobs_created_at_idx on public.anime_jobs (created_at desc);

alter table public.anime_jobs enable row level security;

create policy "Allow all for anon anime_jobs"
  on public.anime_jobs
  for all
  using (true)
  with check (true);
