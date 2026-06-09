-- Multi-platform support: add a platform column and make uniqueness per-platform.
-- Additive + idempotent. Existing accounts default to 'tiktok' and are untouched.

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'tiktok';

UPDATE accounts SET platform = 'tiktok' WHERE platform IS NULL OR platform = '';

-- Drop the old single-column UNIQUE(handle) so the same handle can exist on
-- different platforms (e.g. @nike on both TikTok and Instagram).
DO $$
DECLARE
  target_conname text;
BEGIN
  SELECT con.conname INTO target_conname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'accounts'
    AND nsp.nspname = 'public'
    AND con.contype = 'u'
    AND (
      SELECT array_agg(att.attname ORDER BY att.attnum)
      FROM unnest(con.conkey) AS k(attnum)
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k.attnum
    ) = ARRAY['handle']
  LIMIT 1;

  IF target_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE accounts DROP CONSTRAINT %I', target_conname);
  END IF;
END $$;

-- Composite uniqueness: one row per (platform, handle).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounts_platform_handle_key'
  ) THEN
    ALTER TABLE accounts ADD CONSTRAINT accounts_platform_handle_key UNIQUE (platform, handle);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS accounts_platform_idx ON accounts (platform);

NOTIFY pgrst, 'reload schema';
