-- =============================================================================
-- Prompt 211b Workstream 3B: user_measurement_anchors (calibration fusion anchors)
-- Migration: 20260713120000_prompt_211b_measurement_anchors.sql
-- =============================================================================
-- PURPOSE
-- -------
-- Ground-truth anchor readings (tape or DEXA/clinic import) a consumer supplies
-- to fit their own per-user calibration correction on top of the global
-- shape-correction factors (calibrationConfig.ts). Scale-weight anchors are NOT
-- written here: they arrive via the existing Prompt 201 pipeline
-- (body_composition_readings -> body_tracker_weight). This table exists for the
-- sources that have no home elsewhere: tape guided-entry and DEXA/clinic import.
-- The `source` CHECK still includes 'scale' so the column stays a faithful
-- mirror of fusion/anchorTypes.ts's AnchorSource union, even though W3b does
-- not write scale rows here.
--
-- A row is either a circumference anchor (region set, value_cm set,
-- weight_kg null) or a weight-only anchor (region null, weight_kg set,
-- value_cm null) - e.g. a DEXA session that also reports body weight.
--
-- CONSUMER OWN-ROW RLS ONLY. No practitioner policy: personal calibration
-- anchors are not a clinical record.
--
-- IDEMPOTENCY
-- -----------
-- CREATE TABLE IF NOT EXISTS, ENABLE RLS (idempotent), policies in DO blocks
-- guarded by pg_policies. No existing table, column, policy, or migration is
-- modified.
--
-- DO NOT APPLY MANUALLY: merge-deferred per the 211b task contract. The
-- controller applies this via the Supabase MCP after review and regenerates
-- src/lib/supabase/types.ts.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_measurement_anchors (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  source             TEXT NOT NULL CHECK (source IN ('scale', 'tape', 'dexa')),

  -- Region name from the fusion Region taxonomy (fusion/anchorTypes.ts /
  -- scanning/types.ts), e.g. 'waist_natural', 'hip', 'bicep'. NULL for a
  -- weight-only anchor (weight_kg set instead).
  region             TEXT,

  -- Circumference anchor value, centimetres. NULL for a weight-only anchor.
  value_cm           NUMERIC(6, 2) CHECK (value_cm IS NULL OR value_cm > 0),

  -- Weight anchor value, kilograms. NULL for a circumference anchor.
  weight_kg          NUMERIC(6, 2) CHECK (weight_kg IS NULL OR weight_kg > 0),

  -- Exactly one of value_cm / weight_kg is set, matching region's presence.
  CONSTRAINT user_measurement_anchors_one_value CHECK (
    (region IS NOT NULL AND value_cm IS NOT NULL AND weight_kg IS NULL) OR
    (region IS NULL AND weight_kg IS NOT NULL AND value_cm IS NULL)
  ),

  stated_reliability TEXT NOT NULL CHECK (stated_reliability IN ('high', 'medium', 'low')),

  taken_at           TIMESTAMPTZ NOT NULL,

  -- Soft FK to the consent record covering this anchor
  -- (consent_type 'scale_anchor' | 'tape_anchor' | 'dexa_anchor'). Nullable:
  -- a consent lookup failure must never block an otherwise-valid write; the
  -- fusion service gates on live consent_ledger state at read time regardless.
  consent_ledger_id  UUID REFERENCES public.consent_ledger(id) ON DELETE SET NULL,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_measurement_anchors IS
  'Tape and DEXA/clinic-import ground-truth anchors for per-user calibration '
  'fusion (211b Workstream 3). Scale-weight anchors are sourced from the '
  'Prompt 201 pipeline (body_tracker_weight), not written here. Consumer '
  'own-row RLS only; no practitioner policy.';

CREATE INDEX IF NOT EXISTS idx_user_measurement_anchors_user_taken
  ON public.user_measurement_anchors (user_id, taken_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_measurement_anchors_user_source
  ON public.user_measurement_anchors (user_id, source);

ALTER TABLE public.user_measurement_anchors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_measurement_anchors'
      AND policyname = 'Users select own measurement anchors'
  ) THEN
    CREATE POLICY "Users select own measurement anchors"
      ON public.user_measurement_anchors FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_measurement_anchors'
      AND policyname = 'Users insert own measurement anchors'
  ) THEN
    CREATE POLICY "Users insert own measurement anchors"
      ON public.user_measurement_anchors FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_measurement_anchors'
      AND policyname = 'Users update own measurement anchors'
  ) THEN
    CREATE POLICY "Users update own measurement anchors"
      ON public.user_measurement_anchors FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_measurement_anchors'
      AND policyname = 'Users delete own measurement anchors'
  ) THEN
    CREATE POLICY "Users delete own measurement anchors"
      ON public.user_measurement_anchors FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- =============================================================================
-- Done. One table: user_measurement_anchors. Consumer own-row RLS (select,
-- insert, update, delete-own); no practitioner policy. No function added, so
-- no search_path pin is needed here. APPEND-ONLY: no existing table, column,
-- policy, or migration touched.
-- =============================================================================
