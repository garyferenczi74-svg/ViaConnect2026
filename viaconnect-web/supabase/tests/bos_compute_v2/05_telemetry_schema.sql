-- pgTAP: bos_write_telemetry schema and RLS
-- Verifies table exists, write_target CHECK enum,
-- idx_bos_telemetry_dashboard present, observability INSERT policy in
-- place (#161.5 carve-out), and authenticated INSERT with is_canonical=true
-- is rejected by the policy.
BEGIN;
SELECT plan(13);

-- Table exists
SELECT has_table('public', 'bos_write_telemetry',
  'bos_write_telemetry table exists');

-- Required columns
SELECT has_column('public', 'bos_write_telemetry', 'id', 'id column');
SELECT has_column('public', 'bos_write_telemetry', 'occurred_at', 'occurred_at column');
SELECT has_column('public', 'bos_write_telemetry', 'caller_module', 'caller_module column');
SELECT has_column('public', 'bos_write_telemetry', 'write_target', 'write_target column');
SELECT has_column('public', 'bos_write_telemetry', 'is_canonical', 'is_canonical column');
SELECT has_column('public', 'bos_write_telemetry', 'success', 'success column');

-- write_target has CHECK enum
SELECT col_has_check('public', 'bos_write_telemetry', 'write_target',
  'write_target has CHECK constraint');

-- Dashboard index
SELECT has_index('public', 'bos_write_telemetry', 'idx_bos_telemetry_dashboard',
  'idx_bos_telemetry_dashboard exists');

-- RLS enabled
SELECT row_security_active('public', 'bos_write_telemetry',
  'RLS active on bos_write_telemetry');

-- Observability policy exists
SELECT policy_exists('public', 'bos_write_telemetry',
  'bos_telemetry_insert_observability',
  'bos_telemetry_insert_observability policy exists');

-- Verify the policy admits NON-canonical rows from the authenticated
-- user. We pick an existing auth.users row and SET LOCAL role to
-- authenticated with request.jwt.claims.sub bound to that user.
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No auth users available; skipping observability INSERT';
    RETURN;
  END IF;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_id::text, 'role', 'authenticated')::text,
    true);
  SET LOCAL role = authenticated;
  INSERT INTO public.bos_write_telemetry
    (caller_module, write_target, is_canonical, success, user_id)
  VALUES
    ('pgtap_test_observability', 'profiles.bio_optimization_score',
     false, true, v_user_id);
  RESET role;
  PERFORM set_config('request.jwt.claims', NULL, true);
END $$;

SELECT pass('authenticated user can INSERT NON-canonical telemetry row for self');

-- Authenticated INSERT with is_canonical=true must be rejected by the
-- WITH CHECK clause (policy violation -> error 42501).
SELECT throws_ok(
  $$
  DO $body$
  DECLARE
    v_user_id uuid;
  BEGIN
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_user_id::text, 'role', 'authenticated')::text,
      true);
    SET LOCAL role = authenticated;
    INSERT INTO public.bos_write_telemetry
      (caller_module, write_target, is_canonical, success, user_id)
    VALUES
      ('pgtap_test_canonical_block', 'bio_optimization_history',
       true, true, v_user_id);
  END
  $body$
  $$,
  '42501',
  NULL,
  'authenticated INSERT with is_canonical=true is rejected by policy'
);

SELECT * FROM finish();
ROLLBACK;
