-- Prompt #170 Phase 1q hotfix 10: capture the nutrivision-meals storage bucket
-- and its 4 RLS policies in an append-only migration. Bucket was originally
-- provisioned via Supabase MCP during the 2026-05-29 session; this migration
-- closes the drift between live state and the migration ledger so fresh
-- deploys can be reproduced.
--
-- Per project memory project_local_vs_live_migrations_drift.md, local
-- migration files often drift from live. This migration is retroactive: it
-- documents what the MCP already created so fresh deploys + drift audits +
-- rollbacks land on the same shape as live.

-- Idempotent bucket creation. Public=false, 2MB max, JPEG/PNG/WebP only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('nutrivision-meals', 'nutrivision-meals', false, 2097152, ARRAY['image/jpeg','image/jpg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Idempotent RLS policies on storage.objects. Drop+create pattern is acceptable
-- because the prompt-170 storage scope is owned by this prompt; no other policy
-- will collide with these specific names.
DROP POLICY IF EXISTS nutrivision_meals_select_own ON storage.objects;
DROP POLICY IF EXISTS nutrivision_meals_insert_own ON storage.objects;
DROP POLICY IF EXISTS nutrivision_meals_update_own ON storage.objects;
DROP POLICY IF EXISTS nutrivision_meals_delete_own ON storage.objects;

CREATE POLICY nutrivision_meals_select_own ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'nutrivision-meals' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY nutrivision_meals_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'nutrivision-meals' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY nutrivision_meals_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'nutrivision-meals' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY nutrivision_meals_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'nutrivision-meals' AND (storage.foldername(name))[1] = auth.uid()::text);
