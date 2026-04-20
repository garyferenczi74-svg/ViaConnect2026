-- =============================================================================
-- Prompt #101 Workstream B — practitioner-initiated MAP waivers.
-- =============================================================================
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum
-- Scope: L1 + L2 only. L3/L4 cannot carry a waiver — enforced at DB level.
-- =============================================================================

-- Enums -------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='map_waiver_type') THEN
    CREATE TYPE public.map_waiver_type AS ENUM (
      'seasonal_promotion',
      'charity_event',
      'clinic_in_person_only',
      'clinical_study_recruitment',
      'new_patient_onboarding'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='map_waiver_status') THEN
    CREATE TYPE public.map_waiver_status AS ENUM (
      'draft','pending_approval','info_requested','active','expired','revoked','rejected'
    );
  END IF;
END $$;

-- Core table --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.map_waivers (
  waiver_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id           UUID NOT NULL REFERENCES public.practitioners(id),
  waiver_type               public.map_waiver_type NOT NULL,
  status                    public.map_waiver_status NOT NULL DEFAULT 'draft',
  scope_description         TEXT NOT NULL,
  scope_urls                JSONB NOT NULL DEFAULT '[]'::JSONB,
  scope_physical_locations  JSONB,
  waiver_start_at           TIMESTAMPTZ NOT NULL,
  waiver_end_at             TIMESTAMPTZ NOT NULL,
  justification             TEXT NOT NULL CHECK (length(justification) BETWEEN 100 AND 2000),
  requested_by              UUID NOT NULL REFERENCES auth.users(id),
  reviewed_by               UUID REFERENCES auth.users(id),
  reviewed_at               TIMESTAMPTZ,
  review_notes              TEXT,
  rejection_reason          TEXT,
  revoked_by                UUID REFERENCES auth.users(id),
  revoked_at                TIMESTAMPTZ,
  revocation_reason         TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT map_waivers_valid_window CHECK (waiver_end_at > waiver_start_at),
  CONSTRAINT map_waivers_duration_within_limit CHECK (
    (waiver_type = 'seasonal_promotion' AND (waiver_end_at - waiver_start_at) <= INTERVAL '60 days')
    OR (waiver_type = 'charity_event' AND (waiver_end_at - waiver_start_at) <= INTERVAL '14 days')
    OR (waiver_type = 'clinic_in_person_only' AND (waiver_end_at - waiver_start_at) <= INTERVAL '90 days')
    OR (waiver_type = 'clinical_study_recruitment' AND (waiver_end_at - waiver_start_at) <= INTERVAL '180 days')
    OR (waiver_type = 'new_patient_onboarding' AND (waiver_end_at - waiver_start_at) <= INTERVAL '30 days')
  )
);

CREATE INDEX IF NOT EXISTS idx_map_waivers_practitioner_status
  ON public.map_waivers(practitioner_id, status);
CREATE INDEX IF NOT EXISTS idx_map_waivers_active_window
  ON public.map_waivers(waiver_start_at, waiver_end_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_map_waivers_pending_review
  ON public.map_waivers(created_at DESC) WHERE status = 'pending_approval';

-- Per-SKU waiver lines ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.map_waiver_skus (
  waiver_sku_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waiver_id                     UUID NOT NULL REFERENCES public.map_waivers(waiver_id) ON DELETE CASCADE,
  product_id                    UUID NOT NULL REFERENCES public.products(id),
  tier                          TEXT NOT NULL CHECK (tier IN ('L1','L2')),
  waived_price_cents            INTEGER NOT NULL CHECK (waived_price_cents > 0),
  ingredient_cost_floor_cents   INTEGER NOT NULL,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT map_waiver_skus_margin_preserved
    CHECK (waived_price_cents >= (ingredient_cost_floor_cents * 1.72)::INTEGER),
  UNIQUE (waiver_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_map_waiver_skus_waiver ON public.map_waiver_skus(waiver_id);
CREATE INDEX IF NOT EXISTS idx_map_waiver_skus_product ON public.map_waiver_skus(product_id);

-- Evidence attachments ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.map_waiver_evidence (
  evidence_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waiver_id         UUID NOT NULL REFERENCES public.map_waivers(waiver_id) ON DELETE CASCADE,
  evidence_type     TEXT NOT NULL CHECK (evidence_type IN (
    'charity_documentation','irb_approval','clinic_location_proof','campaign_plan','study_protocol','other'
  )),
  storage_path      TEXT NOT NULL,
  uploaded_by       UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_waiver_evidence_waiver ON public.map_waiver_evidence(waiver_id);

-- L1/L2 scope guard: reject waiver SKUs targeting L3 or L4 products
CREATE OR REPLACE FUNCTION public.enforce_waiver_sku_tier()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE product_tier TEXT;
BEGIN
  SELECT pricing_tier INTO product_tier FROM public.products WHERE id = NEW.product_id;
  IF product_tier IS NULL THEN
    RAISE EXCEPTION 'MAP_WAIVER_INVALID_TIER: product % not found', NEW.product_id USING ERRCODE='P0001';
  END IF;
  IF product_tier NOT IN ('L1','L2') THEN
    RAISE EXCEPTION 'MAP_WAIVER_INVALID_TIER: waiver cannot target % tier (L3 + L4 are MAP-exempt)', product_tier USING ERRCODE='P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_waiver_sku_tier ON public.map_waiver_skus;
CREATE TRIGGER trg_enforce_waiver_sku_tier
  BEFORE INSERT OR UPDATE ON public.map_waiver_skus
  FOR EACH ROW EXECUTE FUNCTION public.enforce_waiver_sku_tier();

-- Max 3 concurrent active waivers per practitioner
CREATE OR REPLACE FUNCTION public.enforce_max_concurrent_waivers()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' THEN
    IF (SELECT COUNT(*) FROM public.map_waivers
        WHERE practitioner_id = NEW.practitioner_id
          AND status = 'active'
          AND waiver_id != NEW.waiver_id) >= 3 THEN
      RAISE EXCEPTION 'Practitioner already has 3 concurrent active waivers (max allowed)' USING ERRCODE='P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_concurrent_waivers ON public.map_waivers;
CREATE TRIGGER trg_enforce_max_concurrent_waivers
  BEFORE INSERT OR UPDATE OF status ON public.map_waivers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_max_concurrent_waivers();

-- Touch updated_at
DROP TRIGGER IF EXISTS trg_map_waivers_touch_updated_at ON public.map_waivers;
CREATE TRIGGER trg_map_waivers_touch_updated_at
  BEFORE UPDATE ON public.map_waivers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.map_waivers IS
  'Practitioner-initiated temporary MAP exemption. Max 3 concurrent active per practitioner; L1/L2 only; margin-preserved at SKU level.';
