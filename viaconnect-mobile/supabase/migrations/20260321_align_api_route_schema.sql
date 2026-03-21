-- Migration: Align audit_logs + subscriptions with API route schema
-- This evolves the tables created in earlier migrations to match
-- the column names used by the Next.js API routes.

-- ────────────────────────────────────────────────────
-- 1. audit_logs — add columns for API-style audit logging
-- ────────────────────────────────────────────────────
-- The original schema used (table_name, record_id, old_data, new_data)
-- for trigger-based auditing. The API routes also log with
-- (resource_type, resource_id, metadata, ip_address).
-- We add the new columns as nullable so both patterns work.

ALTER TABLE public.audit_logs
  ALTER COLUMN table_name DROP NOT NULL,
  ALTER COLUMN record_id DROP NOT NULL;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS resource_type text,
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS ip_address inet;

-- Backfill: copy table_name → resource_type for existing rows
UPDATE public.audit_logs
  SET resource_type = table_name
  WHERE resource_type IS NULL AND table_name IS NOT NULL;

-- Index for API-style queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type
  ON public.audit_logs(resource_type);

-- Allow service role / authenticated users to INSERT audit logs
-- (existing policy only allows admin SELECT)
CREATE POLICY "Service and authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- ────────────────────────────────────────────────────
-- 2. subscriptions — add plan column alongside plan_id
-- ────────────────────────────────────────────────────
-- The API routes write a typed plan value ('gold','platinum','practitioner')
-- while the original schema used plan_id (free-text).

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan text
    CHECK (plan IS NULL OR plan IN ('gold', 'platinum', 'practitioner'));

-- Backfill from plan_id where possible
UPDATE public.subscriptions
  SET plan = CASE
    WHEN plan_id ILIKE '%gold%' THEN 'gold'
    WHEN plan_id ILIKE '%platinum%' THEN 'platinum'
    WHEN plan_id ILIKE '%practitioner%' THEN 'practitioner'
    ELSE NULL
  END
  WHERE plan IS NULL AND plan_id IS NOT NULL;

-- ────────────────────────────────────────────────────
-- 3. genetic_variants — add unique constraint for upsert
-- ────────────────────────────────────────────────────
-- The GenEx upload route uses ON CONFLICT (user_id, rsid)
CREATE UNIQUE INDEX IF NOT EXISTS idx_genetic_variants_user_rsid
  ON public.genetic_variants(user_id, rsid);

-- ────────────────────────────────────────────────────
-- 4. genetic_profiles — add unique constraint for upsert
-- ────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_genetic_profiles_user_id
  ON public.genetic_profiles(user_id);
