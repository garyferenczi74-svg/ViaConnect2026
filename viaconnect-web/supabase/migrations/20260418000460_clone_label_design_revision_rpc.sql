-- =============================================================================
-- Prompt #96 Phase 4: Atomic label-design revision RPC
-- =============================================================================
-- Append-only. clone_label_design_revision flips the source row's
-- is_current_version to false and inserts a fresh draft with
-- version_number+1 + parent_design_id, all in one statement so the
-- partial unique index idx_label_design_current is never simultaneously
-- violated.
--
-- SECURITY DEFINER so practitioner-context callers can perform the swap
-- even though the partial unique index is non-deferrable. The RPC
-- enforces ownership (p_source_design_id.practitioner_id must match the
-- caller's practitioner record) before executing.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.clone_label_design_revision(
  p_source_design_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller_practitioner_id UUID;
  v_source RECORD;
  v_new_id UUID;
BEGIN
  -- Resolve caller -> practitioner.id.
  SELECT id INTO v_caller_practitioner_id
    FROM public.practitioners
   WHERE user_id = auth.uid();
  IF v_caller_practitioner_id IS NULL THEN
    RAISE EXCEPTION 'Caller has no practitioner record';
  END IF;

  -- Load the source row + ownership check.
  SELECT * INTO v_source
    FROM public.white_label_label_designs
   WHERE id = p_source_design_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source design not found';
  END IF;
  IF v_source.practitioner_id != v_caller_practitioner_id THEN
    RAISE EXCEPTION 'Forbidden: design belongs to another practitioner';
  END IF;
  IF NOT v_source.is_current_version THEN
    RAISE EXCEPTION 'Only the current version can be revised';
  END IF;

  WITH demoted AS (
    UPDATE public.white_label_label_designs
       SET is_current_version = false,
           updated_at = NOW()
     WHERE id = p_source_design_id
     RETURNING id
  )
  INSERT INTO public.white_label_label_designs (
    practitioner_id, brand_configuration_id, product_catalog_id,
    display_product_name, short_description, long_description, tagline,
    layout_template, structure_function_claims, usage_directions, warning_text,
    supplement_facts_panel_data, allergen_statement, other_ingredients,
    manufacturer_line, status,
    version_number, parent_design_id, is_current_version
  )
  SELECT
    v_source.practitioner_id, v_source.brand_configuration_id, v_source.product_catalog_id,
    v_source.display_product_name, v_source.short_description, v_source.long_description, v_source.tagline,
    v_source.layout_template, v_source.structure_function_claims, v_source.usage_directions, v_source.warning_text,
    v_source.supplement_facts_panel_data, v_source.allergen_statement, v_source.other_ingredients,
    v_source.manufacturer_line,
    'draft',
    v_source.version_number + 1,
    p_source_design_id,
    true
  FROM demoted
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.clone_label_design_revision(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clone_label_design_revision(UUID) TO authenticated;

COMMENT ON FUNCTION public.clone_label_design_revision IS
  'Atomic versioning of a label design. Demotes the current row + inserts a new draft with version_number+1 in a single CTE so uq_label_design_one_current is never violated.';
