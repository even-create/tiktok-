alter table public.anime_jobs
  add column if not exists reference_image_url text,
  add column if not exists image_prompt_template text,
  add column if not exists video_prompt_template text,
  add column if not exists video_duration integer not null default 5,
  add column if not exists video_resolution text not null default '720p';

create index if not exists anime_jobs_status_created_at_idx
  on public.anime_jobs (status, created_at desc);
