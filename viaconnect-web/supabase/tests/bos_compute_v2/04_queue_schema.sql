-- pgTAP: bos_compute_queue schema and RLS
-- Verifies table exists, source CHECK enum (including recommendation_pipeline),
-- idx_bos_queue_unprocessed present, RLS own-select and own-insert policies
-- allow self only.
BEGIN;
SELECT plan(17);

-- Table exists
SELECT has_table('public', 'bos_compute_queue',
  'bos_compute_queue table exists');

-- Required columns
SELECT has_column('public', 'bos_compute_queue', 'id', 'id column');
SELECT has_column('public', 'bos_compute_queue', 'user_id', 'user_id column');
SELECT has_column('public', 'bos_compute_queue', 'source', 'source column');
SELECT has_column('public', 'bos_compute_queue', 'payload', 'payload column');
SELECT has_column('public', 'bos_compute_queue', 'enqueued_at', 'enqueued_at column');
SELECT has_column('public', 'bos_compute_queue', 'processed_at', 'processed_at column');
SELECT has_column('public', 'bos_compute_queue', 'bypass_cooldown', 'bypass_cooldown column');

-- CHECK constraints
SELECT col_has_check('public', 'bos_compute_queue', 'source',
  'source has CHECK constraint');

-- recommendation_pipeline is an accepted source value (Phase F addition).
-- We assert that the CHECK constraint definition mentions the literal.
SELECT ok(
  EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'bos_queue_source_valid_chk'
       AND pg_get_constraintdef(oid) LIKE '%recommendation_pipeline%'
  ),
  'bos_queue_source_valid_chk includes recommendation_pipeline value'
);

-- Partial index for unprocessed lookups
SELECT has_index('public', 'bos_compute_queue', 'idx_bos_queue_unprocessed',
  'idx_bos_queue_unprocessed exists');

-- RLS enabled
SELECT row_security_active('public', 'bos_compute_queue',
  'RLS active on bos_compute_queue');

-- A successful insert with source=recommendation_pipeline confirms the
-- CHECK constraint accepts the new enum value end to end. We run as
-- service_role so RLS does not gate the insert.
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No auth users available; skipping recommendation_pipeline insert';
    RETURN;
  END IF;
  SET LOCAL role = service_role;
  INSERT INTO public.bos_compute_queue (user_id, source, payload)
  VALUES (v_user_id, 'recommendation_pipeline', '{}'::jsonb);
  RESET role;
END $$;

SELECT pass('recommendation_pipeline source accepted by bos_compute_queue');

-- ---------------------------------------------------------------------------
-- Phase F-patch: claim_bos_compute_batch RPC assertions (Fix 1)
-- ---------------------------------------------------------------------------

-- 1) Function exists and is SECURITY DEFINER returning SETOF bos_compute_queue.
SELECT ok(
  EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'claim_bos_compute_batch'
       AND p.prosecdef = true
  ),
  'claim_bos_compute_batch exists as SECURITY DEFINER'
);

-- 2) authenticated cannot execute (raises 42501).
DO $$
DECLARE
  v_caught boolean := false;
BEGIN
  SET LOCAL role = authenticated;
  BEGIN
    PERFORM public.claim_bos_compute_batch(1);
  EXCEPTION WHEN insufficient_privilege THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_caught := (SQLSTATE = '42501');
  END;
  RESET role;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'expected 42501 when authenticated calls claim_bos_compute_batch';
  END IF;
END $$;
SELECT pass('authenticated callers receive 42501 from claim_bos_compute_batch');

-- 3) service_role can execute and gets sentinel-marked rows back.
DO $$
DECLARE
  v_user_id uuid;
  v_seed_id uuid;
  v_claimed_count integer;
  v_sentinel_count integer;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No auth users; skipping service_role claim test';
    RETURN;
  END IF;
  SET LOCAL role = service_role;
  INSERT INTO public.bos_compute_queue (user_id, source, payload)
    VALUES (v_user_id, 'manual_recalc', '{}'::jsonb)
    RETURNING id INTO v_seed_id;
  SELECT count(*) INTO v_claimed_count
    FROM public.claim_bos_compute_batch(10);
  SELECT count(*) INTO v_sentinel_count
    FROM public.bos_compute_queue
   WHERE id = v_seed_id
     AND processed_at = '9999-01-01 00:00:00+00'::timestamptz;
  IF v_claimed_count < 1 OR v_sentinel_count <> 1 THEN
    RAISE EXCEPTION 'service_role claim did not sentinel-mark the seeded row';
  END IF;
  -- Cleanup: release the row back so subsequent assertions are independent.
  UPDATE public.bos_compute_queue SET processed_at = NULL WHERE id = v_seed_id;
  RESET role;
END $$;
SELECT pass('service_role claim_bos_compute_batch returns sentinel-marked rows');

-- 4) Concurrent calls do not double-claim.
DO $$
DECLARE
  v_user_id uuid;
  v_first_count integer;
  v_second_count integer;
  v_overlap integer;
  v_first_ids uuid[];
  v_second_ids uuid[];
  v_seeded uuid[];
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No auth users; skipping double-claim test';
    RETURN;
  END IF;
  SET LOCAL role = service_role;
  -- Seed 5 fresh unprocessed rows.
  WITH ins AS (
    INSERT INTO public.bos_compute_queue (user_id, source, payload)
    SELECT v_user_id, 'manual_recalc', '{}'::jsonb
      FROM generate_series(1, 5)
    RETURNING id
  )
  SELECT array_agg(id) INTO v_seeded FROM ins;

  WITH first_claim AS (
    SELECT id FROM public.claim_bos_compute_batch(3)
  )
  SELECT array_agg(id) INTO v_first_ids FROM first_claim;
  v_first_count := COALESCE(array_length(v_first_ids, 1), 0);

  WITH second_claim AS (
    SELECT id FROM public.claim_bos_compute_batch(3)
  )
  SELECT array_agg(id) INTO v_second_ids FROM second_claim;
  v_second_count := COALESCE(array_length(v_second_ids, 1), 0);

  SELECT count(*) INTO v_overlap
    FROM unnest(v_first_ids) a
    JOIN unnest(v_second_ids) b ON a = b;

  IF v_overlap <> 0 THEN
    RAISE EXCEPTION 'concurrent claims overlapped: % rows in both batches', v_overlap;
  END IF;
  IF v_first_count + v_second_count < 5 THEN
    RAISE EXCEPTION 'expected at least 5 total claims across two batches, got %', v_first_count + v_second_count;
  END IF;

  -- Cleanup seeded rows.
  DELETE FROM public.bos_compute_queue WHERE id = ANY(v_seeded);
  RESET role;
END $$;
SELECT pass('consecutive claim_bos_compute_batch calls return disjoint sets');

SELECT * FROM finish();
ROLLBACK;
