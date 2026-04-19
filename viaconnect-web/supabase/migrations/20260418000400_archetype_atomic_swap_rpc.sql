-- =============================================================================
-- Prompt #94 Phase 5 patch: Atomic primary archetype swap RPC
-- =============================================================================
-- Append-only. Adds two SECURITY DEFINER RPCs that perform the
-- is_primary swap atomically inside a single statement, removing the
-- TOCTOU window where a non-deferrable partial unique index could be
-- violated if the second statement of a two-step swap fails. The RPCs
-- replace direct UPDATE+INSERT pairs in:
--   POST /api/admin/analytics/archetype-classify
--   POST /api/admin/analytics/archetype-override
-- Both routes still gate on profile.role='admin' before invocation.
-- =============================================================================

-- assign_primary_archetype: idempotent insert OR touch-update of the user's
-- primary row. If the same archetype is already primary, only confidence and
-- signal_payload are refreshed. If a different archetype is primary, a single
-- WITH CTE flips the old row to is_primary=false and inserts the new one in
-- the same statement (the partial index never sees two primaries).
CREATE OR REPLACE FUNCTION public.assign_primary_archetype(
  p_user_id UUID,
  p_archetype_id TEXT,
  p_confidence_score NUMERIC,
  p_assigned_from TEXT,
  p_signal_payload JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_existing_id UUID;
  v_existing_archetype TEXT;
  v_new_id UUID;
BEGIN
  IF p_assigned_from NOT IN ('caq_initial','caq_refined_with_behavior','manual_admin_override','machine_learning_v1') THEN
    RAISE EXCEPTION 'Invalid assigned_from: %', p_assigned_from;
  END IF;

  SELECT id, archetype_id
    INTO v_existing_id, v_existing_archetype
    FROM public.customer_archetypes
   WHERE user_id = p_user_id AND is_primary = true
   LIMIT 1;

  IF v_existing_id IS NOT NULL AND v_existing_archetype = p_archetype_id THEN
    UPDATE public.customer_archetypes
       SET confidence_score = p_confidence_score,
           signal_payload   = p_signal_payload,
           assigned_from    = p_assigned_from,
           assigned_at      = now(),
           updated_at       = now()
     WHERE id = v_existing_id;
    RETURN v_existing_id;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    -- Single statement that demotes the old row in the same WITH that inserts
    -- the new one. The partial unique index on is_primary=true is never
    -- violated because both writes commit together.
    WITH demoted AS (
      UPDATE public.customer_archetypes
         SET is_primary = false,
             updated_at = now()
       WHERE id = v_existing_id
       RETURNING id
    )
    INSERT INTO public.customer_archetypes (
      user_id, archetype_id, confidence_score, assigned_from,
      signal_payload, is_primary
    )
    SELECT p_user_id, p_archetype_id, p_confidence_score, p_assigned_from,
           p_signal_payload, true
    FROM demoted
    RETURNING id INTO v_new_id;
  ELSE
    INSERT INTO public.customer_archetypes (
      user_id, archetype_id, confidence_score, assigned_from,
      signal_payload, is_primary
    ) VALUES (
      p_user_id, p_archetype_id, p_confidence_score, p_assigned_from,
      p_signal_payload, true
    )
    RETURNING id INTO v_new_id;
  END IF;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_primary_archetype(UUID, TEXT, NUMERIC, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_primary_archetype(UUID, TEXT, NUMERIC, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION public.assign_primary_archetype IS
  'Atomic primary archetype swap. SECURITY DEFINER; caller must verify admin role at the route layer (RLS would otherwise block writes anyway). Idempotent on (user_id, archetype_id).';
