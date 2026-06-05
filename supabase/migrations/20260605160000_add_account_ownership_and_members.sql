-- Phase 1 user system: account ownership + members table.
-- Additive and idempotent. Does NOT delete, reset, or clear any existing data.

-- 1) Account ownership columns. Default every account to the administrator (Even).
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS owner_id text NOT NULL DEFAULT 'admin';

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS owner_name text NOT NULL DEFAULT 'Even';

-- Backfill any existing rows that predate the columns (safety; defaults already cover new rows).
UPDATE accounts
  SET owner_id = 'admin'
  WHERE owner_id IS NULL OR owner_id = '';

UPDATE accounts
  SET owner_name = 'Even'
  WHERE owner_name IS NULL OR owner_name = '';

CREATE INDEX IF NOT EXISTS idx_accounts_owner_id ON accounts (owner_id);

-- 2) Team members (provisioning/approval ships in a later phase; table can stay empty for now).
CREATE TABLE IF NOT EXISTS app_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'MEMBER',
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure PostgREST roles can use the table and refresh its schema cache.
GRANT ALL ON TABLE app_members TO anon, authenticated, service_role;

-- This app uses the anon key as a trusted backend (no per-user RLS), like the accounts table.
ALTER TABLE app_members DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
