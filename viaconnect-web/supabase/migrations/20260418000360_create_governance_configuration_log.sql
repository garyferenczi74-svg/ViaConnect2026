-- =============================================================================
-- Prompt #95 Phase 2: Governance configuration audit log.
-- =============================================================================
-- Every change to decision_rights_rules or approver_assignments writes a
-- row here. Append-only (UPDATE/DELETE blocked at trigger level using the
-- shared block_audit_mutation function from migration _330). change_reason
-- is required by the application layer; the column is NOT NULL at the DB
-- level to prevent accidental unjustified changes.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.governance_configuration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type TEXT NOT NULL CHECK (change_type IN (
    'decision_rights_rule_updated',
    'decision_rights_rule_created',
    'decision_rights_rule_deactivated',
    'approver_assigned',
    'approver_unassigned'
  )),

  target_table TEXT NOT NULL,
  target_id UUID NOT NULL,

  previous_state JSONB,
  new_state JSONB,

  changed_by UUID NOT NULL REFERENCES auth.users(id),
  change_justification TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.governance_configuration_log IS
  'Immutable audit log of every change to decision_rights_rules or approver_assignments. Uses shared block_audit_mutation trigger from migration _330.';

CREATE INDEX IF NOT EXISTS idx_gov_config_log_target
  ON public.governance_configuration_log(target_table, target_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_gov_config_log_changed_at
  ON public.governance_configuration_log(changed_at DESC);

ALTER TABLE public.governance_configuration_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='governance_configuration_log' AND policyname='gov_config_log_admin_read') THEN
    CREATE POLICY "gov_config_log_admin_read"
      ON public.governance_configuration_log FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='governance_configuration_log' AND policyname='gov_config_log_admin_insert') THEN
    CREATE POLICY "gov_config_log_admin_insert"
      ON public.governance_configuration_log FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- Reuse the shared immutability trigger from migration _330.
DROP TRIGGER IF EXISTS block_gov_config_log_update_trigger ON public.governance_configuration_log;
CREATE TRIGGER block_gov_config_log_update_trigger
  BEFORE UPDATE ON public.governance_configuration_log
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();

DROP TRIGGER IF EXISTS block_gov_config_log_delete_trigger ON public.governance_configuration_log;
CREATE TRIGGER block_gov_config_log_delete_trigger
  BEFORE DELETE ON public.governance_configuration_log
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();
