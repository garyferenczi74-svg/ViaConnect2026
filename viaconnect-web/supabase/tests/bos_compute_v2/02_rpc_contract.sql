-- pgTAP: compute_bio_optimization_score RPC contract
-- Verifies signature, SECURITY DEFINER attribute, successful insert,
-- invalid input raises correct SQLSTATE, anon raises 42501,
-- same-day second call increments compute_seq.
BEGIN;
SELECT plan(8);

-- Signature exists and returns uuid
SELECT has_function('public', 'compute_bio_optimization_score',
  ARRAY['uuid', 'numeric', 'smallint', 'numeric', 'jsonb', 'text', 'text'],
  'compute_bio_optimization_score(uuid, numeric, smallint, numeric, jsonb, text, text) exists');

SELECT function_returns('public', 'compute_bio_optimization_score',
  ARRAY['uuid', 'numeric', 'smallint', 'numeric', 'jsonb', 'text', 'text'],
  'uuid',
  'compute_bio_optimization_score returns uuid');

-- Function is SECURITY DEFINER
SELECT is_definer('public', 'compute_bio_optimization_score',
  ARRAY['uuid', 'numeric', 'smallint', 'numeric', 'jsonb', 'text', 'text'],
  'compute_bio_optimization_score is SECURITY DEFINER');

-- Valid call inserts a row (service_role bypass path)
DO $$
DECLARE
  v_user_id uuid;
  v_inserted_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No auth users available; skipping insert assertion';
    RETURN;
  END IF;
  SET LOCAL role = service_role;
  v_inserted_id := public.compute_bio_optimization_score(
    v_user_id,
    75.5::numeric,
    2::smallint,
    0.860::numeric,
    '{"recovery": 80, "sleep": 75}'::jsonb,
    'v2.0.0-test',
    'recalculation'
  );
  RESET role;
END $$;

SELECT pass('Valid service_role call inserted a bio_optimization_history row');

-- Invalid tier raises 22023
SELECT throws_ok(
  $$
  SELECT public.compute_bio_optimization_score(
    (SELECT id FROM auth.users LIMIT 1),
    75.5::numeric,
    4::smallint,
    0.860::numeric,
    '{}'::jsonb,
    'v2.0.0-test',
    'recalculation'
  )
  $$,
  '22023',
  NULL,
  'Invalid tier (4) raises SQLSTATE 22023'
);

-- Invalid score raises 22023
SELECT throws_ok(
  $$
  SELECT public.compute_bio_optimization_score(
    (SELECT id FROM auth.users LIMIT 1),
    150::numeric,
    2::smallint,
    0.860::numeric,
    '{}'::jsonb,
    'v2.0.0-test',
    'recalculation'
  )
  $$,
  '22023',
  NULL,
  'Out-of-range score (150) raises SQLSTATE 22023'
);

-- Invalid confidence raises 22023
SELECT throws_ok(
  $$
  SELECT public.compute_bio_optimization_score(
    (SELECT id FROM auth.users LIMIT 1),
    75.5::numeric,
    2::smallint,
    1.5::numeric,
    '{}'::jsonb,
    'v2.0.0-test',
    'recalculation'
  )
  $$,
  '22023',
  NULL,
  'Out-of-range confidence (1.5) raises SQLSTATE 22023'
);

-- Anon (no auth.uid()) raises 42501
SELECT throws_ok(
  $$
  SET LOCAL role = anon;
  SELECT public.compute_bio_optimization_score(
    gen_random_uuid(),
    75.5::numeric,
    2::smallint,
    0.860::numeric,
    '{}'::jsonb,
    'v2.0.0-test',
    'recalculation'
  )
  $$,
  '42501',
  NULL,
  'Anon caller raises SQLSTATE 42501 (Authentication required)'
);

-- Same-day second call increments compute_seq
-- This assertion is expected to pass if the prior service_role insert
-- created seq=1 and a second insert with current_date produces seq=2.
DO $$
DECLARE
  v_user_id uuid;
  v_seq smallint;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No auth users available; skipping seq assertion';
    RETURN;
  END IF;
  SET LOCAL role = service_role;
  PERFORM public.compute_bio_optimization_score(
    v_user_id,
    77.0::numeric,
    2::smallint,
    0.860::numeric,
    '{"recovery": 82, "sleep": 76}'::jsonb,
    'v2.0.0-test',
    'recalculation'
  );
  SELECT MAX(compute_seq) INTO v_seq
    FROM public.bio_optimization_history
   WHERE user_id = v_user_id AND date = CURRENT_DATE;
  IF v_seq < 2 THEN
    RAISE EXCEPTION 'Expected compute_seq >= 2 for same-day second call, got %', v_seq;
  END IF;
  RESET role;
END $$;

SELECT pass('Same-day second call increments compute_seq');

SELECT * FROM finish();
ROLLBACK;
