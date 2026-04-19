-- Prompt #92 Phase 2: earning engine schema additions (append-only)

ALTER TABLE public.helix_transactions
  ADD COLUMN IF NOT EXISTS event_type_id TEXT REFERENCES public.helix_earning_event_types(id),
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS helix_tier_at_time TEXT,
  ADD COLUMN IF NOT EXISTS pool_type TEXT CHECK (pool_type IS NULL OR pool_type IN ('individual','shared_family')),
  ADD COLUMN IF NOT EXISTS source_user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_helix_transactions_event_type ON public.helix_transactions(event_type_id) WHERE event_type_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_helix_transactions_source_user ON public.helix_transactions(source_user_id) WHERE source_user_id IS NOT NULL;

ALTER TABLE public.helix_redemptions
  ADD COLUMN IF NOT EXISTS catalog_item_id TEXT,
  ADD COLUMN IF NOT EXISTS application_context JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_helix_redemptions_catalog ON public.helix_redemptions(catalog_item_id) WHERE catalog_item_id IS NOT NULL;
