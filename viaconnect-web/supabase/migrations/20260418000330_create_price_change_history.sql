-- =============================================================================
-- Prompt #95 Phase 1.6: Price change history (immutable).
-- =============================================================================
-- Every activation and rollback writes a row here. No UPDATE or DELETE is
-- permitted -- even admins cannot mutate the audit trail. Enforcement is at
-- the trigger level so no role, including service_role, can bypass it.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.price_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  proposal_id UUID NOT NULL REFERENCES public.pricing_proposals(id),
  pricing_domain_id TEXT NOT NULL REFERENCES public.pricing_domains(id),
  target_object_id TEXT NOT NULL,

  previous_value_cents BIGINT,
  new_value_cents BIGINT,
  previous_value_percent NUMERIC(6, 3),
  new_value_percent NUMERIC(6, 3),

  change_action TEXT NOT NULL CHECK (change_action IN ('activation', 'rollback')),

  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by_user_id UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.price_change_history IS
  'Immutable audit log of every price change. No UPDATE or DELETE permissions granted to any role. Rollbacks create new rows with change_action=rollback.';

CREATE INDEX IF NOT EXISTS idx_price_history_proposal
  ON public.price_change_history(proposal_id);
CREATE INDEX IF NOT EXISTS idx_price_history_domain
  ON public.price_change_history(pricing_domain_id, target_object_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_applied
  ON public.price_change_history(applied_at DESC);

ALTER TABLE public.price_change_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='price_change_history' AND policyname='price_history_read_admin') THEN
    CREATE POLICY "price_history_read_admin"
      ON public.price_change_history FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='price_change_history' AND policyname='price_history_insert_admin') THEN
    CREATE POLICY "price_history_insert_admin"
      ON public.price_change_history FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- Shared immutability trigger. Reused by Phase 2 for governance_configuration_log.
CREATE OR REPLACE FUNCTION public.block_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION '% is immutable. UPDATE and DELETE are not permitted.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.block_audit_mutation() IS
  'Shared trigger function for append-only audit tables. Used by price_change_history and (Phase 2) governance_configuration_log.';

DROP TRIGGER IF EXISTS block_price_history_update_trigger ON public.price_change_history;
CREATE TRIGGER block_price_history_update_trigger
  BEFORE UPDATE ON public.price_change_history
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();

DROP TRIGGER IF EXISTS block_price_history_delete_trigger ON public.price_change_history;
CREATE TRIGGER block_price_history_delete_trigger
  BEFORE DELETE ON public.price_change_history
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();
