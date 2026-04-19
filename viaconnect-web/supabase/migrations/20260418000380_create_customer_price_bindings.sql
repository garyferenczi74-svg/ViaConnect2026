-- =============================================================================
-- Prompt #95 Phase 5: per-customer price bindings for grandfathering.
-- =============================================================================
-- When a proposal activates with a non-no_grandfathering policy, the
-- activation logic (src/lib/governance/activation.ts) snapshots every
-- existing customer currently bound to the old price by inserting a row
-- here with the pre-change value. Billing integrations consult this table
-- via resolve_effective_price before computing what a given customer pays.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.customer_price_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- practitioner_id is a plain UUID (no FK) because the practitioners
  -- schema is still being reconciled in Prompt #91 revised. Once stable,
  -- a follow-up migration can add the FK.
  practitioner_id UUID,

  pricing_domain_id TEXT NOT NULL REFERENCES public.pricing_domains(id),
  target_object_id TEXT NOT NULL,

  bound_value_cents BIGINT,
  bound_value_percent NUMERIC(6,3),

  bound_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  binding_expires_at TIMESTAMPTZ,

  authorized_by_proposal_id UUID NOT NULL REFERENCES public.pricing_proposals(id),
  grandfathering_policy TEXT NOT NULL CHECK (grandfathering_policy IN (
    'indefinite','twelve_months','six_months','thirty_days'
  )),

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active','expired','superseded'
  )),

  superseded_by_binding_id UUID REFERENCES public.customer_price_bindings(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK ((user_id IS NOT NULL) OR (practitioner_id IS NOT NULL))
);

COMMENT ON TABLE public.customer_price_bindings IS
  'Per-customer per-domain price bindings for grandfathering. When a proposal activates with a grandfathering policy, existing customers get a row here. Active bindings are respected by billing integration through resolve_effective_price().';
COMMENT ON COLUMN public.customer_price_bindings.practitioner_id IS
  'Set for practitioner-facing bindings (wholesale discount, practitioner subscription). NULL for consumer bindings. FK to practitioners deferred pending Prompt #91 revised schema stabilization.';

CREATE INDEX IF NOT EXISTS idx_cpb_user_domain
  ON public.customer_price_bindings(user_id, pricing_domain_id)
  WHERE status = 'active' AND user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpb_practitioner_domain
  ON public.customer_price_bindings(practitioner_id, pricing_domain_id)
  WHERE status = 'active' AND practitioner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpb_expiring
  ON public.customer_price_bindings(binding_expires_at)
  WHERE status = 'active' AND binding_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpb_proposal
  ON public.customer_price_bindings(authorized_by_proposal_id);

ALTER TABLE public.customer_price_bindings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='customer_price_bindings' AND policyname='cpb_self_read') THEN
    CREATE POLICY "cpb_self_read"
      ON public.customer_price_bindings FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='customer_price_bindings' AND policyname='cpb_admin_all') THEN
    CREATE POLICY "cpb_admin_all"
      ON public.customer_price_bindings FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='customer_price_bindings' AND policyname='cpb_service_all') THEN
    CREATE POLICY "cpb_service_all"
      ON public.customer_price_bindings FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
