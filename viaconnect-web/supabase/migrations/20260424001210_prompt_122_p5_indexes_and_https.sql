-- =============================================================================
-- Prompt #122 P5 follow-up: indexes + HTTPS check constraint
-- =============================================================================
-- Three tightenings that came out of the P5 review:
--   1. storage bucket RLS runs a correlated subquery on soc2_packets.storage_key
--      — index it.
--   2. GET /api/admin/soc2/packets orders by generated_at DESC with no WHERE.
--      The existing (status, generated_at DESC) partial index doesn't help.
--   3. Prevent admins from seeding an http:// distribution endpoint that would
--      leak the Bearer token over the wire.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_soc2_packets_storage_key
  ON public.soc2_packets (storage_key);

CREATE INDEX IF NOT EXISTS idx_soc2_packets_generated_at
  ON public.soc2_packets (generated_at DESC);

ALTER TABLE public.soc2_distribution_targets
  DROP CONSTRAINT IF EXISTS soc2_distribution_targets_https_only;

ALTER TABLE public.soc2_distribution_targets
  ADD CONSTRAINT soc2_distribution_targets_https_only
  CHECK (api_url IS NULL OR api_url LIKE 'https://%');
