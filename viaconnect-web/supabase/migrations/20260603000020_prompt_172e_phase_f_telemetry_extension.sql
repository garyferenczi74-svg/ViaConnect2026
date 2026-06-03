-- Prompt 172e Phase F: append only telemetry extension + Helix catalog
-- adoption event types.
--
-- Per spec section 12 (telemetry) + section 11 (Helix). Phase F adds
-- three coarse signal columns to the existing 170o hydration_log_sessions
-- table (20pct sampled, service role inserts only) and seeds two new
-- consumer portal Helix earning event types that fire on catalog driven
-- hydration logs only. The legacy 170o quick log button paths (no
-- beverage_slug in the request body) continue to write telemetry rows
-- with NULL beverage_catalog_slug and FALSE caffeine_contributed_flag;
-- they never emit the Phase F Helix events.
--
-- Privacy posture (spec section 12 verbatim): "Telemetry is append only
-- and privacy respecting: beverage category logged, effective volume
-- bucket, caffeine contributed flag, never the safety mode clinical
-- inference and never raw health data beyond what hydration logging
-- already stores." The three Phase F columns satisfy this contract:
--   beverage_catalog_slug      -> category proxy (the slug joins to
--                                 beverage_catalog.category for analytics)
--   effective_volume_bucket    -> coarse 5 range bucket; no raw ml
--   caffeine_contributed_flag  -> boolean only; no raw mg value
-- No safety_mode_enabled column is added. No raw caffeine_mg, sodium_mg,
-- potassium_mg, magnesium_mg, sugar_g, or kcal_per_serving columns are
-- added. No additional user identity columns beyond the existing
-- user_hash are added.
--
-- Append only: ADD COLUMN IF NOT EXISTS for idempotent re runs. No DROP,
-- no ALTER COLUMN, no RENAME. The seed for helix_earning_event_types
-- guards against re run with ON CONFLICT (id) DO NOTHING. Safe to apply
-- against a database that already has the partial column set from a
-- partial earlier run.

-- 1. Telemetry column extension.

ALTER TABLE public.hydration_log_sessions
  ADD COLUMN IF NOT EXISTS beverage_catalog_slug TEXT,
  ADD COLUMN IF NOT EXISTS effective_volume_bucket TEXT,
  ADD COLUMN IF NOT EXISTS caffeine_contributed_flag BOOLEAN NOT NULL DEFAULT FALSE;

-- Enum guard for the effective_volume_bucket values. Matches the spec
-- section 12 verbatim 5 bucket list. CHECK uses IS NULL OR IN (...) so
-- the column stays nullable for legacy 170o rows written before Phase F
-- landed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema='public'
      AND constraint_name='hydration_log_sessions_effective_volume_bucket_check'
  ) THEN
    ALTER TABLE public.hydration_log_sessions
      ADD CONSTRAINT hydration_log_sessions_effective_volume_bucket_check
      CHECK (effective_volume_bucket IS NULL OR effective_volume_bucket IN (
        '0-100ml','100-250ml','250-500ml','500-750ml','750+ml'
      ));
  END IF;
END $$;

-- Partial index for analytics queries on catalog adoption. Restricted to
-- rows where beverage_catalog_slug is not null so the index stays small
-- (legacy 170o rows do not bloat it).
CREATE INDEX IF NOT EXISTS idx_hydration_log_sessions_beverage_catalog_slug
  ON public.hydration_log_sessions(beverage_catalog_slug)
  WHERE beverage_catalog_slug IS NOT NULL;

COMMENT ON COLUMN public.hydration_log_sessions.beverage_catalog_slug IS
  '172e Phase F: nullable catalog row slug for the logged beverage. Joins to beverage_catalog.slug for analytics. NULL for legacy 170o quick log button paths.';
COMMENT ON COLUMN public.hydration_log_sessions.effective_volume_bucket IS
  '172e Phase F: coarse volume bucket per spec section 12. One of 0-100ml, 100-250ml, 250-500ml, 500-750ml, 750+ml. Boundary rule is closed lower, open upper. Never raw ml.';
COMMENT ON COLUMN public.hydration_log_sessions.caffeine_contributed_flag IS
  '172e Phase F: TRUE when the catalog row would have contributed positive caffeine_mg to the 171b model. Never raw mg.';

-- 2. Helix earning event types.

-- nutrivision_hydration_catalog_log mirrors the existing hydration_logged
-- baseline of 1 point. frequency_limit unlimited because the route's
-- 170o 5 minute dedup window + the kill switch gate already cap the
-- emission rate; an app layer once_per_day on every catalog log would
-- starve the engagement signal.
--
-- nutrivision_hydration_catalog_diversity_3 is gamification on catalog
-- adoption per spec section 11. Once per day frequency rides on the
-- earning engine's frequency check so the route does not need its own
-- idempotency query. Points value 5 reflects mild reward; not gambling
-- style.

INSERT INTO public.helix_earning_event_types
  (id, display_name, base_points, category, requires_consumer_tier, is_active, description, frequency_limit)
VALUES
  (
    'nutrivision_hydration_catalog_log',
    'Catalog Beverage Logged',
    1,
    'tracking',
    1,
    true,
    'User logged a hydration intake via the catalog driven beverage picker. Differentiates catalog adoption from the legacy 170o quick log button paths.',
    'unlimited'
  ),
  (
    'nutrivision_hydration_catalog_diversity_3',
    'Three Distinct Beverage Categories Logged Today',
    5,
    'tracking',
    1,
    true,
    'User logged three distinct beverage categories from the catalog in a single day. Fires once per local day via the earning engine frequency check.',
    'once_per_day'
  )
ON CONFLICT (id) DO NOTHING;
