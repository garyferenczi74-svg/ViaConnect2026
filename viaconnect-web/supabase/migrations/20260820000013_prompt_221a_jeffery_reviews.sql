-- Prompt 221A: Jeffery managerial review layer (fail-closed).
-- On TOP of Marshall and Lex. Never replaces them. Never fails open to approval.
-- Append-only. Apply only after 219N soak PASS (same freeze rule as 221).

-- ---------------------------------------------------------------------------
-- jeffery_reviews (append-only history; one is_current per artifact)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jeffery_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_type text NOT NULL CHECK (artifact_type IN (
    'kb_promotion',
    'synthesis',
    'agent_digest_compile',
    'completion_report',
    'config_change',
    'agent_kpi_pass'
  )),
  artifact_ref text NOT NULL,
  review_checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  verdict text NOT NULL CHECK (verdict IN (
    'approved', 'rejected', 'needs_human'
  )),
  reviewer_mode text NOT NULL CHECK (reviewer_mode IN (
    'programmatic', 'ai_assisted', 'gary_escalation'
  )),
  handler_version text NOT NULL DEFAULT '221a.1',
  rationale_summary text,
  produced_by_agent text,
  is_current boolean NOT NULL DEFAULT true,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jeffery_reviews_artifact_idx
  ON public.jeffery_reviews (artifact_type, artifact_ref, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS jeffery_reviews_verdict_idx
  ON public.jeffery_reviews (verdict, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS jeffery_reviews_current_idx
  ON public.jeffery_reviews (artifact_type, artifact_ref)
  WHERE is_current = true;
CREATE UNIQUE INDEX IF NOT EXISTS jeffery_reviews_one_current
  ON public.jeffery_reviews (artifact_type, artifact_ref)
  WHERE is_current = true;

ALTER TABLE public.jeffery_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jeffery_reviews_admin_select ON public.jeffery_reviews;
CREATE POLICY jeffery_reviews_admin_select ON public.jeffery_reviews
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

-- Denormalized verdict on kb_items for hard-block retrieval (fail-closed default)
ALTER TABLE public.kb_items
  ADD COLUMN IF NOT EXISTS jeffery_verdict text
    CHECK (jeffery_verdict IS NULL OR jeffery_verdict IN (
      'pending', 'approved', 'rejected', 'needs_human'
    ));

ALTER TABLE public.kb_items
  ALTER COLUMN jeffery_verdict SET DEFAULT 'pending';

UPDATE public.kb_items
  SET jeffery_verdict = 'pending'
  WHERE jeffery_verdict IS NULL;

CREATE INDEX IF NOT EXISTS kb_items_jeffery_verdict_idx
  ON public.kb_items (jeffery_verdict)
  WHERE gate_status IN ('approved', 'lex_approved');

-- ---------------------------------------------------------------------------
-- Record a Jeffery review (append; mark previous current false)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_jeffery_review(
  p_artifact_type text,
  p_artifact_ref text,
  p_review_checks jsonb,
  p_verdict text,
  p_reviewer_mode text,
  p_handler_version text DEFAULT '221a.1',
  p_rationale_summary text DEFAULT NULL,
  p_produced_by_agent text DEFAULT NULL
) RETURNS public.jeffery_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.jeffery_reviews;
BEGIN
  IF p_verdict NOT IN ('approved', 'rejected', 'needs_human') THEN
    RAISE EXCEPTION 'invalid_verdict';
  END IF;
  IF p_reviewer_mode NOT IN ('programmatic', 'ai_assisted', 'gary_escalation') THEN
    RAISE EXCEPTION 'invalid_reviewer_mode';
  END IF;

  -- No self-approval: Jeffery-produced artifacts cannot be approved under his seat
  IF p_produced_by_agent = 'jeffery' AND p_verdict = 'approved'
     AND p_reviewer_mode <> 'gary_escalation' THEN
    RAISE EXCEPTION 'no_self_review_approval';
  END IF;

  UPDATE public.jeffery_reviews
  SET is_current = false
  WHERE artifact_type = p_artifact_type
    AND artifact_ref = p_artifact_ref
    AND is_current = true;

  INSERT INTO public.jeffery_reviews (
    artifact_type, artifact_ref, review_checks, verdict, reviewer_mode,
    handler_version, rationale_summary, produced_by_agent, is_current
  ) VALUES (
    p_artifact_type, p_artifact_ref, COALESCE(p_review_checks, '[]'::jsonb),
    p_verdict, p_reviewer_mode, p_handler_version, p_rationale_summary,
    p_produced_by_agent, true
  )
  RETURNING * INTO v_row;

  -- Sync denormalized field for KB artifacts
  IF p_artifact_type IN ('kb_promotion', 'synthesis') THEN
    UPDATE public.kb_items
    SET
      jeffery_verdict = p_verdict,
      updated_at = now()
    WHERE id::text = p_artifact_ref;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.record_jeffery_review(text, text, jsonb, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_jeffery_review(text, text, jsonb, text, text, text, text, text) TO service_role;

-- ---------------------------------------------------------------------------
-- Replace promote_kb_item: Marshall/Lex first; Jeffery does NOT auto-approve.
-- Target live statuses leave jeffery_verdict pending until record_jeffery_review.
-- ---------------------------------------------------------------------------
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
BEGIN
  IF p_target_status NOT IN ('approved', 'rejected', 'lex_review', 'lex_approved') THEN
    RAISE EXCEPTION 'invalid_target_status';
  END IF;

  SELECT * INTO v_item FROM public.kb_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_not_found';
  END IF;

  SELECT * INTO v_coll FROM public.kb_collections WHERE id = v_item.primary_collection_id;

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

  INSERT INTO public.kb_items_history (item_id, snapshot, changed_fields)
  VALUES (
    p_item_id,
    to_jsonb(v_item),
    ARRAY['gate_status', 'jeffery_verdict']::text[]
  );

  UPDATE public.kb_items
  SET
    gate_status = p_target_status,
    gate_decided_at = now(),
    gate_reason = p_gate_reason,
    -- Fail-closed: live gate statuses wait for Jeffery; rejections clear eligibility
    jeffery_verdict = CASE
      WHEN p_target_status = 'rejected' THEN 'rejected'
      WHEN p_target_status IN ('approved', 'lex_approved') THEN 'pending'
      ELSE COALESCE(jeffery_verdict, 'pending')
    END,
    updated_at = now()
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  RETURN v_item;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_kb_item(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_kb_item(uuid, text, text, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- kb_search hard-block: gate approved/lex_approved AND jeffery_verdict approved
-- ---------------------------------------------------------------------------
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
    AND COALESCE(i.jeffery_verdict, 'pending') = 'approved'
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

-- Authenticated read: live only when both Marshall/Lex gate and Jeffery approve
DROP POLICY IF EXISTS kb_items_select_live ON public.kb_items;
CREATE POLICY kb_items_select_live ON public.kb_items
  FOR SELECT TO authenticated
  USING (
    gate_status IN ('approved', 'lex_approved')
    AND COALESCE(jeffery_verdict, 'pending') = 'approved'
    AND (consumer_safe = true OR practitioner_depth = true)
  );

COMMENT ON TABLE public.jeffery_reviews IS
  'Prompt 221A: Jeffery managerial review. Fail-closed. Marshall and Lex sequenced before. No self-approval.';
COMMENT ON FUNCTION public.record_jeffery_review IS
  'Append Jeffery review; denormalize kb_items.jeffery_verdict for hard-block retrieval.';
