-- Phase 1 user system: team join requests.
-- Applications are stored here with status PENDING for the administrator to review later.
-- This does NOT create member accounts automatically.

CREATE TABLE IF NOT EXISTS member_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_applications_status ON member_applications (status);

-- Ensure PostgREST roles can use the table (Supabase exposes the public schema via these roles).
GRANT ALL ON TABLE member_applications TO anon, authenticated, service_role;

-- This app uses the anon key as a trusted backend (no per-user RLS), like the accounts table.
-- Disable RLS so inserts/reads are not blocked by a missing policy.
ALTER TABLE member_applications DISABLE ROW LEVEL SECURITY;

-- Force PostgREST to reload its schema cache so the new table is visible immediately.
NOTIFY pgrst, 'reload schema';
