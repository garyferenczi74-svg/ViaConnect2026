-- pgTAP: bos_compute_seq UTC correctness (#161d-fix)
-- Verifies the TZ-1, TZ-2, TZ-3, SC-2 fix from #161d findings landed:
--   * compute_bio_optimization_score body contains (now() AT TIME ZONE 'utc')::date
--   * bio_optimization_history.date column DEFAULT is UTC-pinned
--   * project_bio_optimization_score body uses (NEW.computed_at AT TIME ZONE 'utc')::date
-- Spec-trace assertions: assert artifact state, not behavior reproduction.
-- Paired with the new migration 20260512164309_bos_compute_seq_utc_correctness.sql.
-- Reference: docs/findings/161d-compute-seq-and-timezone-audit.md
-- Gary's decisions (2026-05-12): Q2=YES, Q3=NO, Q4=NOT-GUARANTEED.
BEGIN;
SELECT plan(3);

-- Test 1: compute_bio_optimization_score body contains the UTC-pinned date expression.
-- Asserts both CURRENT_DATE references (TZ-1 MAX lookup and TZ-2 INSERT VALUES) were
-- swapped for (now() AT TIME ZONE 'utc')::date.
SELECT ok(
  pg_get_functiondef(
    (SELECT oid
       FROM pg_proc
      WHERE proname = 'compute_bio_optimization_score'
        AND pronamespace = 'public'::regnamespace)
  ) LIKE '%now() AT TIME ZONE ''utc''%',
  'compute_bio_optimization_score body contains UTC-pinned date expression (TZ-1 + TZ-2)'
);

-- Test 2: bio_optimization_history.date column DEFAULT is UTC-pinned.
-- Postgres normalizes the DEFAULT expression so the canonical text includes
-- the explicit text cast on the timezone string.
SELECT is(
  (SELECT column_default
     FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bio_optimization_history'
      AND column_name = 'date'),
  '((now() AT TIME ZONE ''utc''::text))::date',
  'bio_optimization_history.date DEFAULT is UTC-pinned (TZ-3)'
);

-- Test 3: project_bio_optimization_score body uses UTC-pinned NEW.computed_at.
-- Asserts the trigger function's daily_scores INSERT derives date from
-- (NEW.computed_at AT TIME ZONE 'utc')::date instead of NEW.date (SC-2).
SELECT ok(
  pg_get_functiondef(
    (SELECT oid
       FROM pg_proc
      WHERE proname = 'project_bio_optimization_score'
        AND pronamespace = 'public'::regnamespace)
  ) LIKE '%(NEW.computed_at AT TIME ZONE ''utc'')::date%',
  'project_bio_optimization_score body uses UTC-pinned NEW.computed_at::date (SC-2)'
);

SELECT * FROM finish();
ROLLBACK;
