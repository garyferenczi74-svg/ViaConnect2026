-- =============================================================================
-- Prompt #96 Phase 2: Eligibility helpers
-- =============================================================================
-- Append-only. Two pieces:
--   1. sum_practitioner_wholesale_volume RPC: lifetime wholesale revenue used
--      by Path 3 (volume_threshold) of the eligibility engine.
--   2. Seed the white_label_products_2028 launch phase if it is not already
--      registered. id is the spec's identifier; phase_type uses the existing
--      'white_label_products_launch' check constraint value.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sum_practitioner_wholesale_volume(
  p_practitioner_id UUID
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  -- Sum wholesale_total_cents across all practitioner-channel order types.
  -- COALESCE ensures the function returns 0 instead of NULL for new accounts.
  -- Status filter mirrors the spec; if the project later renames 'completed'
  -- the eligibility engine would silently undercount, so this RPC is the
  -- single source of truth and any future rename should update here too.
  SELECT COALESCE(SUM(wholesale_total_cents), 0)::BIGINT
    FROM public.shop_orders
   WHERE placed_by_practitioner_id = p_practitioner_id
     AND order_type IN ('practitioner_stock', 'drop_ship', 'wholesale_bulk')
     AND status = 'completed'
     AND wholesale_total_cents IS NOT NULL;
$$;

COMMENT ON FUNCTION public.sum_practitioner_wholesale_volume IS
  'Lifetime wholesale revenue (cents) for one practitioner across the three practitioner-channel order types. Used by white-label eligibility Path 3.';

REVOKE ALL ON FUNCTION public.sum_practitioner_wholesale_volume(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sum_practitioner_wholesale_volume(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Launch phase seed
-- ---------------------------------------------------------------------------
INSERT INTO public.launch_phases (
  id, display_name, description, phase_type,
  target_activation_date, activation_status, sort_order, metadata
) VALUES (
  'white_label_products_2028',
  'Level 3 White-Label Products',
  'Level 3 White-Label Product program. Lets qualified practitioners produce white-labeled versions of ViaCura formulations under their own brand. Infrastructure built in Prompt #96; activation gated by this phase.',
  'white_label_products_launch',
  '2028-09-01',
  'planned',
  30,
  jsonb_build_object('origin_prompt', 'Prompt #96', 'level', 3)
)
ON CONFLICT (id) DO NOTHING;
