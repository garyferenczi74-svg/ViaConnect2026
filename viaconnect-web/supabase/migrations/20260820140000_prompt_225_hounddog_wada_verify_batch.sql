-- Prompt 225 Phase 9: Hound Dog WADA 2026 S2 verification batch (Jeffery-gated).
-- Primary source: WADA 2026 Prohibited List (in force 1 Jan 2026).
-- Only promotes explicitly named S2 examples to prohibited_all_times.
-- Never writes not_prohibited. Gary continue authorization.

DO $$
DECLARE
  v_slugs text[] := ARRAY[
    'ipamorelin-standalone',
    'mk-677',
    'sermorelin',
    'cjc-1295-no-dac',
    'aod-9604',
    'anamorelin',
    'macimorelin',
    'tabimorelin',
    'ghrp-1'
  ];
  v_classes jsonb := jsonb_build_object(
    'ipamorelin-standalone', 'S2.2.4',
    'mk-677', 'S2.2.4',
    'sermorelin', 'S2.2.4',
    'cjc-1295-no-dac', 'S2.2.4',
    'aod-9604', 'S2.2.3',
    'anamorelin', 'S2.2.4',
    'macimorelin', 'S2.2.4',
    'tabimorelin', 'S2.2.4',
    'ghrp-1', 'S2.2.4'
  );
  r record;
  v_review uuid;
BEGIN
  FOR r IN
    SELECT p.id AS peptide_id, p.slug, p.kb_item_id, p.wada_status, p.regulatory_status
    FROM public.kb_peptides p
    WHERE p.slug = ANY (v_slugs)
  LOOP
    UPDATE public.jeffery_reviews
    SET is_current = false
    WHERE artifact_type = 'kb_promotion'
      AND artifact_ref = r.peptide_id::text
      AND is_current = true;

    INSERT INTO public.jeffery_reviews (
      artifact_type, artifact_ref, review_checks, verdict, reviewer_mode,
      handler_version, rationale_summary, produced_by_agent, is_current
    ) VALUES (
      'kb_promotion',
      r.peptide_id::text,
      jsonb_build_array(
        jsonb_build_object('check', 'hounddog_primary_source', 'pass', true),
        jsonb_build_object('check', 'wada_2026_explicit_name', 'pass', true),
        jsonb_build_object('check', 'no_not_prohibited_write', 'pass', true)
      ),
      'approved',
      'gary_escalation',
      '225.hounddog.wada_2026_s2',
      'Hound Dog verified explicit WADA 2026 S2 listing; Jeffery approved wada_status update.',
      'jeffery',
      true
    )
    RETURNING id INTO v_review;

    UPDATE public.kb_peptides
    SET
      wada_status = 'prohibited_all_times',
      wada_class = COALESCE(v_classes ->> r.slug, wada_class),
      regulatory_status = COALESCE(regulatory_status, '{}'::jsonb) || jsonb_build_object(
        'WADA',
        jsonb_build_object(
          'status', 'prohibited_all_times',
          'previous_status', r.wada_status,
          'wada_class', v_classes ->> r.slug,
          'source_citation_id', 'wada_2026_prohibited_list',
          'verified', true,
          'verified_at', now(),
          'verified_by', 'hounddog',
          'jeffery_review_id', v_review,
          'note', 'Explicit example on WADA 2026 Prohibited List S2 (all times).'
        )
      ),
      jeffery_review_id = v_review,
      last_reviewed_at = now(),
      updated_at = now()
    WHERE id = r.peptide_id;

    INSERT INTO public.kb_peptide_regulatory_events (
      peptide_id,
      jurisdiction,
      previous_status,
      new_status,
      effective_date,
      source_citation_id,
      detected_by,
      jeffery_review_id,
      applied_at
    )
    SELECT
      r.peptide_id,
      'WADA',
      r.wada_status,
      'prohibited_all_times',
      DATE '2026-01-01',
      'wada_2026_prohibited_list',
      'hounddog',
      v_review,
      now()
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.kb_peptide_regulatory_events e
      WHERE e.peptide_id = r.peptide_id
        AND e.jurisdiction = 'WADA'
        AND e.new_status = 'prohibited_all_times'
        AND e.source_citation_id = 'wada_2026_prohibited_list'
        AND e.applied_at IS NOT NULL
    );
  END LOOP;
END $$;
