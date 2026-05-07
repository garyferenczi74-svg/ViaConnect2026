-- =============================================================================
-- Prompt #85d: Body Composition section rebuild — rename 4 measurement
-- columns to match the canonical 12-point list, drop the hip column.
-- =============================================================================
-- Renames (idempotent via information_schema check):
--   right_upper_arm    -> right_bicep
--   left_upper_arm     -> left_bicep
--   right_upper_thigh  -> right_quadriceps
--   left_upper_thigh   -> left_quadriceps
-- Drop:
--   hip
--
-- WHR bonus in score-engine continues to work by re-sourcing hip from the
-- legacy body_tracker_weight.hips_in column (kept per #85b superseded note).
-- =============================================================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'body_tracker_circumference'
      AND column_name = 'right_upper_arm'
  ) THEN
    ALTER TABLE public.body_tracker_circumference
      RENAME COLUMN right_upper_arm TO right_bicep;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'body_tracker_circumference'
      AND column_name = 'left_upper_arm'
  ) THEN
    ALTER TABLE public.body_tracker_circumference
      RENAME COLUMN left_upper_arm TO left_bicep;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'body_tracker_circumference'
      AND column_name = 'right_upper_thigh'
  ) THEN
    ALTER TABLE public.body_tracker_circumference
      RENAME COLUMN right_upper_thigh TO right_quadriceps;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'body_tracker_circumference'
      AND column_name = 'left_upper_thigh'
  ) THEN
    ALTER TABLE public.body_tracker_circumference
      RENAME COLUMN left_upper_thigh TO left_quadriceps;
  END IF;
END $$;

ALTER TABLE public.body_tracker_circumference
  DROP COLUMN IF EXISTS hip;

COMMENT ON COLUMN public.body_tracker_circumference.right_bicep IS
  'Renamed from right_upper_arm in Prompt #85d (2026-05-07).';
COMMENT ON COLUMN public.body_tracker_circumference.left_bicep IS
  'Renamed from left_upper_arm in Prompt #85d (2026-05-07).';
COMMENT ON COLUMN public.body_tracker_circumference.right_quadriceps IS
  'Renamed from right_upper_thigh in Prompt #85d (2026-05-07).';
COMMENT ON COLUMN public.body_tracker_circumference.left_quadriceps IS
  'Renamed from left_upper_thigh in Prompt #85d (2026-05-07).';

COMMENT ON TABLE public.body_tracker_circumference IS
  'Prompt #85d: 12-point manual circumference measurement system. Hip removed; WHR scoring re-sources hip from body_tracker_weight.hips_in.';
