-- pgTAP: bos_telemetry_retention_sweep() behavior
--
-- Inserts old and recent fixture rows into both bos_write_telemetry and
-- bos_compute_queue, calls the sweep, and confirms that rows past the
-- retention window are deleted while rows inside the window are
-- preserved. All assertions live inside a BEGIN ... ROLLBACK so the
-- branch DB is not mutated outside this transaction.
BEGIN;
SELECT plan(7);

-- Pick a fixture user; short-circuit if auth.users is empty.
DO $$
DECLARE
  v_user_id uuid;
  v_old_telemetry_id uuid;
  v_recent_telemetry_id uuid;
  v_old_queue_id uuid;
  v_recent_queue_id uuid;
  v_telemetry_deleted bigint;
  v_queue_deleted bigint;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No auth users available; skipping retention sweep fixture inserts';
    RETURN;
  END IF;

  -- 91 day old telemetry row: must be deleted
  INSERT INTO public.bos_write_telemetry
    (occurred_at, caller_module, write_target, is_canonical, success, user_id)
  VALUES
    (now() - interval '91 days', 'pgtap_retention_old',
     'profiles.bio_optimization_score', false, true, v_user_id)
  RETURNING id INTO v_old_telemetry_id;

  -- 89 day old telemetry row: must be preserved
  INSERT INTO public.bos_write_telemetry
    (occurred_at, caller_module, write_target, is_canonical, success, user_id)
  VALUES
    (now() - interval '89 days', 'pgtap_retention_recent',
     'profiles.bio_optimization_score', false, true, v_user_id)
  RETURNING id INTO v_recent_telemetry_id;

  -- 31 day old PROCESSED queue row: must be deleted
  INSERT INTO public.bos_compute_queue
    (user_id, source, payload, enqueued_at, processed_at)
  VALUES
    (v_user_id, 'manual_recalc', '{"k":"v"}'::jsonb,
     now() - interval '31 days', now() - interval '31 days')
  RETURNING id INTO v_old_queue_id;

  -- 29 day old PROCESSED queue row: must be preserved
  INSERT INTO public.bos_compute_queue
    (user_id, source, payload, enqueued_at, processed_at)
  VALUES
    (v_user_id, 'manual_recalc', '{"k":"v"}'::jsonb,
     now() - interval '29 days', now() - interval '29 days')
  RETURNING id INTO v_recent_queue_id;

  PERFORM set_config('pgtap.user_id', v_user_id::text, true);
  PERFORM set_config('pgtap.old_telemetry_id', v_old_telemetry_id::text, true);
  PERFORM set_config('pgtap.recent_telemetry_id', v_recent_telemetry_id::text, true);
  PERFORM set_config('pgtap.old_queue_id', v_old_queue_id::text, true);
  PERFORM set_config('pgtap.recent_queue_id', v_recent_queue_id::text, true);
END $$;

-- Capture return values
DO $$
DECLARE
  v_telemetry_deleted bigint;
  v_queue_deleted bigint;
BEGIN
  SELECT rows_deleted INTO v_telemetry_deleted
    FROM public.bos_telemetry_retention_sweep()
   WHERE table_name = 'bos_write_telemetry';
  SELECT rows_deleted INTO v_queue_deleted
    FROM public.bos_telemetry_retention_sweep()
   WHERE table_name = 'bos_compute_queue';

  PERFORM set_config('pgtap.telemetry_deleted', v_telemetry_deleted::text, true);
  PERFORM set_config('pgtap.queue_deleted', v_queue_deleted::text, true);
END $$;

-- Old telemetry row gone
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.bos_write_telemetry
     WHERE id = current_setting('pgtap.old_telemetry_id', true)::uuid
  ),
  '91 day old telemetry row deleted by sweep'
);

-- Recent telemetry row preserved
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.bos_write_telemetry
     WHERE id = current_setting('pgtap.recent_telemetry_id', true)::uuid
  ),
  '89 day old telemetry row preserved by sweep'
);

-- Old queue row gone
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.bos_compute_queue
     WHERE id = current_setting('pgtap.old_queue_id', true)::uuid
  ),
  '31 day old processed queue row deleted by sweep'
);

-- Recent queue row preserved
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.bos_compute_queue
     WHERE id = current_setting('pgtap.recent_queue_id', true)::uuid
  ),
  '29 day old processed queue row preserved by sweep'
);

-- Return-shape check: two rows, one per table
SELECT is(
  (SELECT count(*)::int FROM public.bos_telemetry_retention_sweep()),
  2,
  'sweep returns exactly two rows (one per table)'
);

-- Returned table_name values
SELECT bag_eq(
  $$SELECT table_name FROM public.bos_telemetry_retention_sweep()$$,
  $$VALUES ('bos_write_telemetry'), ('bos_compute_queue')$$,
  'sweep returns one row each for bos_write_telemetry and bos_compute_queue'
);

-- Returned rowcounts are non-negative bigints
SELECT ok(
  (SELECT bool_and(rows_deleted >= 0) FROM public.bos_telemetry_retention_sweep()),
  'sweep returns non-negative deletion counts'
);

SELECT * FROM finish();
ROLLBACK;
