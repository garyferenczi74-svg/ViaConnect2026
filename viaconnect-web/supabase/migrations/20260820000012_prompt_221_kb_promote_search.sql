-- Prompt 221: promote_kb_item (sole live write helper) + kb_search hybrid RPC.
-- Service role executes promote; authenticated may call search for live rows.

CREATE OR REPLACE FUNCTION public.promote_kb_item(
  p_item_id uuid,
  p_target_status text,
  p_gate_reason text DEFAULT NULL,
  p_lex_decision_id uuid DEFAULT NULL
) RETURNS public.kb_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.kb_items;
  v_coll public.kb_collections;
  v_synth public.kb_syntheses;
BEGIN
  IF p_target_status NOT IN ('approved', 'rejected', 'lex_review', 'lex_approved') THEN
    RAISE EXCEPTION 'invalid_target_status';
  END IF;

  SELECT * INTO v_item FROM public.kb_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_not_found';
  END IF;

  SELECT * INTO v_coll FROM public.kb_collections WHERE id = v_item.primary_collection_id;

  -- Lex lane: sku competitive comparisons cannot reach lex_approved without decision
  IF p_target_status = 'lex_approved' THEN
    IF v_coll.gate_profile = 'lex_lane' OR EXISTS (
      SELECT 1 FROM public.kb_syntheses s
      WHERE s.item_id = p_item_id AND s.synthesis_type = 'sku_competitive_comparison'
    ) THEN
      IF p_lex_decision_id IS NULL THEN
        RAISE EXCEPTION 'lex_decision_required';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.kb_lex_decisions d
        WHERE d.id = p_lex_decision_id
          AND d.item_id = p_item_id
          AND d.decision = 'approved'
      ) THEN
        RAISE EXCEPTION 'lex_decision_invalid';
      END IF;
    END IF;
  END IF;

  -- Snapshot prior row for history
  INSERT INTO public.kb_items_history (item_id, snapshot, changed_fields)
  VALUES (
    p_item_id,
    to_jsonb(v_item),
    ARRAY['gate_status']::text[]
  );

  UPDATE public.kb_items
  SET
    gate_status = p_target_status,
    gate_decided_at = now(),
    gate_reason = p_gate_reason,
    updated_at = now()
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  RETURN v_item;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_kb_item(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_kb_item(uuid, text, text, uuid) TO service_role;

-- Hybrid search: vector similarity + optional filters. Fail empty when no embedding match.
CREATE OR REPLACE FUNCTION public.kb_search(
  p_query_embedding extensions.vector(768),
  p_collection_slugs text[] DEFAULT NULL,
  p_min_grade text DEFAULT NULL,
  p_include_practitioner boolean DEFAULT false,
  p_consumer_only boolean DEFAULT true,
  p_limit integer DEFAULT 6
) RETURNS TABLE (
  item_id uuid,
  title text,
  summary text,
  evidence_grade text,
  gate_status text,
  collection_slug text,
  payload_type text,
  distance float,
  provenance jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH grade_rank AS (
    SELECT * FROM (VALUES
      ('A', 1), ('B', 2), ('C', 3), ('D', 4), ('E', 5)
    ) AS t(g, r)
  ),
  min_r AS (
    SELECT COALESCE(
      (SELECT r FROM grade_rank WHERE g = p_min_grade),
      5
    ) AS r
  )
  SELECT
    i.id AS item_id,
    i.title,
    i.summary,
    i.evidence_grade,
    i.gate_status,
    c.slug AS collection_slug,
    i.payload_type,
    (i.embedding <=> p_query_embedding)::float AS distance,
    i.provenance
  FROM public.kb_items i
  JOIN public.kb_collections c ON c.id = i.primary_collection_id
  CROSS JOIN min_r
  LEFT JOIN grade_rank gr ON gr.g = i.evidence_grade
  WHERE i.gate_status IN ('approved', 'lex_approved')
    AND i.embedding IS NOT NULL
    AND i.superseded_by IS NULL
    AND (p_collection_slugs IS NULL OR c.slug = ANY (p_collection_slugs))
    AND (
      NOT p_consumer_only
      OR (i.consumer_safe = true AND (i.practitioner_depth = false OR p_include_practitioner))
    )
    AND (
      i.evidence_grade IS NULL
      OR COALESCE(gr.r, 5) <= (SELECT r FROM min_r)
    )
  ORDER BY i.embedding <=> p_query_embedding
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 6), 50));
$$;

REVOKE ALL ON FUNCTION public.kb_search(extensions.vector, text[], text, boolean, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kb_search(extensions.vector, text[], text, boolean, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kb_search(extensions.vector, text[], text, boolean, boolean, integer) TO service_role;
