-- =============================================================================
-- Prompt #101 Phase 2 monitoring — extend map_price_observations from #100.
-- =============================================================================
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum
--
-- Adds phase tagging, parser-level practitioner attribution confidence,
-- chat/post context archival path, and flash-sale detection hooks.
-- Also extends the source CHECK constraint with the 6 Phase 2 sources.
-- =============================================================================

ALTER TABLE public.map_price_observations
  ADD COLUMN IF NOT EXISTS phase INTEGER NOT NULL DEFAULT 1 CHECK (phase IN (1, 2));
ALTER TABLE public.map_price_observations
  ADD COLUMN IF NOT EXISTS practitioner_confidence INTEGER CHECK (practitioner_confidence BETWEEN 0 AND 100);
ALTER TABLE public.map_price_observations
  ADD COLUMN IF NOT EXISTS post_context_storage_path TEXT;
ALTER TABLE public.map_price_observations
  ADD COLUMN IF NOT EXISTS is_flash_sale BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.map_price_observations
  ADD COLUMN IF NOT EXISTS flash_sale_ends_at TIMESTAMPTZ;

-- Extend source CHECK: drop old, recreate with Phase 1 + Phase 2 sources
ALTER TABLE public.map_price_observations
  DROP CONSTRAINT IF EXISTS map_price_observations_source_check;

ALTER TABLE public.map_price_observations
  ADD CONSTRAINT map_price_observations_source_check CHECK (source IN (
    'practitioner_website', 'amazon', 'instagram_shop', 'shopify', 'google_shopping', 'ebay',
    'walmart', 'tiktok_shop', 'instagram_organic', 'facebook_marketplace', 'telegram_discord', 'reddit'
  ));

CREATE INDEX IF NOT EXISTS idx_map_price_observations_phase
  ON public.map_price_observations(phase, observed_at DESC);

COMMENT ON COLUMN public.map_price_observations.phase IS
  '1 = Phase 1 commerce sources (#100). 2 = Phase 2 social + marketplace sources (#101), subject to human review gate and practitioner_confidence threshold.';
COMMENT ON COLUMN public.map_price_observations.practitioner_confidence IS
  'Phase 2: parser confidence that this listing is attributable to the referenced practitioner (0 to 100). Observations below 90 enter the admin investigation queue, never auto-escalate.';
COMMENT ON COLUMN public.map_price_observations.is_flash_sale IS
  'TikTok Shop / Amazon Lightning Deal flag. Violations during the flash-sale window are suppressed per §3.4 fairness rule.';
