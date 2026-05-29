alter table public.app_settings
  add column if not exists gemini_api_key text;
