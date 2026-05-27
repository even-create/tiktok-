create table if not exists public.app_settings (
  id text primary key default 'default',
  apify_token text,
  sync_interval_minutes integer not null default 360,
  theme text not null default 'light',
  notify_sync_success boolean not null default true,
  notify_sync_error boolean not null default true,
  notify_weekly_digest boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "Allow public read app_settings" on public.app_settings;
create policy "Allow public read app_settings"
  on public.app_settings
  for select
  using (true);

drop policy if exists "Allow public update app_settings" on public.app_settings;
create policy "Allow public update app_settings"
  on public.app_settings
  for update
  using (true)
  with check (true);

drop policy if exists "Allow public insert app_settings" on public.app_settings;
create policy "Allow public insert app_settings"
  on public.app_settings
  for insert
  with check (true);

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
  before update on public.app_settings
  for each row
  execute function public.set_updated_at();
