-- =============================================================================
-- Prompt #96 Phase 5: White-label production order number sequence
-- =============================================================================
-- Append-only. Sequence + helper RPC that generates the human-readable
-- order_number used on the white_label_production_orders.order_number
-- UNIQUE column. Format: WL-YYYYMM-NNNN (e.g. WL-202604-0001).
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS public.white_label_order_number_seq START 1;

CREATE OR REPLACE FUNCTION public.next_white_label_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_n BIGINT;
BEGIN
  v_n := nextval('public.white_label_order_number_seq');
  RETURN 'WL-' || to_char(NOW(), 'YYYYMM') || '-' || lpad(v_n::TEXT, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_white_label_order_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_white_label_order_number() TO authenticated;

COMMENT ON FUNCTION public.next_white_label_order_number IS
  'Returns the next human-readable production order number. Combines a monotonic sequence with the current YYYYMM so reordering by name approximates chronological order in dashboards.';
