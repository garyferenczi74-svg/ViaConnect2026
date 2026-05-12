-- pgTAP: idempotency of the migration
-- Re-running the migration body produces no errors and no duplicate
-- triggers, policies, indexes, or constraints.
--
-- This test asserts that the post-migration state has exactly one of
-- each named object. The orchestrator can also re-apply the migration
-- after this test runs to confirm replay safety; the assertions below
-- still hold afterward.
BEGIN;
SELECT plan(7);

-- Exactly one trigger
SELECT is(
  (SELECT COUNT(*)::int FROM pg_trigger
    WHERE tgname = 'trg_bos_history_project' AND NOT tgisinternal),
  1,
  'Exactly one trg_bos_history_project trigger'
);

-- Exactly one compute_bio_optimization_score function
SELECT is(
  (SELECT COUNT(*)::int FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'compute_bio_optimization_score'),
  1,
  'Exactly one compute_bio_optimization_score function'
);

-- Exactly one project_bio_optimization_score function
SELECT is(
  (SELECT COUNT(*)::int FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'project_bio_optimization_score'),
  1,
  'Exactly one project_bio_optimization_score function'
);

-- Exactly one bos_history_select_own policy
SELECT is(
  (SELECT COUNT(*)::int FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bio_optimization_history'
      AND policyname = 'bos_history_select_own'),
  1,
  'Exactly one bos_history_select_own policy'
);

-- Exactly one bos_history_user_date_seq_key unique index
SELECT is(
  (SELECT COUNT(*)::int FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'bio_optimization_history'
      AND indexname = 'bos_history_user_date_seq_key'),
  1,
  'Exactly one bos_history_user_date_seq_key unique index'
);

-- Exactly one bos_compute_queue table
SELECT is(
  (SELECT COUNT(*)::int FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'bos_compute_queue'),
  1,
  'Exactly one bos_compute_queue table'
);

-- Exactly one bos_write_telemetry table
SELECT is(
  (SELECT COUNT(*)::int FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'bos_write_telemetry'),
  1,
  'Exactly one bos_write_telemetry table'
);

SELECT * FROM finish();
ROLLBACK;
