-- =============================================================================
-- Prompt #98 Phase 1: Practitioner Referral Program data model
-- =============================================================================
-- Append-only. Eleven tables that scaffold the B2B2B practitioner referral
-- program plus 2 SECURITY DEFINER lookup/insert RPCs and 2 triggers
-- (ledger immutability + balance maintenance).
--
--   1.  practitioner_referral_codes                    one persistent code per practitioner
--   2.  practitioner_referral_link_clicks              anonymous click tracking
--   3.  practitioner_referral_attributions             one per referred practitioner (UNIQUE)
--   4.  practitioner_referral_milestones               4-row seed (reward ladder)
--   5.  practitioner_referral_milestone_events         one per (attribution, milestone)
--   6.  practitioner_referral_credit_ledger            immutable append-only
--   7.  practitioner_referral_credit_balances          materialized view (trigger-maintained)
--   8.  practitioner_referral_fraud_flags              admin review queue
--   9.  practitioner_referral_tax_earnings             per-tax-year aggregates ($600 threshold)
--   10. practitioner_referral_status_tiers             private bronze/silver/gold
--   11. practitioner_referral_notification_preferences referred-practitioner privacy
--
-- All tables RLS-protected: practitioner self-read on own rows, admin all.
-- Credit ledger UPDATE/DELETE blocked at trigger so the audit trail
-- survives any future RLS or application-layer regression. Self-referral
-- prevented via attribution CHECK plus multi-signal screening at
-- attribution time (Phase 2).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Referral codes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practitioner_referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE RESTRICT UNIQUE,

  code TEXT NOT NULL UNIQUE,
  code_slug TEXT NOT NULL UNIQUE,

  is_active BOOLEAN NOT NULL DEFAULT true,
  deactivated_reason TEXT,
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID REFERENCES auth.users(id),

  cached_total_clicks INTEGER NOT NULL DEFAULT 0,
  cached_total_attributions INTEGER NOT NULL DEFAULT 0,
  cached_total_successful_referrals INTEGER NOT NULL DEFAULT 0,
  cached_total_credits_earned_cents INTEGER NOT NULL DEFAULT 0,
  cached_updated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.practitioner_referral_codes IS
  'One persistent referral code per practitioner. Code is stable for life of enrollment; deactivated if practitioner is terminated. Never reassigned to another practitioner.';

CREATE INDEX IF NOT EXISTS idx_ref_codes_active
  ON public.practitioner_referral_codes(code_slug) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ref_codes_practitioner
  ON public.practitioner_referral_codes(practitioner_id);

ALTER TABLE public.practitioner_referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ref_codes_self_read ON public.practitioner_referral_codes;
CREATE POLICY ref_codes_self_read
  ON public.practitioner_referral_codes FOR SELECT TO authenticated
  USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS ref_codes_admin_all ON public.practitioner_referral_codes;
CREATE POLICY ref_codes_admin_all
  ON public.practitioner_referral_codes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Anonymous lookup for the public landing page (no logged-in user).
CREATE OR REPLACE FUNCTION public.lookup_referral_code_for_attribution(p_code_slug TEXT)
RETURNS TABLE(code_id UUID, practitioner_id UUID, is_active BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT id, practitioner_id, is_active
    FROM public.practitioner_referral_codes
   WHERE code_slug = p_code_slug;
$$;
REVOKE ALL ON FUNCTION public.lookup_referral_code_for_attribution(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_referral_code_for_attribution(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Link clicks (anonymous)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practitioner_referral_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES public.practitioner_referral_codes(id),

  visitor_uuid UUID NOT NULL,
  ip_address_hash TEXT,
  user_agent_hash TEXT,

  landing_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer_url TEXT,

  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  converted_to_attribution BOOLEAN NOT NULL DEFAULT false,
  attribution_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.practitioner_referral_link_clicks IS
  'Anonymous click tracking for referral links. IP and user agent stored as hashes for deduplication without PII retention. Used for attribution resolution and analytics.';

CREATE INDEX IF NOT EXISTS idx_ref_clicks_visitor_uuid
  ON public.practitioner_referral_link_clicks(visitor_uuid);
CREATE INDEX IF NOT EXISTS idx_ref_clicks_code
  ON public.practitioner_referral_link_clicks(referral_code_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_ref_clicks_unconverted
  ON public.practitioner_referral_link_clicks(clicked_at)
  WHERE converted_to_attribution = false;

ALTER TABLE public.practitioner_referral_link_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ref_clicks_admin_read ON public.practitioner_referral_link_clicks;
CREATE POLICY ref_clicks_admin_read
  ON public.practitioner_referral_link_clicks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION public.record_referral_link_click(
  p_code_slug TEXT,
  p_visitor_uuid UUID,
  p_ip_hash TEXT,
  p_user_agent_hash TEXT,
  p_landing_url TEXT,
  p_utm_source TEXT,
  p_utm_medium TEXT,
  p_utm_campaign TEXT,
  p_referrer_url TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_code_id UUID;
  v_click_id UUID;
BEGIN
  SELECT id INTO v_code_id
    FROM public.practitioner_referral_codes
   WHERE code_slug = p_code_slug AND is_active = true;

  IF v_code_id IS NULL THEN
    RETURN NULL;     -- Unknown or inactive code: silently no-op
  END IF;

  INSERT INTO public.practitioner_referral_link_clicks (
    referral_code_id, visitor_uuid, ip_address_hash, user_agent_hash,
    landing_url, utm_source, utm_medium, utm_campaign, referrer_url
  ) VALUES (
    v_code_id, p_visitor_uuid, p_ip_hash, p_user_agent_hash,
    p_landing_url, p_utm_source, p_utm_medium, p_utm_campaign, p_referrer_url
  ) RETURNING id INTO v_click_id;

  RETURN v_click_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_referral_link_click(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_referral_link_click(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Attributions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practitioner_referral_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES public.practitioner_referral_codes(id),
  referring_practitioner_id UUID NOT NULL REFERENCES public.practitioners(id),
  referred_practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) UNIQUE,

  first_click_id UUID REFERENCES public.practitioner_referral_link_clicks(id),
  first_click_at TIMESTAMPTZ,
  attributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  days_from_first_click_to_signup INTEGER,

  status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN (
    'pending_verification',
    'verified_active',
    'blocked_self_referral',
    'blocked_fraud_suspected',
    'voided'
  )),

  self_referral_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  fraud_signals JSONB NOT NULL DEFAULT '{}'::jsonb,

  referred_first_month_discount_redeemed BOOLEAN NOT NULL DEFAULT false,
  referred_first_month_discount_redeemed_at TIMESTAMPTZ,
  referred_cert_discount_redeemed BOOLEAN NOT NULL DEFAULT false,
  referred_cert_discount_redeemed_at TIMESTAMPTZ,

  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES auth.users(id),
  voided_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (referring_practitioner_id != referred_practitioner_id)
);

COMMENT ON TABLE public.practitioner_referral_attributions IS
  'One attribution per referred practitioner (UNIQUE). First-click wins when multiple referrers have links clicked by same visitor. CHECK prevents trivial self-referral; multi-signal matching catches non-trivial cases at insert time.';

CREATE INDEX IF NOT EXISTS idx_ref_attr_referring
  ON public.practitioner_referral_attributions(referring_practitioner_id, status);
CREATE INDEX IF NOT EXISTS idx_ref_attr_referred
  ON public.practitioner_referral_attributions(referred_practitioner_id);
CREATE INDEX IF NOT EXISTS idx_ref_attr_pending
  ON public.practitioner_referral_attributions(status) WHERE status = 'pending_verification';

ALTER TABLE public.practitioner_referral_attributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ref_attr_referring_read ON public.practitioner_referral_attributions;
CREATE POLICY ref_attr_referring_read
  ON public.practitioner_referral_attributions FOR SELECT TO authenticated
  USING (referring_practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS ref_attr_referred_read ON public.practitioner_referral_attributions;
CREATE POLICY ref_attr_referred_read
  ON public.practitioner_referral_attributions FOR SELECT TO authenticated
  USING (referred_practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS ref_attr_admin_all ON public.practitioner_referral_attributions;
CREATE POLICY ref_attr_admin_all
  ON public.practitioner_referral_attributions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 4. Milestone definitions (4-row seed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practitioner_referral_milestones (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_amount_cents INTEGER NOT NULL CHECK (reward_amount_cents >= 0),
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.practitioner_referral_milestones (id, display_name, description, reward_amount_cents, sort_order)
VALUES
  ('activation_and_first_purchase',
   'Activation + First Wholesale Purchase',
   'Referred practitioner subscribes to Standard Portal or White-Label Platform tier AND completes first wholesale purchase of $500 or more.',
   20000, 1),
  ('master_certification_complete',
   'Master Practitioner Certification Complete',
   'Referred practitioner completes Level 3 Master Practitioner certification.',
   50000, 2),
  ('level_3_white_label_first_delivery',
   'Level 3 White-Label First Production Delivered',
   'Referred practitioner enrolls in Level 3 White-Label AND takes delivery of first production order.',
   100000, 3),
  ('level_4_first_formulation_approved',
   'Level 4 Custom Formulation First Approval',
   'Referred practitioner enrolls in Level 4 Custom Formulations AND first custom formulation is approved.',
   200000, 4)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.practitioner_referral_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ref_milestones_read_all ON public.practitioner_referral_milestones;
CREATE POLICY ref_milestones_read_all
  ON public.practitioner_referral_milestones FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS ref_milestones_admin_all ON public.practitioner_referral_milestones;
CREATE POLICY ref_milestones_admin_all
  ON public.practitioner_referral_milestones FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 5. Milestone events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practitioner_referral_milestone_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribution_id UUID NOT NULL REFERENCES public.practitioner_referral_attributions(id),
  milestone_id TEXT NOT NULL REFERENCES public.practitioner_referral_milestones(id),

  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,

  vesting_status TEXT NOT NULL DEFAULT 'pending_hold' CHECK (vesting_status IN (
    'pending_hold', 'vested', 'voided_fraud', 'voided_admin'
  )),
  hold_expires_at TIMESTAMPTZ NOT NULL,
  vested_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  voided_reason TEXT,

  credit_ledger_entry_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (attribution_id, milestone_id)
);

COMMENT ON TABLE public.practitioner_referral_milestone_events IS
  'One row per (attribution, milestone). UNIQUE prevents double-vesting. 30-day fraud hold between achievement and vesting allows admin review. Voided events do not produce a ledger entry.';

CREATE INDEX IF NOT EXISTS idx_ref_milestone_events_attribution
  ON public.practitioner_referral_milestone_events(attribution_id);
CREATE INDEX IF NOT EXISTS idx_ref_milestone_events_holds_expiring
  ON public.practitioner_referral_milestone_events(hold_expires_at)
  WHERE vesting_status = 'pending_hold';

ALTER TABLE public.practitioner_referral_milestone_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ref_milestone_events_referrer_read ON public.practitioner_referral_milestone_events;
CREATE POLICY ref_milestone_events_referrer_read
  ON public.practitioner_referral_milestone_events FOR SELECT TO authenticated
  USING (attribution_id IN (
    SELECT id FROM public.practitioner_referral_attributions
     WHERE referring_practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS ref_milestone_events_admin_all ON public.practitioner_referral_milestone_events;
CREATE POLICY ref_milestone_events_admin_all
  ON public.practitioner_referral_milestone_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 6. Credit ledger (immutable append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practitioner_referral_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id),

  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'earned_from_milestone',
    'applied_to_subscription',
    'applied_to_wholesale_order',
    'applied_to_certification_fee',
    'applied_to_level_3_fee',
    'applied_to_level_4_fee',
    'expired',
    'voided_fraud',
    'voided_admin',
    'admin_adjustment'
  )),

  amount_cents INTEGER NOT NULL,
  running_balance_cents INTEGER NOT NULL,

  milestone_event_id UUID REFERENCES public.practitioner_referral_milestone_events(id),
  applied_to_reference_type TEXT,
  applied_to_reference_id UUID,

  admin_actor_id UUID REFERENCES auth.users(id),
  admin_reason TEXT,

  tax_year INTEGER,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.practitioner_referral_credit_ledger IS
  'Immutable append-only ledger. Positive amount_cents for credit-in (earned, admin_adjustment positive); negative for credit-out (applied_*, expired, voided_*, admin_adjustment negative). running_balance_cents caches post-entry balance for fast lookups but must reconcile to derived sum.';

CREATE INDEX IF NOT EXISTS idx_credit_ledger_practitioner
  ON public.practitioner_referral_credit_ledger(practitioner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_tax_year
  ON public.practitioner_referral_credit_ledger(practitioner_id, tax_year)
  WHERE entry_type = 'earned_from_milestone';

ALTER TABLE public.practitioner_referral_credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_ledger_self_read ON public.practitioner_referral_credit_ledger;
CREATE POLICY credit_ledger_self_read
  ON public.practitioner_referral_credit_ledger FOR SELECT TO authenticated
  USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS credit_ledger_admin_all ON public.practitioner_referral_credit_ledger;
CREATE POLICY credit_ledger_admin_all
  ON public.practitioner_referral_credit_ledger FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION public.block_credit_ledger_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'practitioner_referral_credit_ledger is immutable. Corrections must be made via new ledger entries (e.g. admin_adjustment).';
END;
$$;

COMMENT ON FUNCTION public.block_credit_ledger_mutation IS
  'Immutability enforcer for the credit ledger. Triggers fire on every UPDATE/DELETE regardless of caller (SECURITY DEFINER RPCs included). To reverse an entry, ADD a compensating row.';

DROP TRIGGER IF EXISTS block_credit_ledger_update_trigger ON public.practitioner_referral_credit_ledger;
CREATE TRIGGER block_credit_ledger_update_trigger
  BEFORE UPDATE ON public.practitioner_referral_credit_ledger
  FOR EACH ROW EXECUTE FUNCTION public.block_credit_ledger_mutation();

DROP TRIGGER IF EXISTS block_credit_ledger_delete_trigger ON public.practitioner_referral_credit_ledger;
CREATE TRIGGER block_credit_ledger_delete_trigger
  BEFORE DELETE ON public.practitioner_referral_credit_ledger
  FOR EACH ROW EXECUTE FUNCTION public.block_credit_ledger_mutation();

-- ---------------------------------------------------------------------------
-- 7. Materialized credit balance + maintenance trigger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practitioner_referral_credit_balances (
  practitioner_id UUID PRIMARY KEY REFERENCES public.practitioners(id),
  current_balance_cents INTEGER NOT NULL DEFAULT 0,
  lifetime_earned_cents INTEGER NOT NULL DEFAULT 0,
  lifetime_applied_cents INTEGER NOT NULL DEFAULT 0,
  pending_hold_cents INTEGER NOT NULL DEFAULT 0,
  last_ledger_entry_id UUID,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.practitioner_referral_credit_balances IS
  'Materialized balance per practitioner; trigger-maintained on every ledger insert. A nightly reconciliation job re-derives from the ledger to detect drift.';

ALTER TABLE public.practitioner_referral_credit_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_balances_self_read ON public.practitioner_referral_credit_balances;
CREATE POLICY credit_balances_self_read
  ON public.practitioner_referral_credit_balances FOR SELECT TO authenticated
  USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS credit_balances_admin_all ON public.practitioner_referral_credit_balances;
CREATE POLICY credit_balances_admin_all
  ON public.practitioner_referral_credit_balances FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION public.update_practitioner_referral_credit_balance()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_current INTEGER;
  v_earned INTEGER;
  v_applied INTEGER;
BEGIN
  SELECT
    COALESCE(SUM(amount_cents), 0),
    COALESCE(SUM(CASE WHEN entry_type = 'earned_from_milestone' THEN amount_cents ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN entry_type LIKE 'applied_to_%' THEN -amount_cents ELSE 0 END), 0)
  INTO v_current, v_earned, v_applied
  FROM public.practitioner_referral_credit_ledger
  WHERE practitioner_id = NEW.practitioner_id;

  INSERT INTO public.practitioner_referral_credit_balances (
    practitioner_id, current_balance_cents, lifetime_earned_cents, lifetime_applied_cents,
    last_ledger_entry_id, last_updated_at
  ) VALUES (
    NEW.practitioner_id, v_current, v_earned, v_applied, NEW.id, NOW()
  )
  ON CONFLICT (practitioner_id) DO UPDATE SET
    current_balance_cents  = EXCLUDED.current_balance_cents,
    lifetime_earned_cents  = EXCLUDED.lifetime_earned_cents,
    lifetime_applied_cents = EXCLUDED.lifetime_applied_cents,
    last_ledger_entry_id   = EXCLUDED.last_ledger_entry_id,
    last_updated_at        = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_credit_balance_trigger ON public.practitioner_referral_credit_ledger;
CREATE TRIGGER update_credit_balance_trigger
  AFTER INSERT ON public.practitioner_referral_credit_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_practitioner_referral_credit_balance();

-- ---------------------------------------------------------------------------
-- 8. Fraud flags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practitioner_referral_fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  attribution_id UUID REFERENCES public.practitioner_referral_attributions(id),
  milestone_event_id UUID REFERENCES public.practitioner_referral_milestone_events(id),
  referral_code_id UUID REFERENCES public.practitioner_referral_codes(id),
  practitioner_id UUID REFERENCES public.practitioners(id),

  flag_type TEXT NOT NULL CHECK (flag_type IN (
    'self_referral_name_match',
    'self_referral_address_match',
    'self_referral_phone_match',
    'self_referral_payment_match',
    'high_velocity_signups',
    'cluster_pattern',
    'ip_overlap',
    'referred_practitioner_terminated_quickly',
    'admin_manual_flag'
  )),

  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'blocking')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  auto_detected BOOLEAN NOT NULL DEFAULT true,

  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'pending_review', 'confirmed_fraud', 'cleared_benign', 'admin_override'
  )),

  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_flags_pending
  ON public.practitioner_referral_fraud_flags(created_at DESC) WHERE status = 'pending_review';
CREATE INDEX IF NOT EXISTS idx_fraud_flags_attribution
  ON public.practitioner_referral_fraud_flags(attribution_id);

ALTER TABLE public.practitioner_referral_fraud_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fraud_flags_admin_all ON public.practitioner_referral_fraud_flags;
CREATE POLICY fraud_flags_admin_all
  ON public.practitioner_referral_fraud_flags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 9. Tax earnings aggregates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practitioner_referral_tax_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id),
  tax_year INTEGER NOT NULL,

  total_earned_cents INTEGER NOT NULL DEFAULT 0,
  crossed_600_threshold BOOLEAN NOT NULL DEFAULT false,
  crossed_600_threshold_at TIMESTAMPTZ,

  form_1099_required BOOLEAN NOT NULL DEFAULT false,
  form_1099_generated BOOLEAN NOT NULL DEFAULT false,
  form_1099_generated_at TIMESTAMPTZ,
  form_1099_document_url TEXT,

  w9_on_file BOOLEAN NOT NULL DEFAULT false,
  w9_collected_at TIMESTAMPTZ,
  w9_document_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (practitioner_id, tax_year)
);

CREATE INDEX IF NOT EXISTS idx_tax_earnings_practitioner_year
  ON public.practitioner_referral_tax_earnings(practitioner_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_tax_earnings_1099_pending
  ON public.practitioner_referral_tax_earnings(tax_year)
  WHERE form_1099_required = true AND form_1099_generated = false;

ALTER TABLE public.practitioner_referral_tax_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tax_earnings_self_read ON public.practitioner_referral_tax_earnings;
CREATE POLICY tax_earnings_self_read
  ON public.practitioner_referral_tax_earnings FOR SELECT TO authenticated
  USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS tax_earnings_admin_all ON public.practitioner_referral_tax_earnings;
CREATE POLICY tax_earnings_admin_all
  ON public.practitioner_referral_tax_earnings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 10. Status tiers (private)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practitioner_referral_status_tiers (
  practitioner_id UUID PRIMARY KEY REFERENCES public.practitioners(id),

  current_tier TEXT NOT NULL DEFAULT 'none' CHECK (current_tier IN (
    'none', 'bronze_referrer', 'silver_referrer', 'gold_referrer'
  )),

  successful_referrals_count INTEGER NOT NULL DEFAULT 0 CHECK (successful_referrals_count >= 0),
  bronze_earned_at TIMESTAMPTZ,
  silver_earned_at TIMESTAMPTZ,
  gold_earned_at TIMESTAMPTZ,

  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.practitioner_referral_status_tiers IS
  'Private status tier per practitioner. NEVER exposed to other practitioners. RLS only allows the owner + admin to read; no public view derives from this table.';

ALTER TABLE public.practitioner_referral_status_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS status_tiers_self_read ON public.practitioner_referral_status_tiers;
CREATE POLICY status_tiers_self_read
  ON public.practitioner_referral_status_tiers FOR SELECT TO authenticated
  USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS status_tiers_admin_all ON public.practitioner_referral_status_tiers;
CREATE POLICY status_tiers_admin_all
  ON public.practitioner_referral_status_tiers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 11. Notification preferences (referred-practitioner privacy)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practitioner_referral_notification_preferences (
  referred_practitioner_id UUID PRIMARY KEY REFERENCES public.practitioners(id),
  attribution_id UUID NOT NULL REFERENCES public.practitioner_referral_attributions(id) UNIQUE,

  allow_referrer_progress_notifications BOOLEAN NOT NULL DEFAULT true,
  opted_out_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.practitioner_referral_notification_preferences IS
  'Referred practitioner privacy controls. When opted out, referrer does not receive milestone notifications. Reward vesting continues silently.';

ALTER TABLE public.practitioner_referral_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ref_notif_prefs_self_rw ON public.practitioner_referral_notification_preferences;
CREATE POLICY ref_notif_prefs_self_rw
  ON public.practitioner_referral_notification_preferences FOR ALL TO authenticated
  USING (referred_practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()))
  WITH CHECK (referred_practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS ref_notif_prefs_admin_all ON public.practitioner_referral_notification_preferences;
CREATE POLICY ref_notif_prefs_admin_all
  ON public.practitioner_referral_notification_preferences FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
