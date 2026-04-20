-- =============================================================================
-- Prompt #101 Workstream C — manual_customers + VIP exemptions + sensitive notes.
-- =============================================================================
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum
--
-- customer_client_id FK targets public.clients which is NOT LIVE yet
-- (blocked on #99 addendum). We keep customer_client_id as a plain UUID
-- WITHOUT a FK constraint so the column is future-proof; application
-- code validates existence when clients lands.
-- =============================================================================

-- Manual customer records for clinic-only patients without consumer accounts.
CREATE TABLE IF NOT EXISTS public.manual_customers (
  manual_customer_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id           UUID NOT NULL REFERENCES public.practitioners(id),
  display_name              TEXT NOT NULL,
  id_verification_doc_path  TEXT NOT NULL,
  relationship_notes        TEXT,
  verified_by_admin_at      TIMESTAMPTZ,
  verified_by_admin_user    UUID REFERENCES auth.users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_customers_practitioner
  ON public.manual_customers(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_manual_customers_pending_verification
  ON public.manual_customers(created_at DESC) WHERE verified_by_admin_at IS NULL;

COMMENT ON TABLE public.manual_customers IS
  'Clinic-only patients without a ViaConnect consumer account. Eligible for VIP exemption once verified_by_admin_at is set.';

-- VIP exemption enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='map_vip_exemption_reason') THEN
    CREATE TYPE public.map_vip_exemption_reason AS ENUM (
      'long_term_patient','immediate_family','documented_financial_hardship',
      'returning_chronic_illness_subscription','clinical_trial_compassionate_use','other_documented'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='map_vip_exemption_status') THEN
    CREATE TYPE public.map_vip_exemption_status AS ENUM (
      'pending_approval','active','expired_auto','revoked','rejected'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.map_vip_exemptions (
  vip_exemption_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id               UUID NOT NULL REFERENCES public.practitioners(id),
  -- customer_client_id references the not-yet-live public.clients table.
  -- No FK constraint until clients lands; application validates presence.
  customer_client_id            UUID,
  manual_customer_id            UUID REFERENCES public.manual_customers(manual_customer_id),
  customer_verification_doc_path TEXT,
  product_id                    UUID NOT NULL REFERENCES public.products(id),
  tier                          TEXT NOT NULL CHECK (tier IN ('L1','L2')),
  exempted_price_cents          INTEGER NOT NULL CHECK (exempted_price_cents > 0),
  ingredient_cost_floor_cents   INTEGER NOT NULL,
  reason                        public.map_vip_exemption_reason NOT NULL,
  status                        public.map_vip_exemption_status NOT NULL DEFAULT 'pending_approval',
  exemption_start_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exemption_end_at              TIMESTAMPTZ NOT NULL,
  last_order_at                 TIMESTAMPTZ,
  auto_expiry_at                TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '180 days'),
  requested_by                  UUID NOT NULL REFERENCES auth.users(id),
  reviewed_by                   UUID REFERENCES auth.users(id),
  reviewed_at                   TIMESTAMPTZ,
  revoked_at                    TIMESTAMPTZ,
  revoked_by                    UUID REFERENCES auth.users(id),
  revocation_reason             TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vip_exemption_has_customer
    CHECK (customer_client_id IS NOT NULL OR manual_customer_id IS NOT NULL),
  CONSTRAINT vip_exemption_not_both
    CHECK (NOT (customer_client_id IS NOT NULL AND manual_customer_id IS NOT NULL)),
  CONSTRAINT vip_exemption_window_max_180
    CHECK ((exemption_end_at - exemption_start_at) <= INTERVAL '180 days'),
  CONSTRAINT vip_exemption_margin_preserved
    CHECK (exempted_price_cents >= (ingredient_cost_floor_cents * 1.72)::INTEGER)
);

CREATE INDEX IF NOT EXISTS idx_map_vip_exemptions_practitioner_status
  ON public.map_vip_exemptions(practitioner_id, status);
CREATE INDEX IF NOT EXISTS idx_map_vip_exemptions_customer
  ON public.map_vip_exemptions(customer_client_id) WHERE customer_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_map_vip_exemptions_manual_customer
  ON public.map_vip_exemptions(manual_customer_id) WHERE manual_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_map_vip_exemptions_auto_expiry
  ON public.map_vip_exemptions(auto_expiry_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_map_vip_exemptions_pending
  ON public.map_vip_exemptions(created_at DESC) WHERE status = 'pending_approval';

-- Reject VIP exemptions on L3/L4 products
CREATE OR REPLACE FUNCTION public.enforce_vip_exemption_tier()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE product_tier TEXT;
BEGIN
  SELECT pricing_tier INTO product_tier FROM public.products WHERE id = NEW.product_id;
  IF product_tier IS NULL THEN
    RAISE EXCEPTION 'MAP_WAIVER_INVALID_TIER: product % not found', NEW.product_id USING ERRCODE='P0001';
  END IF;
  IF product_tier NOT IN ('L1','L2') THEN
    RAISE EXCEPTION 'MAP_WAIVER_INVALID_TIER: VIP exemption cannot target % tier', product_tier USING ERRCODE='P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_vip_exemption_tier ON public.map_vip_exemptions;
CREATE TRIGGER trg_enforce_vip_exemption_tier
  BEFORE INSERT OR UPDATE ON public.map_vip_exemptions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vip_exemption_tier();

-- Max 5 concurrent active VIP exemptions per practitioner
CREATE OR REPLACE FUNCTION public.enforce_max_concurrent_vip_exemptions()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' THEN
    IF (SELECT COUNT(*) FROM public.map_vip_exemptions
        WHERE practitioner_id = NEW.practitioner_id
          AND status = 'active'
          AND vip_exemption_id != NEW.vip_exemption_id) >= 5 THEN
      RAISE EXCEPTION 'Practitioner already has 5 concurrent active VIP exemptions (max allowed)' USING ERRCODE='P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_concurrent_vip_exemptions ON public.map_vip_exemptions;
CREATE TRIGGER trg_enforce_max_concurrent_vip_exemptions
  BEFORE INSERT OR UPDATE OF status ON public.map_vip_exemptions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_max_concurrent_vip_exemptions();

DROP TRIGGER IF EXISTS trg_map_vip_exemptions_touch_updated_at ON public.map_vip_exemptions;
CREATE TRIGGER trg_map_vip_exemptions_touch_updated_at
  BEFORE UPDATE ON public.map_vip_exemptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Sensitive notes, encrypted at rest via pgcrypto
CREATE TABLE IF NOT EXISTS public.map_vip_exemption_sensitive_notes (
  note_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_exemption_id      UUID NOT NULL REFERENCES public.map_vip_exemptions(vip_exemption_id) ON DELETE CASCADE,
  encrypted_content     BYTEA NOT NULL,
  content_hash          TEXT NOT NULL,
  created_by            UUID NOT NULL REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_vip_exemption_sensitive_notes_exemption
  ON public.map_vip_exemption_sensitive_notes(vip_exemption_id);

COMMENT ON TABLE public.map_vip_exemption_sensitive_notes IS
  'Encrypted PII justifications (medical hardship, financial hardship). Access restricted to admin + compliance_officer + owning practitioner via RLS.';
