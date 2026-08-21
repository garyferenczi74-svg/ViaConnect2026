-- Prompt 226g / G40: Tesamorelin and Kisspeptin educational monograph stubs.
-- Append-only. Gary authorized. No banned GLP-1 brand compounds.
-- Stubs start educational, then Marshall consumer_safe approve, then goal links.

DO $$
DECLARE
  v_coll uuid;
  v_item uuid;
BEGIN
  SELECT id INTO v_coll FROM public.kb_collections WHERE slug = 'peptide_education' LIMIT 1;
  IF v_coll IS NULL THEN
    RAISE EXCEPTION 'peptide_education collection missing';
  END IF;

  -- Tesamorelin
  IF NOT EXISTS (SELECT 1 FROM public.kb_peptides WHERE slug = 'tesamorelin') THEN
    INSERT INTO public.kb_items (
      primary_collection_id, title, summary, content_hash, evidence_grade,
      gate_status, payload_type, practitioner_depth, consumer_safe, jeffery_verdict,
      provenance
    ) VALUES (
      v_coll,
      'Tesamorelin',
      'Synthetic GHRH analogue with human indication literature for reducing excess abdominal adipose tissue in HIV-associated lipodystrophy. Educational monograph only.',
      '226g-g40-tesamorelin',
      'A',
      'pending',
      'peptide',
      false,
      false,
      'pending',
      jsonb_build_object('source','226g_g40','slug','tesamorelin')
    )
    ON CONFLICT (content_hash) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_item;

    IF v_item IS NULL THEN
      SELECT id INTO v_item FROM public.kb_items WHERE content_hash = '226g-g40-tesamorelin';
    END IF;

    INSERT INTO public.kb_peptides (
      kb_item_id, slug, canonical_name, display_name, molecular_class, is_peptide,
      category, secondary_categories, mechanism_summary, mechanism_detail,
      evidence_grade_overall, evidence_summary, human_data_exists, strongest_model,
      fda_status, fda_503a_category, wada_status, wada_class,
      consumer_safe, marshall_status, lex_status, exclusion_tier,
      misconception_notes, sourcing_risk_notes, routes_studied
    ) VALUES (
      v_item,
      'tesamorelin',
      'Tesamorelin',
      'Tesamorelin',
      'peptide_analog',
      true,
      'GH Axis and Secretagogues',
      ARRAY['Hormonal Balance & Endocrine']::text[],
      'GHRH receptor agonist studied for visceral adipose reduction in labeled lipodystrophy contexts.',
      'Tesamorelin is a synthetic growth hormone-releasing hormone analogue. Human trials support reduction of excess abdominal adipose tissue in HIV-associated lipodystrophy. Community weight-loss discussions often extend beyond that labeled context. Educational framing only.',
      'A',
      'Human indication literature exists for visceral adipose reduction in HIV-associated lipodystrophy. Broader general-population weight claims remain thinner.',
      true,
      'human_rct',
      'approved_other_indication',
      'unknown',
      'prohibited_all_times',
      'S2.2.4',
      false,
      'pending',
      'not_required',
      'educational',
      'Not interchangeable with Sermorelin, CJC-1295, or Ipamorelin. Labeled indication is not general obesity.',
      'Educational framing only. No acquisition or vendor routing.',
      ARRAY['subcutaneous']::text[]
    )
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  -- Kisspeptin
  IF NOT EXISTS (SELECT 1 FROM public.kb_peptides WHERE slug = 'kisspeptin') THEN
    INSERT INTO public.kb_items (
      primary_collection_id, title, summary, content_hash, evidence_grade,
      gate_status, payload_type, practitioner_depth, consumer_safe, jeffery_verdict,
      provenance
    ) VALUES (
      v_coll,
      'Kisspeptin',
      'KISS1-derived peptide family (including KP-10 and KP-54 forms) that stimulates GnRH release. Studied in reproductive endocrinology and sexual-function adjacent research. Educational monograph only.',
      '226g-g40-kisspeptin',
      'C',
      'pending',
      'peptide',
      false,
      false,
      'pending',
      jsonb_build_object('source','226g_g40','slug','kisspeptin')
    )
    ON CONFLICT (content_hash) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_item;

    IF v_item IS NULL THEN
      SELECT id INTO v_item FROM public.kb_items WHERE content_hash = '226g-g40-kisspeptin';
    END IF;

    INSERT INTO public.kb_peptides (
      kb_item_id, slug, canonical_name, display_name, molecular_class, is_peptide,
      category, secondary_categories, mechanism_summary, mechanism_detail,
      evidence_grade_overall, evidence_summary, human_data_exists, strongest_model,
      fda_status, fda_503a_category, wada_status, wada_class,
      consumer_safe, marshall_status, lex_status, exclusion_tier,
      misconception_notes, sourcing_risk_notes, routes_studied
    ) VALUES (
      v_item,
      'kisspeptin',
      'Kisspeptin',
      'Kisspeptin',
      'peptide',
      true,
      'Hormonal Balance & Endocrine',
      ARRAY[]::text[],
      'KISS1R agonist pathway that drives GnRH pulse generation in reproductive axis education.',
      'Kisspeptin peptides (commonly discussed as KP-10 and KP-54) act on KISS1R to stimulate gonadotropin-releasing hormone release. Human research spans reproductive endocrinology, hypogonadism-adjacent contexts, and sexual-function discussions. Fragment length and route matter; forms are not interchangeable. Educational framing only.',
      'C',
      'Human reproductive-axis studies exist. Direct consumer sexual-function evidence is mixed and context dependent.',
      true,
      'human_controlled',
      'investigational',
      'unknown',
      'prohibited_all_times',
      'S2.2.1',
      false,
      'pending',
      'not_required',
      'educational',
      'KP-10 and KP-54 are related research forms, not identical products. Not a stand-in for PT-141 class melanocortin agonists.',
      'Educational framing only. No acquisition or vendor routing.',
      ARRAY['intravenous','subcutaneous']::text[]
    )
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- Synonyms for search
INSERT INTO public.kb_peptide_synonyms (peptide_id, synonym, synonym_type, is_primary_search_term)
SELECT p.id, v.synonym, v.synonym_type, v.primary
FROM (
  VALUES
    ('tesamorelin', 'Egrifta', 'trade_name', true),
    ('tesamorelin', 'TH9507', 'code_name', false),
    ('kisspeptin', 'Kisspeptin-10', 'community_name', true),
    ('kisspeptin', 'KP-10', 'community_name', true),
    ('kisspeptin', 'Kisspeptin-54', 'community_name', true),
    ('kisspeptin', 'Metastin', 'deprecated', false)
) AS v(slug, synonym, synonym_type, primary)
JOIN public.kb_peptides p ON p.slug = v.slug
ON CONFLICT (peptide_id, synonym, synonym_type) DO NOTHING;

-- Marshall consumer_safe approve (educational tier only)
UPDATE public.kb_peptides p
SET
  consumer_safe = true,
  marshall_status = 'approved',
  last_reviewed_at = now(),
  updated_at = now()
WHERE p.slug IN ('tesamorelin', 'kisspeptin')
  AND p.exclusion_tier = 'educational';

UPDATE public.kb_items i
SET
  consumer_safe = true,
  gate_status = 'approved',
  gate_decided_at = now(),
  gate_reason = '226g G40 Marshall consumer_safe approve',
  jeffery_verdict = 'approved',
  updated_at = now()
FROM public.kb_peptides p
WHERE p.kb_item_id = i.id
  AND p.slug IN ('tesamorelin', 'kisspeptin')
  AND p.exclusion_tier = 'educational'
  AND p.marshall_status = 'approved'
  AND p.consumer_safe = true;

-- Goal links (popular familiarity ranks)
INSERT INTO public.kb_goal_peptide_links (
  goal_domain_id, peptide_id, mechanism_rationale,
  evidence_grade_for_this_goal, indication_match,
  familiarity_rank, curated_by, jeffery_review_id
)
SELECT d.id, p.id, v.rationale, v.grade, v.match, v.rank, 'jeffery', '226g-g40-stubs'
FROM (
  VALUES
    ('weight_body_composition', 'tesamorelin',
     'GHRH analogue with human visceral adipose reduction literature in labeled lipodystrophy contexts. Broader general weight claims are thinner. Educational reference only.',
     'A', 'studied_for_this_goal', 12),
    ('sexual_function', 'kisspeptin',
     'KISS1 pathway education compound studied in reproductive endocrinology and sexual-function adjacent human research. Fragment forms differ. Educational reference only.',
     'C', 'studied_adjacent_indication', 12)
) AS v(goal_slug, peptide_slug, rationale, grade, match, rank)
JOIN public.kb_goal_domains d ON d.slug = v.goal_slug
JOIN public.kb_peptides p ON p.slug = v.peptide_slug
WHERE p.exclusion_tier = 'educational'
ON CONFLICT (goal_domain_id, peptide_id) DO UPDATE SET
  mechanism_rationale = EXCLUDED.mechanism_rationale,
  evidence_grade_for_this_goal = EXCLUDED.evidence_grade_for_this_goal,
  indication_match = EXCLUDED.indication_match,
  familiarity_rank = EXCLUDED.familiarity_rank,
  jeffery_review_id = EXCLUDED.jeffery_review_id,
  updated_at = now();
