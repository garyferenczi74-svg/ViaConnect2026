-- ============================================================================
-- Prompt #54: Practitioner Portal Ordering
-- ============================================================================
-- Builds on top of:
--   - 20260326_three_portal_architecture.sql (practitioner_patients table)
--   - 20260407000070_shop_cart_and_orders.sql (shop_cart_items, shop_orders)
--
-- This migration adds:
--   1. shop_pricing_tiers          — per-tier pricing for shop products
--   2. practitioner_recommendations — formal recommendations from
--                                     practitioners/naturopaths to patients
--                                     (peptides, supplements, tests)
--   3. ALTER shop_orders            — add patient_id + placed_by_practitioner_id
--                                     for orders placed on behalf of patients
--   4. ALTER shop_cart_items        — add patient_id + pricing_tier for
--                                     practitioner-mode patient-scoped carts
--
-- Notes
--   - practitioner_patients is NOT created here. The existing table has a
--     richer schema with granular permission flags (can_view_supplements,
--     can_prescribe_protocols, can_order_panels, etc.) that we will read
--     from instead.
--   - Append-only. No existing migrations modified.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. shop_pricing_tiers
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('consumer', 'practitioner', 'naturopath')),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_slug, tier)
);

CREATE INDEX IF NOT EXISTS idx_shop_pricing_tiers_slug
  ON shop_pricing_tiers (product_slug, tier)
  WHERE is_active = true;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. practitioner_recommendations
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS practitioner_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Practitioner role at time of recommendation. Used to enforce
  -- naturopath-cannot-prescribe rule on the application side.
  practitioner_role TEXT NOT NULL DEFAULT 'practitioner'
    CHECK (practitioner_role IN ('practitioner', 'naturopath')),
  product_slug TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL
    CHECK (product_type IN ('supplement', 'genetic_test', 'peptide', 'custom_package')),
  recommendation_type TEXT NOT NULL DEFAULT 'suggested'
    CHECK (recommendation_type IN ('prescribed', 'suggested', 'informational')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  notes TEXT,
  dosing_instructions TEXT,
  delivery_form TEXT,
  duration_days INTEGER CHECK (duration_days IS NULL OR duration_days > 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'discontinued', 'patient_declined')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pract_recs_practitioner
  ON practitioner_recommendations (practitioner_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pract_recs_patient
  ON practitioner_recommendations (patient_id, status, created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. ALTER shop_orders — patient + practitioner attribution
-- ────────────────────────────────────────────────────────────────────────────
-- Both columns are nullable: existing consumer orders have neither set.
-- A practitioner-placed order has both set; a naturopath-placed order has
-- both set (placed_by_practitioner_id is the placing user regardless of role).
ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS placed_by_practitioner_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_shop_orders_patient_id
  ON shop_orders (patient_id, created_at DESC)
  WHERE patient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_orders_placed_by
  ON shop_orders (placed_by_practitioner_id, created_at DESC)
  WHERE placed_by_practitioner_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. ALTER shop_cart_items — patient-scoped carts with tier pricing
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE shop_cart_items
  ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS pricing_tier TEXT NOT NULL DEFAULT 'consumer'
    CHECK (pricing_tier IN ('consumer', 'practitioner', 'naturopath'));

-- The original shop_cart_items uniqueness was (user_id, product_slug,
-- COALESCE(delivery_form, '')). For practitioner carts we need uniqueness
-- per (user_id, patient_id, product_slug, delivery_form) so a practitioner
-- can hold separate carts for different patients simultaneously.
DROP INDEX IF EXISTS shop_cart_items_user_slug_form_uniq;
CREATE UNIQUE INDEX IF NOT EXISTS shop_cart_items_user_patient_slug_form_uniq
  ON shop_cart_items (
    user_id,
    COALESCE(patient_id::text, ''),
    product_slug,
    COALESCE(delivery_form, '')
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Row-level security
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE shop_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioner_recommendations ENABLE ROW LEVEL SECURITY;

-- Pricing: any authenticated user can read active tiers (tier-specific
-- pricing display). Inserts/updates restricted to service_role.
DROP POLICY IF EXISTS "anyone reads active pricing" ON shop_pricing_tiers;
CREATE POLICY "anyone reads active pricing"
  ON shop_pricing_tiers
  FOR SELECT
  USING (is_active = true);

-- Recommendations: practitioners read+write their own, patients read theirs.
DROP POLICY IF EXISTS "practitioners manage own recommendations" ON practitioner_recommendations;
CREATE POLICY "practitioners manage own recommendations"
  ON practitioner_recommendations
  FOR ALL
  USING (auth.uid() = practitioner_id)
  WITH CHECK (auth.uid() = practitioner_id);

DROP POLICY IF EXISTS "patients see own recommendations" ON practitioner_recommendations;
CREATE POLICY "patients see own recommendations"
  ON practitioner_recommendations
  FOR SELECT
  USING (auth.uid() = patient_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 6. updated_at trigger for the new tables
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION pract_ordering_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pricing_tiers_touch_updated ON shop_pricing_tiers;
CREATE TRIGGER pricing_tiers_touch_updated
  BEFORE UPDATE ON shop_pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION pract_ordering_touch_updated_at();

DROP TRIGGER IF EXISTS pract_recs_touch_updated ON practitioner_recommendations;
CREATE TRIGGER pract_recs_touch_updated
  BEFORE UPDATE ON practitioner_recommendations
  FOR EACH ROW EXECUTE FUNCTION pract_ordering_touch_updated_at();
