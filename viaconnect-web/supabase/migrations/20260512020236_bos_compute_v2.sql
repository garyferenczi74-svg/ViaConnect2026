-- =============================================================================
-- Bio Optimization Score compute v2 SSOT, queue, and write telemetry
-- =============================================================================
-- Bundles Prompt #159 (SSOT establishment) and Prompt #161 (queue plus
-- telemetry tables) into a single migration per Gary's Option B
-- (one PR for both prompts) authored 2026-05-11.
--
-- Architectural decisions locked by Gary 2026-05-11:
--
--   Q1: Add compute_seq smallint NOT NULL DEFAULT 1.
--       DROP the existing UNIQUE (user_id, date) constraint.
--       ADD UNIQUE (user_id, date, compute_seq).
--       The RPC auto-increments compute_seq for same-day computes via
--       coalesce((select max(compute_seq) from bio_optimization_history
--       where user_id = p_user_id and date = current_date), 0) plus 1.
--
--   Q2: DROP the health_scores projection from the trigger.
--       Trigger function does NOT write to health_scores.
--       The table stays in place, no DROP TABLE, no ALTER.
--
--   Q3: KEEP the daily_scores projection but write ONLY to the existing
--       bio_optimization_score column. Single-column SET. Existing
--       app-layer code (src/app/actions/dailyScores.ts, quick-daily-log,
--       nutrition-log) retains full ownership of every other
--       daily_scores column.
--
--   Q4: KEEP breakdown jsonb as the canonical column on
--       bio_optimization_history. Do NOT rename it. Do NOT add a new
--       inputs column. Every #161 spec reference to inputs is
--       substituted with breakdown throughout this migration and the
--       paired TypeScript types module.
--
-- Deviations from #159 spec §6 and #161 spec §6.1:
--
--   1. Use existing breakdown jsonb column instead of introducing
--      a new inputs column (Q4).
--   2. daily_scores trigger projection narrowed to bio_optimization_score
--      single column (Q3). Spec §6 also called for recovery_score,
--      sleep_score, etc. plus data_source; those are owned by the
--      existing quick-log and nutrition-log paths and are not written
--      by this trigger.
--   3. health_scores projection dropped (Q2). Spec §6 originally listed
--      three projection targets; trigger now projects to two
--      (profiles plus daily_scores).
--   4. idx_bos_history_user_computed_at NOT added. The existing
--      idx_bio_history (user_id, date DESC) already covers the spec
--      §6.3 lookup pattern.
--   5. ESLint custom rule and eslint-plugin-local-rules dependency are
--      OUT of scope. #161 §5.5, §6.12, §9.6 acceptance gate WAIVED
--      per Gary.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Section 1: Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- Section 2: bio_optimization_history column additions
-- -----------------------------------------------------------------------------
ALTER TABLE public.bio_optimization_history
  ADD COLUMN IF NOT EXISTS tier smallint;
ALTER TABLE public.bio_optimization_history
  ADD COLUMN IF NOT EXISTS confidence numeric(4,3);
ALTER TABLE public.bio_optimization_history
  ADD COLUMN IF NOT EXISTS compute_version text;
ALTER TABLE public.bio_optimization_history
  ADD COLUMN IF NOT EXISTS computed_at timestamptz DEFAULT now();
ALTER TABLE public.bio_optimization_history
  ADD COLUMN IF NOT EXISTS compute_seq smallint NOT NULL DEFAULT 1;

-- Note: breakdown jsonb already exists per live schema (Q4). No inputs column.

-- -----------------------------------------------------------------------------
-- Section 3: Backfill legacy rows (10 pre-existing rows per live schema)
-- -----------------------------------------------------------------------------
UPDATE public.bio_optimization_history
   SET tier = 1
 WHERE tier IS NULL;

UPDATE public.bio_optimization_history
   SET confidence = 0.720
 WHERE confidence IS NULL;

UPDATE public.bio_optimization_history
   SET compute_version = 'pre_ssot_unknown'
 WHERE compute_version IS NULL;

UPDATE public.bio_optimization_history
   SET computed_at = COALESCE(created_at, now())
 WHERE computed_at IS NULL;

-- Preserve existing breakdown content; mark pre-SSOT rows with a sentinel
-- so the audit pgTAP can confirm migration completeness.
UPDATE public.bio_optimization_history
   SET breakdown = COALESCE(breakdown, '{}'::jsonb)
                   || '{"_sentinel": "pre_ssot_unknown"}'::jsonb
 WHERE breakdown IS NULL
    OR NOT (breakdown ? '_sentinel');

-- -----------------------------------------------------------------------------
-- Section 4: Tighten NOT NULL on the new columns (and user_id, all 10 non-null)
-- -----------------------------------------------------------------------------
ALTER TABLE public.bio_optimization_history
  ALTER COLUMN tier SET NOT NULL;
ALTER TABLE public.bio_optimization_history
  ALTER COLUMN confidence SET NOT NULL;
ALTER TABLE public.bio_optimization_history
  ALTER COLUMN compute_version SET NOT NULL;
ALTER TABLE public.bio_optimization_history
  ALTER COLUMN computed_at SET NOT NULL;
ALTER TABLE public.bio_optimization_history
  ALTER COLUMN user_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- Section 5: CHECK constraints (NOT VALID then VALIDATE for defense)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bos_history_score_range_chk'
  ) THEN
    ALTER TABLE public.bio_optimization_history
      ADD CONSTRAINT bos_history_score_range_chk
      CHECK (score >= 0 AND score <= 100) NOT VALID;
  END IF;
END $$;
ALTER TABLE public.bio_optimization_history
  VALIDATE CONSTRAINT bos_history_score_range_chk;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bos_history_tier_valid_chk'
  ) THEN
    ALTER TABLE public.bio_optimization_history
      ADD CONSTRAINT bos_history_tier_valid_chk
      CHECK (tier IN (1, 2, 3)) NOT VALID;
  END IF;
END $$;
ALTER TABLE public.bio_optimization_history
  VALIDATE CONSTRAINT bos_history_tier_valid_chk;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bos_history_confidence_range_chk'
  ) THEN
    ALTER TABLE public.bio_optimization_history
      ADD CONSTRAINT bos_history_confidence_range_chk
      CHECK (confidence >= 0 AND confidence <= 1) NOT VALID;
  END IF;
END $$;
ALTER TABLE public.bio_optimization_history
  VALIDATE CONSTRAINT bos_history_confidence_range_chk;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bos_history_breakdown_object_chk'
  ) THEN
    ALTER TABLE public.bio_optimization_history
      ADD CONSTRAINT bos_history_breakdown_object_chk
      CHECK (jsonb_typeof(breakdown) = 'object') NOT VALID;
  END IF;
END $$;
ALTER TABLE public.bio_optimization_history
  VALIDATE CONSTRAINT bos_history_breakdown_object_chk;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bos_history_compute_version_nonempty_chk'
  ) THEN
    ALTER TABLE public.bio_optimization_history
      ADD CONSTRAINT bos_history_compute_version_nonempty_chk
      CHECK (length(compute_version) > 0) NOT VALID;
  END IF;
END $$;
ALTER TABLE public.bio_optimization_history
  VALIDATE CONSTRAINT bos_history_compute_version_nonempty_chk;

-- -----------------------------------------------------------------------------
-- Section 6: UNIQUE constraint migration (Q1)
-- -----------------------------------------------------------------------------
-- Drop old (user_id, date) unique constraint and its underlying index.
ALTER TABLE public.bio_optimization_history
  DROP CONSTRAINT IF EXISTS bio_optimization_history_user_id_date_key;

-- Create new unique constraint covering (user_id, date, compute_seq).
-- Build a unique index first then attach as constraint for idempotent
-- replays via IF NOT EXISTS guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bos_history_user_date_seq_key'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS bos_history_user_date_seq_key
      ON public.bio_optimization_history (user_id, date, compute_seq);
    ALTER TABLE public.bio_optimization_history
      ADD CONSTRAINT bos_history_user_date_seq_key
      UNIQUE USING INDEX bos_history_user_date_seq_key;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Section 7: RLS hardening on bio_optimization_history
-- -----------------------------------------------------------------------------
-- Drop the existing autoheal nested-SELECT policy and replace with a
-- proper 4-policy split per #159 §6.6. The SECURITY DEFINER RPC bypasses
-- these. Direct authenticated writes are denied; the RPC is the only
-- write path.
DROP POLICY IF EXISTS "Users view own bio history" ON public.bio_optimization_history;
DROP POLICY IF EXISTS "Users manage own bio history" ON public.bio_optimization_history;
DROP POLICY IF EXISTS "bos_history_select_own" ON public.bio_optimization_history;
DROP POLICY IF EXISTS "bos_history_no_direct_insert" ON public.bio_optimization_history;
DROP POLICY IF EXISTS "bos_history_no_update" ON public.bio_optimization_history;
DROP POLICY IF EXISTS "bos_history_no_delete" ON public.bio_optimization_history;

CREATE POLICY "bos_history_select_own"
  ON public.bio_optimization_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "bos_history_no_direct_insert"
  ON public.bio_optimization_history
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "bos_history_no_update"
  ON public.bio_optimization_history
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "bos_history_no_delete"
  ON public.bio_optimization_history
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON public.bio_optimization_history FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.bio_optimization_history FROM anon;

-- -----------------------------------------------------------------------------
-- Section 8: compute_bio_optimization_score RPC (SSOT write path)
-- -----------------------------------------------------------------------------
-- Single sanctioned write path for bio_optimization_history. authenticated
-- callers can only write their own row; service_role can write for any user.
-- compute_seq auto-increments per (user_id, date).
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

  -- Compute next compute_seq for the (user_id, current_date) tuple.
  SELECT COALESCE(MAX(compute_seq), 0) + 1
    INTO v_next_seq
    FROM public.bio_optimization_history
   WHERE user_id = p_user_id
     AND date = CURRENT_DATE;

  INSERT INTO public.bio_optimization_history
    (user_id, date, score, tier, confidence, breakdown,
     compute_version, computed_at, compute_seq, source)
  VALUES
    (p_user_id, CURRENT_DATE, p_score, p_tier, p_confidence, p_breakdown,
     p_compute_version, now(), v_next_seq, p_source)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.compute_bio_optimization_score(
  uuid, numeric, smallint, numeric, jsonb, text, text
) FROM public;

GRANT EXECUTE ON FUNCTION public.compute_bio_optimization_score(
  uuid, numeric, smallint, numeric, jsonb, text, text
) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Section 8b: claim_bos_compute_batch RPC (worker concurrency control)
-- -----------------------------------------------------------------------------
-- Atomically claims a batch of unprocessed bos_compute_queue rows using
-- SELECT FOR UPDATE SKIP LOCKED so concurrent worker invocations cannot
-- double-claim the same row. service_role only.
-- Claimed rows have processed_at set to a sentinel timestamp
-- ('9999-01-01 00:00:00+00') distinguishing claimed-but-incomplete from
-- finished rows. Downstream worker logic must:
--   * On success: UPDATE ... SET processed_at = now()
--   * On failure: UPDATE ... SET processed_at = NULL,
--                 processing_error = '...', retry_count = retry_count + 1
CREATE OR REPLACE FUNCTION public.claim_bos_compute_batch(p_limit integer)
RETURNS SETOF public.bos_compute_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role text := auth.role();
BEGIN
  IF v_caller_role <> 'service_role' THEN
    RAISE EXCEPTION 'claim_bos_compute_batch is service_role only'
      USING ERRCODE = '42501';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 1000 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 1000'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH claimed AS (
    SELECT id
      FROM public.bos_compute_queue
     WHERE processed_at IS NULL
       AND retry_count < 5
     ORDER BY enqueued_at
     LIMIT p_limit
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.bos_compute_queue q
     SET processed_at = '9999-01-01 00:00:00+00'::timestamptz
   WHERE q.id IN (SELECT id FROM claimed)
  RETURNING q.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_bos_compute_batch(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_bos_compute_batch(integer) TO service_role;

COMMENT ON FUNCTION public.claim_bos_compute_batch(integer) IS
  'Atomically claims a batch of unprocessed bos_compute_queue rows for worker drain using FOR UPDATE SKIP LOCKED. service_role only. Claimed rows have processed_at set to a sentinel; the worker overwrites with now() on success or NULL on retry.';

-- -----------------------------------------------------------------------------
-- Section 9: project_bio_optimization_score trigger function
-- -----------------------------------------------------------------------------
-- Cache projection AFTER INSERT on bio_optimization_history. Writes to:
--   profiles.bio_optimization_score (single column update)
--   daily_scores.bio_optimization_score (single-column upsert per Q3)
-- Does NOT touch health_scores per Q2.
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
  VALUES (NEW.user_id, NEW.date, NEW.score)
  ON CONFLICT (user_id, date) DO UPDATE
    SET bio_optimization_score = EXCLUDED.bio_optimization_score;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bos_history_project ON public.bio_optimization_history;
CREATE TRIGGER trg_bos_history_project
  AFTER INSERT ON public.bio_optimization_history
  FOR EACH ROW
  EXECUTE FUNCTION public.project_bio_optimization_score();

-- -----------------------------------------------------------------------------
-- Section 10: bos_compute_queue (#161 §6.1)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bos_compute_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL,
  event_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  enqueued_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_error text,
  bypass_cooldown boolean NOT NULL DEFAULT false,
  retry_count integer NOT NULL DEFAULT 0,
  CONSTRAINT bos_queue_source_valid_chk
    CHECK (source IN (
      'caq_completed',
      'daily_log',
      'nutrition_log',
      'wearable_sync',
      'manual_recalc',
      'admin_recalc',
      'recommendation_pipeline'
    )),
  CONSTRAINT bos_queue_payload_object_chk
    CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT bos_queue_retry_count_nonneg_chk
    CHECK (retry_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_bos_queue_unprocessed
  ON public.bos_compute_queue (user_id, enqueued_at)
  WHERE processed_at IS NULL;

ALTER TABLE public.bos_compute_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bos_queue_select_own" ON public.bos_compute_queue;
CREATE POLICY "bos_queue_select_own"
  ON public.bos_compute_queue
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "bos_queue_insert_own" ON public.bos_compute_queue;
CREATE POLICY "bos_queue_insert_own"
  ON public.bos_compute_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Section 11: bos_write_telemetry (#161 §6.1)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bos_write_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  caller_module text NOT NULL,
  write_target text NOT NULL,
  is_canonical boolean NOT NULL,
  success boolean NOT NULL,
  error_message text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT bos_telemetry_write_target_valid_chk
    CHECK (write_target IN (
      'bio_optimization_history',
      'profiles.bio_optimization_score',
      'daily_scores.bio_optimization_score',
      'health_scores',
      'compute_bio_optimization_score_rpc'
    ))
);

CREATE INDEX IF NOT EXISTS idx_bos_telemetry_dashboard
  ON public.bos_write_telemetry (occurred_at DESC, is_canonical);

ALTER TABLE public.bos_write_telemetry ENABLE ROW LEVEL SECURITY;

-- Default: deny all writes from authenticated / anon. service_role bypasses
-- RLS for server-context inserts. No SELECT policy: telemetry is admin-only
-- via service_role reads.
REVOKE INSERT, UPDATE, DELETE ON public.bos_write_telemetry FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.bos_write_telemetry FROM anon;

-- Observability carve-out: authenticated browser callers are allowed to
-- INSERT a telemetry row only if it logs a NON-canonical write attempt
-- for their own user. This is the narrow path the legacy site logBOSWrite
-- calls travel before #161.5 lockdown. Once the 7 day zero canonical
-- authenticated INSERT window closes, this GRANT plus policy is removed.
GRANT INSERT ON public.bos_write_telemetry TO authenticated;

DROP POLICY IF EXISTS "bos_telemetry_insert_observability" ON public.bos_write_telemetry;
CREATE POLICY "bos_telemetry_insert_observability"
  ON public.bos_write_telemetry
  FOR INSERT
  TO authenticated
  WITH CHECK (is_canonical = false AND user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Section 12: COMMENT ON for new objects
-- -----------------------------------------------------------------------------
COMMENT ON COLUMN public.bio_optimization_history.tier IS
  'Bio Optimization tier 1, 2, or 3 mapped from score band at compute time.';
COMMENT ON COLUMN public.bio_optimization_history.confidence IS
  'Compute confidence 0 to 1; pre-SSOT rows backfilled to 0.720 (Tier 1).';
COMMENT ON COLUMN public.bio_optimization_history.compute_version IS
  'Semantic version tag for the compute pipeline; pre_ssot_unknown for legacy.';
COMMENT ON COLUMN public.bio_optimization_history.computed_at IS
  'Wall-clock timestamp of compute; distinct from created_at for backfilled rows.';
COMMENT ON COLUMN public.bio_optimization_history.compute_seq IS
  'Per (user_id, date) sequence to allow multiple computes per day.';

COMMENT ON FUNCTION public.compute_bio_optimization_score(
  uuid, numeric, smallint, numeric, jsonb, text, text
) IS
  'SSOT write path for bio_optimization_history. SECURITY DEFINER. authenticated callers can only write for themselves; service_role can write for any user.';

COMMENT ON FUNCTION public.project_bio_optimization_score() IS
  'AFTER INSERT trigger that projects bio_optimization_history.score to profiles and daily_scores caches; does not touch health_scores per Q2.';

COMMENT ON TABLE public.bos_compute_queue IS
  'Compute queue per #161 §6.1; rows produced by event sources, drained by the BOS compute worker.';

COMMENT ON TABLE public.bos_write_telemetry IS
  'Write telemetry per #161 §6.1; tracks every write attempt against BOS-related tables to verify SSOT compliance. authenticated callers may INSERT only NON-canonical rows for themselves via the bos_telemetry_insert_observability policy; canonical writes flow via service_role.';
