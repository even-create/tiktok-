alter table public.app_settings
  add column if not exists tikhub_api_key text;
