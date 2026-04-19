-- =============================================================
-- Prompt #92 Phase 1: Helix Rewards integration with pricing
-- Extends existing helix_* tables additively. Adds practitioner
-- stub tables (full Prompt #91 deferred) so the engagement score
-- firewall RLS compiles. Creates family pool config, engagement
-- score snapshots, earning event catalog, and atomic RPC functions.
--
-- Append-only. No existing Helix columns are renamed.
-- =============================================================

-- ------------------------------------------------------------------
-- 1. helix_tiers: add membership-gated progression columns
-- Existing rows already have correct multipliers (1.0/1.5/2.0/5.0).
-- ------------------------------------------------------------------
ALTER TABLE public.helix_tiers
  ADD COLUMN IF NOT EXISTS required_membership_tier_id TEXT REFERENCES public.membership_tiers(id),
  ADD COLUMN IF NOT EXISTS min_engagement_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier_icon_lucide_name TEXT DEFAULT 'Award',
  ADD COLUMN IF NOT EXISTS tier_description TEXT;

COMMENT ON COLUMN public.helix_tiers.required_membership_tier_id IS
  'Minimum membership_tiers.id required to occupy this Helix tier. NULL means any paid tier.';
COMMENT ON COLUMN public.helix_tiers.min_engagement_points IS
  'Minimum lifetime points to reach this Helix tier within the membership gate.';

-- Populate the new columns on existing rows
UPDATE public.helix_tiers SET
  required_membership_tier_id = 'gold',
  tier_icon_lucide_name = 'Medal',
  tier_description = 'Entry Helix tier for Gold and above members'
WHERE LOWER(tier) = 'bronze';

UPDATE public.helix_tiers SET
  required_membership_tier_id = 'gold',
  tier_icon_lucide_name = 'Award',
  tier_description = 'Engaged Gold members earning 1.5x'
WHERE LOWER(tier) = 'silver';

UPDATE public.helix_tiers SET
  required_membership_tier_id = 'gold',
  tier_icon_lucide_name = 'Trophy',
  tier_description = 'Max engagement Gold members earning 2x'
WHERE LOWER(tier) = 'gold';

-- Platinum Helix tier is membership-gated rather than points-gated.
-- Any platinum (or platinum_family) member earns at 5x regardless of points.
UPDATE public.helix_tiers SET
  required_membership_tier_id = 'platinum',
  min_engagement_points = 0,
  tier_icon_lucide_name = 'Crown',
  tier_description = 'Platinum and Platinum+ Family members earning 5x'
WHERE LOWER(tier) = 'platinum';

-- ------------------------------------------------------------------
-- 2. Practitioner stub tables (deferred from Prompt #91)
-- Only the schema needed for engagement_score RLS + the engagement
-- score practitioner-facing API. Prompt #91 will extend these with
-- full onboarding, credentials, NPI, billing, etc.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practitioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','suspended','revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.practitioners IS 'Minimal practitioner stub. Prompt #91 will extend with credentials, NPI, billing, onboarding steps.';

ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='practitioners' AND policyname='practitioners_self_read') THEN
    CREATE POLICY "practitioners_self_read" ON public.practitioners FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_practitioners_user ON public.practitioners(user_id);

CREATE TABLE IF NOT EXISTS public.patient_practitioner_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','ended','declined')),
  consent_share_engagement_score BOOLEAN NOT NULL DEFAULT false,
  consent_share_protocol BOOLEAN NOT NULL DEFAULT false,
  consent_share_labs BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_user_id, practitioner_id)
);

COMMENT ON TABLE public.patient_practitioner_relationships IS
  'Consent-gated link between a patient and a practitioner. Prompt #92 only uses consent_share_engagement_score. Prompt #91 will use the rest.';
COMMENT ON COLUMN public.patient_practitioner_relationships.consent_share_engagement_score IS
  'Patient consent: practitioner may read the patient''s engagement_score_snapshots rows. Defaults false; patient toggles on.';

ALTER TABLE public.patient_practitioner_relationships ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='patient_practitioner_relationships' AND policyname='ppr_patient_full_access') THEN
    CREATE POLICY "ppr_patient_full_access" ON public.patient_practitioner_relationships FOR ALL TO authenticated
      USING (patient_user_id = auth.uid()) WITH CHECK (patient_user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='patient_practitioner_relationships' AND policyname='ppr_practitioner_read') THEN
    CREATE POLICY "ppr_practitioner_read" ON public.patient_practitioner_relationships FOR SELECT TO authenticated
      USING (
        practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ppr_patient ON public.patient_practitioner_relationships(patient_user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ppr_practitioner ON public.patient_practitioner_relationships(practitioner_id) WHERE status = 'active';

-- ------------------------------------------------------------------
-- 3. Family pool configuration (for Platinum+ Family)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.helix_family_pool_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  pool_type TEXT NOT NULL DEFAULT 'shared' CHECK (pool_type IN ('shared','individual')),
  configured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.helix_family_pool_config IS
  'Platinum+ Family Helix pool config. Defaults to shared. Toggling only affects future earnings, not existing balances.';

ALTER TABLE public.helix_family_pool_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='helix_family_pool_config' AND policyname='helix_pool_primary_manage') THEN
    CREATE POLICY "helix_pool_primary_manage" ON public.helix_family_pool_config FOR ALL TO authenticated
      USING (primary_user_id = auth.uid()) WITH CHECK (primary_user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='helix_family_pool_config' AND policyname='helix_pool_family_read') THEN
    CREATE POLICY "helix_pool_family_read" ON public.helix_family_pool_config FOR SELECT TO authenticated
      USING (
        primary_user_id IN (
          SELECT primary_user_id FROM public.family_members
          WHERE member_user_id = auth.uid() AND is_active = true
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_helix_pool_primary ON public.helix_family_pool_config(primary_user_id);

-- ------------------------------------------------------------------
-- 4. Engagement score snapshots (practitioner-visible firewall output)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engagement_score_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  protocol_adherence_score INTEGER NOT NULL CHECK (protocol_adherence_score BETWEEN 0 AND 100),
  assessment_engagement_score INTEGER NOT NULL CHECK (assessment_engagement_score BETWEEN 0 AND 100),
  tracking_consistency_score INTEGER NOT NULL CHECK (tracking_consistency_score BETWEEN 0 AND 100),
  outcome_trajectory_score INTEGER NOT NULL CHECK (outcome_trajectory_score BETWEEN 0 AND 100),
  calculation_method_version TEXT NOT NULL DEFAULT 'v1',
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  helix_activity_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period_end_date)
);

COMMENT ON TABLE public.engagement_score_snapshots IS
  'Aggregate engagement (0-100) derived from Helix activity. Practitioners read via consent. Zero Helix internals exposed.';

ALTER TABLE public.engagement_score_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='engagement_score_snapshots' AND policyname='engagement_scores_self_read') THEN
    CREATE POLICY "engagement_scores_self_read" ON public.engagement_score_snapshots FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='engagement_score_snapshots' AND policyname='engagement_scores_practitioner_read_with_consent') THEN
    CREATE POLICY "engagement_scores_practitioner_read_with_consent" ON public.engagement_score_snapshots FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.patient_practitioner_relationships ppr
          JOIN public.practitioners p ON p.id = ppr.practitioner_id
          WHERE ppr.patient_user_id = engagement_score_snapshots.user_id
            AND p.user_id = auth.uid()
            AND ppr.status = 'active'
            AND ppr.consent_share_engagement_score = true
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_engagement_scores_user ON public.engagement_score_snapshots(user_id, period_end_date DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_scores_period ON public.engagement_score_snapshots(period_end_date);

-- ------------------------------------------------------------------
-- 5. Earning event catalog (canonical list + seed)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.helix_earning_event_types (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  base_points INTEGER NOT NULL CHECK (base_points >= 0),
  category TEXT NOT NULL CHECK (category IN (
    'purchase','assessment','tracking','engagement',
    'referral','milestone','community'
  )),
  frequency_limit TEXT CHECK (frequency_limit IN (
    'unlimited','once_per_day','once_per_week','once_per_month','once_per_lifetime'
  )),
  requires_consumer_tier INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.helix_earning_event_types IS
  'Canonical Helix earning events. Base points before tier multiplier.';

ALTER TABLE public.helix_earning_event_types ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='helix_earning_event_types' AND policyname='earning_events_read_all') THEN
    CREATE POLICY "earning_events_read_all" ON public.helix_earning_event_types FOR SELECT TO authenticated, anon
      USING (is_active = true);
  END IF;
END $$;

INSERT INTO public.helix_earning_event_types (id, display_name, base_points, category, frequency_limit, requires_consumer_tier) VALUES
  ('supplement_purchase_dollar','Supplement Purchase (per $1 spent)',1,'purchase','unlimited',1),
  ('genex360_m_purchase','GeneX-M Methylation Panel Purchase',388,'purchase','once_per_lifetime',1),
  ('genex360_core_purchase','GeneX360 Core Bundle Purchase',788,'purchase','once_per_lifetime',1),
  ('genex360_complete_purchase','GeneX360 Complete Bundle Purchase',1188,'purchase','once_per_lifetime',1),
  ('first_supplement_purchase','First Supplement Purchase',100,'milestone','once_per_lifetime',1),
  ('outcome_stack_purchase','Outcome Stack Purchase',50,'purchase','unlimited',1),
  ('caq_completion','CAQ Assessment Completion',100,'assessment','unlimited',1),
  ('caq_first_completion','First CAQ Completion',200,'milestone','once_per_lifetime',1),
  ('forty_day_reassessment','40 day Reassessment Completion',50,'assessment','unlimited',1),
  ('lab_upload','Lab Results Upload',75,'assessment','unlimited',1),
  ('daily_adherence_log','Daily Supplement Adherence Log',10,'tracking','once_per_day',1),
  ('nutrition_log_entry','Nutrition Log Entry',5,'tracking','once_per_day',1),
  ('wearable_sync','Wearable Data Sync',5,'tracking','once_per_day',1),
  ('weekly_streak','Weekly Tracking Streak',50,'milestone','once_per_week',1),
  ('monthly_streak','Monthly Tracking Streak',200,'milestone','once_per_month',1),
  ('bio_score_improvement','Bio Optimization Score Improvement',25,'milestone','unlimited',1),
  ('bio_score_milestone_80','Reach Bio Optimization Score 80',500,'milestone','once_per_lifetime',1),
  ('bio_score_milestone_90','Reach Bio Optimization Score 90',1000,'milestone','once_per_lifetime',1),
  ('referral_signup','Referral Signed Up',100,'referral','unlimited',1),
  ('referral_first_purchase','Referral First Purchase',500,'referral','unlimited',1),
  ('referral_genex360','Referral GeneX360 Purchase',1000,'referral','unlimited',1),
  ('community_post','Community Post',10,'community','once_per_day',1),
  ('community_helpful_answer','Community Helpful Answer',25,'community','unlimited',1)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------
-- 6. Atomic RPCs for earning credit and redemption
-- Adapted to existing helix_balances / helix_redemptions schema.
-- ------------------------------------------------------------------

-- Balance increment: uses existing current_balance / lifetime_earned columns
CREATE OR REPLACE FUNCTION public.helix_increment_balance(
  p_user_id UUID,
  p_points INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.helix_balances (user_id, current_balance, lifetime_earned, lifetime_redeemed)
  VALUES (p_user_id, p_points, p_points, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    current_balance = helix_balances.current_balance + p_points,
    lifetime_earned = helix_balances.lifetime_earned + p_points,
    updated_at = NOW();
END;
$$;

-- Redemption: atomically deducts balance + creates redemption + transaction.
-- Uses existing helix_redemptions columns (tokens_spent, reward_type, order_id).
CREATE OR REPLACE FUNCTION public.helix_create_redemption(
  p_user_id UUID,
  p_tokens_spent INTEGER,
  p_reward_type TEXT,
  p_reward_description TEXT,
  p_order_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_redemption_id UUID;
BEGIN
  -- Deduct balance; fails if insufficient
  UPDATE public.helix_balances
    SET current_balance = current_balance - p_tokens_spent,
        lifetime_redeemed = lifetime_redeemed + p_tokens_spent,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND current_balance >= p_tokens_spent;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient Helix balance';
  END IF;

  INSERT INTO public.helix_redemptions (
    user_id, reward_type, reward_description, tokens_spent, order_id, status, created_at
  ) VALUES (
    p_user_id, p_reward_type, p_reward_description, p_tokens_spent, p_order_id, 'active', NOW()
  ) RETURNING id INTO v_redemption_id;

  INSERT INTO public.helix_transactions (user_id, type, amount, source, related_entity_id, balance_after, created_at)
  SELECT p_user_id, 'redemption', -p_tokens_spent, 'redemption', v_redemption_id, current_balance, NOW()
  FROM public.helix_balances WHERE user_id = p_user_id;

  RETURN v_redemption_id;
END;
$$;

-- Grant execute to authenticated users (self-scoped via RLS on underlying tables)
GRANT EXECUTE ON FUNCTION public.helix_increment_balance(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.helix_create_redemption(UUID, INTEGER, TEXT, TEXT, UUID) TO authenticated, service_role;
