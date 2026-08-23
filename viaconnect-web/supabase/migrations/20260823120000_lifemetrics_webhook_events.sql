-- LifeMetrics inbound webhook event ledger (Farmceutica Wellness tenant 355).
-- Append-only. Stores event metadata and a body digest only. Never store
-- genetics, genotypes, biomarker values, or other PHI in this table.
-- Idempotent on event_id. Service-role writes; members may read their own rows.

CREATE TABLE IF NOT EXISTS public.lifemetrics_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  tenant_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
  error_code text,
  payload_digest text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS lifemetrics_webhook_events_user_idx
  ON public.lifemetrics_webhook_events (user_id, received_at DESC);

CREATE INDEX IF NOT EXISTS lifemetrics_webhook_events_status_idx
  ON public.lifemetrics_webhook_events (status, received_at);

COMMENT ON TABLE public.lifemetrics_webhook_events IS
  'LifeMetrics webhook ledger. Idempotent on event_id. Digest only, no genetics.';

ALTER TABLE public.lifemetrics_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lifemetrics_webhook_events_select_own
  ON public.lifemetrics_webhook_events;
CREATE POLICY lifemetrics_webhook_events_select_own
  ON public.lifemetrics_webhook_events
  FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS lifemetrics_webhook_events_admin_read
  ON public.lifemetrics_webhook_events;
CREATE POLICY lifemetrics_webhook_events_admin_read
  ON public.lifemetrics_webhook_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

GRANT SELECT ON public.lifemetrics_webhook_events TO authenticated;
GRANT ALL ON public.lifemetrics_webhook_events TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.lifemetrics_webhook_events FROM authenticated;
REVOKE ALL ON public.lifemetrics_webhook_events FROM anon;
