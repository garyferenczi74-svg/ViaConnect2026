-- =============================================================================
-- Prompt #106 §3.6 + §8.2 — shop_refresh_audit_log (append-only).
-- =============================================================================
-- Separate audit surface from #102 practitioner_operations_audit_log,
-- #104 legal_operations_audit_log, and #105 executive_reporting_audit_log
-- because shop content/data-refresh events answer to a different audience
-- (merchandising ops, product marketing, customer-facing integrity) with
-- a shorter retention horizon (5 years per §3.6, driven by typical product-
-- liability investigation windows).
--
-- Append-only enforced via the shared public.block_audit_mutation() trigger
-- if present; otherwise a local prevent_shop_refresh_audit_mutation().
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.shop_refresh_audit_log (
  audit_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id     UUID REFERENCES auth.users(id),
  actor_role        TEXT,
  action_category   TEXT NOT NULL CHECK (action_category IN (
    'storage_upload', 'storage_replace', 'storage_archive',
    'binding_create', 'binding_rebind', 'binding_archive',
    'catalog_image_url_update', 'catalog_row_insert', 'catalog_active_toggle',
    'retirement_flag', 'retirement_approve', 'retirement_revert',
    'category_normalization', 'sha256_verification_failure',
    'approval_typed_confirmation'
  )),
  action_verb       TEXT NOT NULL,
  target_table      TEXT,
  target_id         UUID,
  sku               TEXT,
  before_state_json JSONB,
  after_state_json  JSONB,
  context_json      JSONB,
  ip_address        INET,
  user_agent        TEXT
);
CREATE INDEX IF NOT EXISTS idx_srl_occurred
  ON public.shop_refresh_audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_srl_sku
  ON public.shop_refresh_audit_log(sku, occurred_at DESC) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_srl_category
  ON public.shop_refresh_audit_log(action_category, occurred_at DESC);

-- -----------------------------------------------------------------------------
-- Append-only enforcement. Prefer the shared block_audit_mutation if present
-- (established in #102/#104/#105), fall back to a local function otherwise.
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'block_audit_mutation'
  ) THEN
    DROP TRIGGER IF EXISTS trg_srl_append_only ON public.shop_refresh_audit_log;
    CREATE TRIGGER trg_srl_append_only
      BEFORE UPDATE OR DELETE ON public.shop_refresh_audit_log
      FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();
  ELSE
    CREATE OR REPLACE FUNCTION public.prevent_shop_refresh_audit_mutation()
    RETURNS TRIGGER LANGUAGE plpgsql AS $fn$
    BEGIN
      RAISE EXCEPTION 'shop_refresh_audit_log is append-only; UPDATE/DELETE forbidden'
        USING ERRCODE = 'P0001';
    END;
    $fn$;
    DROP TRIGGER IF EXISTS trg_srl_append_only ON public.shop_refresh_audit_log;
    CREATE TRIGGER trg_srl_append_only
      BEFORE UPDATE OR DELETE ON public.shop_refresh_audit_log
      FOR EACH ROW EXECUTE FUNCTION public.prevent_shop_refresh_audit_mutation();
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- RLS — admin read; INSERT only via service role (edge functions).
-- -----------------------------------------------------------------------------
ALTER TABLE public.shop_refresh_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS srl_admin_select ON public.shop_refresh_audit_log;
CREATE POLICY srl_admin_select ON public.shop_refresh_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Explicit deny for non-service-role writes — service role bypasses RLS.
DROP POLICY IF EXISTS srl_deny_user_writes ON public.shop_refresh_audit_log;
CREATE POLICY srl_deny_user_writes ON public.shop_refresh_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (FALSE);

COMMENT ON TABLE public.shop_refresh_audit_log IS
  'Prompt #106 §3.6: append-only log for shop image + formulation refresh events. 5-year retention horizon. UPDATE/DELETE blocked at trigger level.';
