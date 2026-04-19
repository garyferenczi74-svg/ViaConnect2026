-- =============================================================================
-- Prompt #91, Phase 2.4: Practitioner subscriptions
-- =============================================================================
-- Append-only. One active subscription per practitioner (enforced via partial
-- unique index). Stripe is the primary payment processor; PayPal and complimentary
-- options remain on the table for ops needs.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.practitioner_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES public.practitioner_tiers(id),

  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  started_at TIMESTAMPTZ NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,

  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'paused', 'trialing')),

  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  paypal_subscription_id TEXT,
  payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('stripe', 'paypal', 'complimentary', 'invoice')),

  is_annual_prepay BOOLEAN NOT NULL DEFAULT false,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.practitioner_subscriptions IS
  'Practitioner subscription state (Standard $128.88 or White-Label $288.88 monthly). Separate from consumer memberships.';

-- One active subscription per practitioner. Past-due / canceled rows can
-- coexist for audit history.
CREATE UNIQUE INDEX IF NOT EXISTS uq_practitioner_subs_one_active
  ON public.practitioner_subscriptions(practitioner_id)
  WHERE status IN ('active', 'trialing', 'past_due');

CREATE INDEX IF NOT EXISTS idx_practitioner_subs_practitioner
  ON public.practitioner_subscriptions(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_practitioner_subs_period_end
  ON public.practitioner_subscriptions(current_period_end)
  WHERE status IN ('active', 'trialing');

ALTER TABLE public.practitioner_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS practitioner_subs_self_read ON public.practitioner_subscriptions;
CREATE POLICY practitioner_subs_self_read
  ON public.practitioner_subscriptions FOR SELECT
  TO authenticated
  USING (
    practitioner_id IN (
      SELECT id FROM public.practitioners WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS practitioner_subs_admin_all ON public.practitioner_subscriptions;
CREATE POLICY practitioner_subs_admin_all
  ON public.practitioner_subscriptions FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
