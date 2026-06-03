alter table public.anime_jobs
  add column if not exists image_task_id text,
  add column if not exists video_task_id text;
