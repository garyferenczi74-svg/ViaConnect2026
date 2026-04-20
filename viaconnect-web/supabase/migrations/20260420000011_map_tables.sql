-- =============================================================================
-- Prompt #100 MAP Pricing Enforcement — table foundation.
-- =============================================================================
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum
--
-- Six tables supporting the MAP enforcement automation. Every MAP
-- query must filter on L1/L2 pricing_tier — §3.1 non-negotiable.
-- =============================================================================

-- 1) map_policies ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.map_policies (
  policy_id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                          UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tier                                TEXT NOT NULL CHECK (tier IN ('L1', 'L2')),
  map_price_cents                     INTEGER NOT NULL CHECK (map_price_cents > 0),
  msrp_cents                          INTEGER NOT NULL CHECK (msrp_cents >= map_price_cents),
  ingredient_cost_floor_cents         INTEGER NOT NULL CHECK (ingredient_cost_floor_cents > 0),
  map_enforcement_start_date          DATE NOT NULL,
  map_exemption_window_start          DATE,
  map_exemption_window_end            DATE,
  map_minimum_discount_pct_allowed    NUMERIC(5,2) NOT NULL DEFAULT 0.00
    CHECK (map_minimum_discount_pct_allowed BETWEEN 0 AND 15),
  map_published_url                   TEXT,
  created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by                          UUID REFERENCES auth.users(id),
  CONSTRAINT map_policies_exemption_window_valid CHECK (
    (map_exemption_window_start IS NULL AND map_exemption_window_end IS NULL)
    OR (map_exemption_window_end > map_exemption_window_start)
  ),
  -- #94 42% margin rule: MAP floor >= ingredient cost floor * 1.72
  CONSTRAINT map_policies_margin_preserved CHECK (
    map_price_cents >= (ingredient_cost_floor_cents * 1.72)::INTEGER
  ),
  UNIQUE (product_id, tier)
);

CREATE INDEX IF NOT EXISTS idx_map_policies_product_tier
  ON public.map_policies(product_id, tier);
CREATE INDEX IF NOT EXISTS idx_map_policies_start_date
  ON public.map_policies(map_enforcement_start_date);

COMMENT ON TABLE public.map_policies IS
  'Per-SKU Minimum Advertised Price policy for L1 + L2 only. L3/L4 are practitioner-priced and MAP-exempt.';

-- 2) map_price_observations -----------------------------------------------
-- Append-only audit trail of every scraped price.
CREATE TABLE IF NOT EXISTS public.map_price_observations (
  observation_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                UUID NOT NULL REFERENCES public.products(id),
  source                    TEXT NOT NULL CHECK (source IN (
    'practitioner_website', 'amazon', 'instagram_shop', 'shopify', 'google_shopping', 'ebay'
  )),
  source_url                TEXT NOT NULL,
  practitioner_id           UUID REFERENCES public.practitioners(id),
  observed_price_cents      INTEGER NOT NULL CHECK (observed_price_cents >= 0),
  observed_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observer_confidence       INTEGER NOT NULL CHECK (observer_confidence BETWEEN 0 AND 100),
  screenshot_storage_path   TEXT,
  raw_html_storage_path     TEXT,
  parser_version            TEXT NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only: reuse the shared block_audit_mutation trigger from
-- migration 20260418000330.
CREATE TRIGGER map_price_observations_append_only
  BEFORE UPDATE OR DELETE ON public.map_price_observations
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();

CREATE INDEX IF NOT EXISTS idx_map_price_observations_product_time
  ON public.map_price_observations(product_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_map_price_observations_practitioner
  ON public.map_price_observations(practitioner_id)
  WHERE practitioner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_map_price_observations_anonymous
  ON public.map_price_observations(observed_at DESC)
  WHERE practitioner_id IS NULL;

COMMENT ON TABLE public.map_price_observations IS
  'Append-only price scrape log. Every monitored source writes here; violation detection reads from here.';

-- 3) map_violations --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.map_violations (
  violation_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id            UUID NOT NULL REFERENCES public.map_price_observations(observation_id),
  product_id                UUID NOT NULL REFERENCES public.products(id),
  practitioner_id           UUID REFERENCES public.practitioners(id),
  policy_id                 UUID NOT NULL REFERENCES public.map_policies(policy_id),
  severity                  TEXT NOT NULL CHECK (severity IN ('yellow', 'orange', 'red', 'black')),
  observed_price_cents      INTEGER NOT NULL,
  map_price_cents           INTEGER NOT NULL,
  discount_pct_below_map    NUMERIC(5,2) NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'notified', 'acknowledged', 'remediated', 'escalated', 'dismissed', 'investigating'
  )),
  grace_period_ends_at      TIMESTAMPTZ NOT NULL,
  remediation_deadline_at   TIMESTAMPTZ NOT NULL,
  notified_at               TIMESTAMPTZ,
  acknowledged_at           TIMESTAMPTZ,
  remediated_at             TIMESTAMPTZ,
  escalated_at              TIMESTAMPTZ,
  dismissed_at              TIMESTAMPTZ,
  dismissal_reason          TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_violations_practitioner_status
  ON public.map_violations(practitioner_id, status);
CREATE INDEX IF NOT EXISTS idx_map_violations_active
  ON public.map_violations(grace_period_ends_at)
  WHERE status IN ('active', 'notified');
CREATE INDEX IF NOT EXISTS idx_map_violations_investigation
  ON public.map_violations(created_at DESC)
  WHERE practitioner_id IS NULL;

COMMENT ON TABLE public.map_violations IS
  'Detected MAP violations. practitioner_id NULL means the listing is anonymous and belongs in the admin investigation queue, not auto-escalated.';

-- 4) map_compliance_scores -------------------------------------------------
-- Uses map_compliance_tier column name to avoid collision with Helix
-- Rewards consumer tier multipliers (same label words, different system).
CREATE TABLE IF NOT EXISTS public.map_compliance_scores (
  score_id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id             UUID NOT NULL REFERENCES public.practitioners(id),
  score                       INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  map_compliance_tier         TEXT NOT NULL CHECK (map_compliance_tier IN (
    'Platinum', 'Gold', 'Silver', 'Bronze', 'Probation'
  )),
  yellow_violations_90d       INTEGER NOT NULL DEFAULT 0,
  orange_violations_90d       INTEGER NOT NULL DEFAULT 0,
  red_violations_90d          INTEGER NOT NULL DEFAULT 0,
  black_violations_90d        INTEGER NOT NULL DEFAULT 0,
  days_since_last_violation   INTEGER NOT NULL DEFAULT 0,
  self_reported_remediations  INTEGER NOT NULL DEFAULT 0,
  calculated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calculated_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (practitioner_id, calculated_date)
);

CREATE INDEX IF NOT EXISTS idx_map_compliance_scores_practitioner_latest
  ON public.map_compliance_scores(practitioner_id, calculated_at DESC);

COMMENT ON TABLE public.map_compliance_scores IS
  'Daily snapshot of practitioner MAP compliance. map_compliance_tier is deliberately distinct from any consumer rewards tier column.';

-- 5) map_policy_change_log -------------------------------------------------
-- Append-only audit of policy edits, 2FA-gated at the app layer.
CREATE TABLE IF NOT EXISTS public.map_policy_change_log (
  change_id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id                   UUID NOT NULL REFERENCES public.map_policies(policy_id),
  changed_by                  UUID NOT NULL REFERENCES auth.users(id),
  change_type                 TEXT NOT NULL CHECK (change_type IN (
    'created', 'price_updated', 'exemption_added', 'exemption_removed', 'retired'
  )),
  previous_value              JSONB,
  new_value                   JSONB NOT NULL,
  admin_2fa_verified_at       TIMESTAMPTZ NOT NULL,
  justification               TEXT NOT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER map_policy_change_log_append_only
  BEFORE UPDATE OR DELETE ON public.map_policy_change_log
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();

CREATE INDEX IF NOT EXISTS idx_map_policy_change_log_policy
  ON public.map_policy_change_log(policy_id, created_at DESC);

COMMENT ON TABLE public.map_policy_change_log IS
  'Append-only audit trail of MAP policy edits. Admin 2FA timestamp captured at write time.';

-- 6) map_remediation_evidence ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.map_remediation_evidence (
  evidence_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id                UUID NOT NULL REFERENCES public.map_violations(violation_id),
  practitioner_id             UUID NOT NULL REFERENCES public.practitioners(id),
  screenshot_storage_path     TEXT NOT NULL,
  url_scanned                 TEXT NOT NULL,
  scanned_price_cents         INTEGER,
  verified_by_system          BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at                 TIMESTAMPTZ,
  practitioner_notes          TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_remediation_evidence_violation
  ON public.map_remediation_evidence(violation_id);

COMMENT ON TABLE public.map_remediation_evidence IS
  'Practitioner-submitted proof of remediation. The verify_remediation edge function re-scans and sets verified_by_system.';

-- Touch-updated_at trigger for map_policies + map_violations
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS map_policies_touch_updated_at ON public.map_policies;
CREATE TRIGGER map_policies_touch_updated_at
  BEFORE UPDATE ON public.map_policies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS map_violations_touch_updated_at ON public.map_violations;
CREATE TRIGGER map_violations_touch_updated_at
  BEFORE UPDATE ON public.map_violations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
