-- Prompt 171b Phase 1: user sleep window columns for the BOS caffeine-timing
-- source slice. Defaults to 23:00-07:00 in application code when both columns
-- are NULL (CAQ Phase 7 not yet completed). Future wearable integration can
-- override these values when Apple Health / Fitbit sleep data is available.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD COLUMN IF NOT EXISTS sleep_start TIME;
    ALTER TABLE public.user_profiles
      ADD COLUMN IF NOT EXISTS sleep_wake TIME;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS sleep_start TIME;
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS sleep_wake TIME;
  END IF;
END $$;
