-- =============================================================================
-- Bio Optimization Score compute_seq + projection trigger UTC correctness fix
-- =============================================================================
-- #161d-fix remediation per the findings report at
-- docs/findings/161d-compute-seq-and-timezone-audit.md
--
-- Addresses three AT-RISK and one CONFIRMED (per Gary Q2 decision) findings:
--
--   TZ-1: compute_bio_optimization_score MAX(compute_seq) lookup uses
--         session-tz CURRENT_DATE; swap for (now() AT TIME ZONE 'utc')::date.
--   TZ-2: compute_bio_optimization_score INSERT VALUES uses session-tz
--         CURRENT_DATE; swap for (now() AT TIME ZONE 'utc')::date.
--   TZ-3: bio_optimization_history.date column DEFAULT is session-tz
--         CURRENT_DATE; swap for ((now() AT TIME ZONE 'utc')::date).
--   SC-2: project_bio_optimization_score trigger writes NEW.date directly
--         into daily_scores.date, propagating any session-tz date drift.
--         Swap for (NEW.computed_at AT TIME ZONE 'utc')::date in BOTH the
--         INSERT VALUES and (implicitly) the ON CONFLICT (user_id, date)
--         match, since the conflict key uses the VALUES column.
--
-- Locked decisions by Gary 2026-05-12:
--
--   Q1: Original #159 §6.5 spec wording is moot; trigger patched per Q2.
--   Q2: UTC-pin the projection trigger for symmetry: YES.
--   Q3: Backfill the 10 pre-SSOT rows: NO (audit-trail integrity).
--   Q4: Production UTC session-tz guaranteed forever: NOT guaranteed; this
--       fix is load-bearing, not preventative.
--
-- Forward-only migration; does NOT edit the applied Phase A migration
-- 20260512020236_bos_compute_v2.sql. Safe to re-run: ALTER COLUMN SET
-- DEFAULT is idempotent; CREATE OR REPLACE FUNCTION replaces in place;
-- COMMENT ON overwrites prior comments; the verification DO block is
-- side-effect-free.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Block 1: TZ-3 -- bio_optimization_history.date column DEFAULT
-- -----------------------------------------------------------------------------
ALTER TABLE public.bio_optimization_history
  ALTER COLUMN date SET DEFAULT ((now() AT TIME ZONE 'utc')::date);

-- -----------------------------------------------------------------------------
-- Block 2: TZ-1 + TZ-2 -- compute_bio_optimization_score RPC
-- -----------------------------------------------------------------------------
-- Function body preserved verbatim from Phase A migration Section 8 except
-- for the two CURRENT_DATE -> (now() AT TIME ZONE 'utc')::date swaps in the
-- MAX(compute_seq) lookup and the INSERT VALUES clause. Signature,
-- SECURITY DEFINER, SET search_path, all validation branches, error paths,
-- and the RETURNING id INTO v_id pattern are unchanged.
CREATE OR REPLACE FUNCTION public.compute_bio_optimization_score(
    p_user_id uuid,
    p_score numeric,
    p_tier smallint,
    p_confidence numeric,
    p_breakdown jsonb,
    p_compute_version text,
    p_source text DEFAULT 'recalculation'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_id uuid;
  v_next_seq smallint;
BEGIN
  -- Authentication required for every caller (service_role still has a
  -- non-null auth.uid() in PostgREST sessions).
  IF v_caller_id IS NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- Ownership: authenticated user can only write for themselves;
  -- service_role can write for any user.
  IF v_caller_id IS NOT NULL
     AND v_caller_id <> p_user_id
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Caller % cannot write BOS for user %', v_caller_id, p_user_id
      USING ERRCODE = '42501';
  END IF;

  -- Defense in depth on top of CHECK constraints.
  IF p_score IS NULL OR p_score < 0 OR p_score > 100 THEN
    RAISE EXCEPTION 'Score must be between 0 and 100, got %', p_score
      USING ERRCODE = '22023';
  END IF;
  IF p_tier IS NULL OR p_tier NOT IN (1, 2, 3) THEN
    RAISE EXCEPTION 'Tier must be 1, 2, or 3, got %', p_tier
      USING ERRCODE = '22023';
  END IF;
  IF p_confidence IS NULL OR p_confidence < 0 OR p_confidence > 1 THEN
    RAISE EXCEPTION 'Confidence must be between 0 and 1, got %', p_confidence
      USING ERRCODE = '22023';
  END IF;
  IF p_compute_version IS NULL OR length(p_compute_version) = 0 THEN
    RAISE EXCEPTION 'compute_version is required'
      USING ERRCODE = '22023';
  END IF;
  IF p_breakdown IS NULL OR jsonb_typeof(p_breakdown) <> 'object' THEN
    RAISE EXCEPTION 'breakdown must be a non-null jsonb object'
      USING ERRCODE = '22023';
  END IF;
  IF p_source IS NULL OR p_source NOT IN ('caq_initial', 'daily', 'recalculation') THEN
    RAISE EXCEPTION 'source must be caq_initial, daily, or recalculation, got %', p_source
      USING ERRCODE = '22023';
  END IF;

  -- TZ-1 fix: compute next compute_seq for the (user_id, utc_today) tuple.
  SELECT COALESCE(MAX(compute_seq), 0) + 1
    INTO v_next_seq
    FROM public.bio_optimization_history
   WHERE user_id = p_user_id
     AND date = (now() AT TIME ZONE 'utc')::date;

  -- TZ-2 fix: INSERT pins date to UTC-derived calendar day.
  INSERT INTO public.bio_optimization_history
    (user_id, date, score, tier, confidence, breakdown,
     compute_version, computed_at, compute_seq, source)
  VALUES
    (p_user_id, (now() AT TIME ZONE 'utc')::date, p_score, p_tier, p_confidence, p_breakdown,
     p_compute_version, now(), v_next_seq, p_source)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- Block 3: SC-2 -- project_bio_optimization_score trigger function
-- -----------------------------------------------------------------------------
-- Trigger function body preserved verbatim from Phase A migration Section 9
-- except for the NEW.date -> (NEW.computed_at AT TIME ZONE 'utc')::date swap
-- in the daily_scores INSERT VALUES. The ON CONFLICT (user_id, date) match
-- uses the VALUES column, so the conflict resolution stays in lockstep with
-- the UTC-pinned date. The trigger itself is already attached via Phase A
-- Section 9 (CREATE TRIGGER trg_bos_history_project); CREATE OR REPLACE
-- FUNCTION updates the body in place without re-creating the trigger.
CREATE OR REPLACE FUNCTION public.project_bio_optimization_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.profiles
     SET bio_optimization_score = NEW.score
   WHERE id = NEW.user_id;

  INSERT INTO public.daily_scores (user_id, date, bio_optimization_score)
  VALUES (NEW.user_id, (NEW.computed_at AT TIME ZONE 'utc')::date, NEW.score)
  ON CONFLICT (user_id, date) DO UPDATE
    SET bio_optimization_score = EXCLUDED.bio_optimization_score;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Block 4: Verification SELECT (post-replace sanity check)
-- -----------------------------------------------------------------------------
-- Confirms the function definitions and the column DEFAULT picked up the
-- UTC swaps. Raises an exception (rolling back the migration) if any swap
-- did not land. Side-effect-free read-only DO block.
DO $$
DECLARE
  v_rpc_def text;
  v_trigger_def text;
  v_col_default text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_rpc_def
    FROM pg_proc
   WHERE proname = 'compute_bio_optimization_score'
     AND pronamespace = 'public'::regnamespace;

  IF v_rpc_def IS NULL THEN
    RAISE EXCEPTION 'compute_bio_optimization_score not found in pg_proc after CREATE OR REPLACE';
  END IF;

  IF v_rpc_def NOT LIKE '%now() AT TIME ZONE ''utc''%' THEN
    RAISE EXCEPTION 'compute_bio_optimization_score did not pick up the UTC swap';
  END IF;

  SELECT pg_get_functiondef(oid) INTO v_trigger_def
    FROM pg_proc
   WHERE proname = 'project_bio_optimization_score'
     AND pronamespace = 'public'::regnamespace;

  IF v_trigger_def IS NULL THEN
    RAISE EXCEPTION 'project_bio_optimization_score not found in pg_proc after CREATE OR REPLACE';
  END IF;

  IF v_trigger_def NOT LIKE '%(NEW.computed_at AT TIME ZONE ''utc'')::date%' THEN
    RAISE EXCEPTION 'project_bio_optimization_score did not pick up the NEW.computed_at UTC swap';
  END IF;

  SELECT column_default INTO v_col_default
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'bio_optimization_history'
     AND column_name = 'date';

  IF v_col_default IS NULL THEN
    RAISE EXCEPTION 'bio_optimization_history.date column not found in information_schema.columns';
  END IF;

  IF v_col_default NOT LIKE '%now() AT TIME ZONE ''utc''%' THEN
    RAISE EXCEPTION 'bio_optimization_history.date DEFAULT did not pick up the UTC swap';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Block 5: COMMENT ON for the patched functions (informational)
-- -----------------------------------------------------------------------------
COMMENT ON FUNCTION public.compute_bio_optimization_score(
  uuid, numeric, smallint, numeric, jsonb, text, text
) IS
  'SSOT write path for bio_optimization_history. SECURITY DEFINER. authenticated callers can only write for themselves; service_role can write for any user. Date references UTC-pinned per #161d-fix (see docs/findings/161d-compute-seq-and-timezone-audit.md, TZ-1 + TZ-2).';

COMMENT ON FUNCTION public.project_bio_optimization_score() IS
  'AFTER INSERT trigger that projects bio_optimization_history.score to profiles and daily_scores caches; does not touch health_scores per Q2. daily_scores.date derived from (NEW.computed_at AT TIME ZONE utc)::date per #161d-fix (see docs/findings/161d-compute-seq-and-timezone-audit.md, SC-2).';
