create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_users (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  password_hash text not null,
  display_name text not null,
  role text not null default 'MEMBER',
  status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create index if not exists workspace_users_workspace_id_idx on public.workspace_users (workspace_id);
create index if not exists workspace_users_status_idx on public.workspace_users (status);
create index if not exists workspace_users_role_idx on public.workspace_users (role);

alter table public.accounts
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null,
  add column if not exists assigned_to uuid references public.workspace_users(id) on delete set null;

create index if not exists accounts_workspace_id_idx on public.accounts (workspace_id);
create index if not exists accounts_assigned_to_idx on public.accounts (assigned_to);

alter table public.workspaces enable row level security;
alter table public.workspace_users enable row level security;

create policy "Allow all for anon workspaces"
  on public.workspaces
  for all
  using (true)
  with check (true);

create policy "Allow all for anon workspace_users"
  on public.workspace_users
  for all
  using (true)
  with check (true);
