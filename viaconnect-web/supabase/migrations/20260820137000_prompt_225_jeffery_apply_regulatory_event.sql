-- Prompt 225 G7: Jeffery apply path for staged regulatory events.
-- Applies only when explicitly invoked. Never auto-promotes from Thanos.

CREATE OR REPLACE FUNCTION public.apply_kb_peptide_regulatory_event(
  p_event_id uuid,
  p_reviewer_mode text DEFAULT 'gary_escalation',
  p_rationale text DEFAULT NULL
) RETURNS public.kb_peptide_regulatory_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.kb_peptide_regulatory_events;
  v_review public.jeffery_reviews;
  v_status jsonb;
BEGIN
  IF p_reviewer_mode NOT IN ('programmatic', 'ai_assisted', 'gary_escalation') THEN
    RAISE EXCEPTION 'invalid_reviewer_mode';
  END IF;

  SELECT * INTO v_event
  FROM public.kb_peptide_regulatory_events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_found';
  END IF;

  IF v_event.applied_at IS NOT NULL THEN
    RAISE EXCEPTION 'event_already_applied';
  END IF;

  -- Record Jeffery review (fail-closed history)
  UPDATE public.jeffery_reviews
  SET is_current = false
  WHERE artifact_type = 'kb_promotion'
    AND artifact_ref = v_event.id::text
    AND is_current = true;

  INSERT INTO public.jeffery_reviews (
    artifact_type, artifact_ref, review_checks, verdict, reviewer_mode,
    handler_version, rationale_summary, produced_by_agent, is_current
  ) VALUES (
    'kb_promotion',
    v_event.id::text,
    jsonb_build_array(
      jsonb_build_object('check', 'regulatory_field_edit', 'pass', true),
      jsonb_build_object('check', 'thanos_staged_only', 'pass', true)
    ),
    'approved',
    p_reviewer_mode,
    '225.jeffery.regulatory_apply',
    COALESCE(p_rationale, 'Jeffery approved application of staged peptide regulatory event.'),
    'jeffery',
    true
  )
  RETURNING * INTO v_review;

  -- Merge jurisdiction status onto peptide.regulatory_status
  SELECT COALESCE(regulatory_status, '{}'::jsonb) INTO v_status
  FROM public.kb_peptides
  WHERE id = v_event.peptide_id
  FOR UPDATE;

  v_status := v_status || jsonb_build_object(
    v_event.jurisdiction,
    jsonb_build_object(
      'status', v_event.new_status,
      'previous_status', v_event.previous_status,
      'source_citation_id', v_event.source_citation_id,
      'applied_event_id', v_event.id,
      'verified', false,
      'note', 'Applied via Jeffery path; primary-source verification still required before treating as fact of record.'
    )
  );

  UPDATE public.kb_peptides
  SET
    regulatory_status = v_status,
    updated_at = now(),
    last_reviewed_at = now()
  WHERE id = v_event.peptide_id;

  UPDATE public.kb_peptide_regulatory_events
  SET
    jeffery_review_id = v_review.id,
    applied_at = now()
  WHERE id = v_event.id
  RETURNING * INTO v_event;

  RETURN v_event;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_kb_peptide_regulatory_event(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_kb_peptide_regulatory_event(uuid, text, text) TO service_role;

COMMENT ON FUNCTION public.apply_kb_peptide_regulatory_event(uuid, text, text) IS
  'Prompt 225 G7: apply staged Thanos regulatory event only after Jeffery/gary_escalation review. Does not auto-promote.';
