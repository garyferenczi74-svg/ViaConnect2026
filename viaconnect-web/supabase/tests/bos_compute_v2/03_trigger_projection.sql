-- pgTAP: project_bio_optimization_score trigger
-- Verifies trigger exists, INSERT projects to profiles and daily_scores,
-- ONLY the bio_optimization_score column is set on daily_scores
-- (other columns stay NULL per Q3), health_scores is untouched.
BEGIN;
SELECT plan(7);

-- Trigger exists on bio_optimization_history
SELECT has_trigger('public', 'bio_optimization_history', 'trg_bos_history_project',
  'trg_bos_history_project trigger exists on bio_optimization_history');

-- Trigger function exists
SELECT has_function('public', 'project_bio_optimization_score', ARRAY[]::text[],
  'project_bio_optimization_score() trigger function exists');

-- Insert a row and verify projections
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No auth users available; skipping projection assertions';
    RETURN;
  END IF;

  -- Clean any test rows for this user-day so we own the result
  DELETE FROM public.daily_scores
   WHERE user_id = v_user_id AND date = CURRENT_DATE;

  SET LOCAL role = service_role;
  PERFORM public.compute_bio_optimization_score(
    v_user_id,
    88.88::numeric,
    3::smallint,
    0.960::numeric,
    '{"recovery": 90, "sleep": 88, "trigger_test": true}'::jsonb,
    'v2.0.0-test',
    'recalculation'
  );
  RESET role;
END $$;

-- profiles.bio_optimization_score updated
SELECT results_eq(
  $$
  SELECT bio_optimization_score::numeric
    FROM public.profiles
   WHERE id = (SELECT id FROM auth.users LIMIT 1)
  $$,
  $$ VALUES (88.88::numeric) $$,
  'profiles.bio_optimization_score updated to inserted score'
);

-- daily_scores row exists with bio_optimization_score set
SELECT results_eq(
  $$
  SELECT bio_optimization_score::numeric
    FROM public.daily_scores
   WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
     AND date = CURRENT_DATE
  $$,
  $$ VALUES (88.88::numeric) $$,
  'daily_scores.bio_optimization_score upserted with inserted score'
);

-- daily_scores: other component score columns remain NULL (Q3 narrow projection)
SELECT is_empty(
  $$
  SELECT 1
    FROM public.daily_scores
   WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
     AND date = CURRENT_DATE
     AND (
       recovery_score IS NOT NULL
       OR sleep_score IS NOT NULL
       OR steps_score IS NOT NULL
       OR strain_score IS NOT NULL
       OR exercise_score IS NOT NULL
       OR regimen_score IS NOT NULL
       OR data_source IS NOT NULL
     )
  $$,
  'daily_scores trigger projection only touches bio_optimization_score (Q3)'
);

-- health_scores untouched
SELECT is_empty(
  $$
  SELECT 1
    FROM public.health_scores
   WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  $$,
  'health_scores remains untouched by trigger (Q2)'
);

-- daily_scores row count for the test user-day is exactly 1
SELECT results_eq(
  $$
  SELECT COUNT(*)::int
    FROM public.daily_scores
   WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
     AND date = CURRENT_DATE
  $$,
  $$ VALUES (1) $$,
  'daily_scores upsert produced exactly 1 row for the user-day'
);

SELECT * FROM finish();
ROLLBACK;
