-- Prompt 226d Wave A: goal domains + curated peptide links.
-- Selection is deterministic and curated. Models never choose compounds at query time.
-- Append-only.

CREATE TABLE IF NOT EXISTS public.kb_goal_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  caq_question_ids text[] NOT NULL DEFAULT '{}',
  clinical_caution_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.kb_goal_domains IS
  'Prompt 226d: curated wellness goal domains for evidence-matched peptide education.';

ALTER TABLE public.kb_goal_domains ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_goal_domains_select_authenticated ON public.kb_goal_domains;
CREATE POLICY kb_goal_domains_select_authenticated
  ON public.kb_goal_domains
  FOR SELECT TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS public.kb_goal_peptide_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_domain_id uuid NOT NULL REFERENCES public.kb_goal_domains(id) ON DELETE CASCADE,
  peptide_id uuid NOT NULL REFERENCES public.kb_peptides(id) ON DELETE CASCADE,
  mechanism_rationale text NOT NULL DEFAULT '',
  evidence_grade_for_this_goal text NOT NULL
    CHECK (evidence_grade_for_this_goal IN ('A', 'B', 'C', 'D', 'E')),
  indication_match text NOT NULL
    CHECK (indication_match IN (
      'studied_for_this_goal',
      'studied_adjacent_indication',
      'mechanistic_only',
      'community_claim_only'
    )),
  supporting_trial_ids uuid[] NOT NULL DEFAULT '{}',
  supporting_publication_ids uuid[] NOT NULL DEFAULT '{}',
  curated_by text NOT NULL DEFAULT 'jeffery',
  jeffery_review_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kb_goal_peptide_links_uq UNIQUE (goal_domain_id, peptide_id)
);

CREATE INDEX IF NOT EXISTS kb_goal_peptide_links_goal_grade_idx
  ON public.kb_goal_peptide_links (goal_domain_id, evidence_grade_for_this_goal);

COMMENT ON TABLE public.kb_goal_peptide_links IS
  'Prompt 226d: Jeffery-reviewed goal-to-peptide education links. Not recommendations.';

COMMENT ON COLUMN public.kb_goal_peptide_links.evidence_grade_for_this_goal IS
  'Goal-specific grade. A compound can be A for one goal and E for another.';

ALTER TABLE public.kb_goal_peptide_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_goal_peptide_links_select_authenticated ON public.kb_goal_peptide_links;
CREATE POLICY kb_goal_peptide_links_select_authenticated
  ON public.kb_goal_peptide_links
  FOR SELECT TO authenticated
  USING (true);

-- Seed domains (11). Idempotent.
INSERT INTO public.kb_goal_domains (slug, display_name, description, clinical_caution_notes)
VALUES
  ('weight_body_composition', 'Weight and body composition',
   'Education on compounds studied for adiposity and body composition endpoints.',
   'Metabolic compounds require clinician oversight especially with glucose-lowering therapy.'),
  ('tissue_repair_recovery', 'Tissue repair and recovery',
   'Education on compounds researched for connective tissue and recovery contexts.',
   'Injury management belongs with a licensed clinician.'),
  ('cognitive_mental_clarity', 'Cognitive function and mental clarity',
   'Education on compounds studied for cognitive or neuroprotective endpoints.',
   'Cognitive symptoms can signal medical conditions requiring evaluation.'),
  ('energy_fatigue', 'Energy and fatigue',
   'Education on compounds associated with energy and fatigue research.',
   'Persistent fatigue needs medical workup.'),
  ('sleep_quality', 'Sleep quality',
   'Education on compounds studied for sleep architecture or related endpoints.',
   'Sleep disorders may need clinical diagnosis.'),
  ('skin_hair', 'Skin and hair',
   'Education on compounds studied for dermal or hair endpoints.',
   'Dermatologic disease needs a clinician.'),
  ('gut_digestive_comfort', 'Gut and digestive comfort',
   'Education on compounds researched for gastrointestinal mucosal or comfort contexts.',
   'GI disease needs clinical evaluation.'),
  ('immune_resilience', 'Immune resilience',
   'Education on compounds studied for immune-modulating endpoints.',
   'Immunosuppression and infection require clinician care.'),
  ('longevity_healthy_aging', 'Longevity and healthy aging',
   'Education on compounds researched in aging-related endpoints.',
   'Longevity claims are often thin in human data.'),
  ('sexual_function', 'Sexual function',
   'Education on compounds studied for sexual function endpoints.',
   'Sexual dysfunction may reflect systemic disease.'),
  ('athletic_performance', 'Athletic performance',
   'Education on compounds discussed for performance contexts with WADA caution.',
   'Many performance peptides are prohibited in sport.')
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  clinical_caution_notes = EXCLUDED.clinical_caution_notes,
  updated_at = now();

-- Honest thin seed links (Jeffery-curated starter). Missing peptides are skipped.
INSERT INTO public.kb_goal_peptide_links (
  goal_domain_id, peptide_id, mechanism_rationale,
  evidence_grade_for_this_goal, indication_match, curated_by, jeffery_review_id
)
SELECT d.id, p.id, v.rationale, v.grade, v.match, 'jeffery', '226d-wave-a-seed'
FROM (
  VALUES
    ('weight_body_composition', 'liraglutide',
     'GLP-1 receptor agonist with human obesity and cardiometabolic trial evidence for weight endpoints.',
     'A', 'studied_for_this_goal'),
    ('weight_body_composition', 'retatrutide',
     'Multi-agonist investigational compound with emerging human body-composition data; regulatory status remains investigational.',
     'B', 'studied_for_this_goal'),
    ('tissue_repair_recovery', 'regenbpc',
     'BPC-157 class education: extensive preclinical repair literature; human controlled evidence remains limited.',
     'D', 'mechanistic_only'),
    ('tissue_repair_recovery', 'bpc-157-arginate',
     'BPC-157 related salt form used in educational monographs; human evidence for repair goals is thin.',
     'D', 'mechanistic_only'),
    ('gut_digestive_comfort', 'regenbpc',
     'Local GI targeting is the pharmacologic rationale for oral mucosal exposure in gut-focused education.',
     'D', 'mechanistic_only'),
    ('cognitive_mental_clarity', 'n-acetyl-semax-amidate',
     'Semax-class education: intranasal CNS research exists; human cognitive evidence is limited and not a treatment plan.',
     'D', 'studied_adjacent_indication'),
    ('cognitive_mental_clarity', 'n-acetyl-selank-amidate',
     'Selank-class education: studied in anxiety-adjacent CNS contexts; not a prescription substitute.',
     'D', 'studied_adjacent_indication'),
    ('cognitive_mental_clarity', 'semax',
     'Semax educational monograph: CNS-oriented research; human evidence grade remains limited for consumer goals.',
     'D', 'studied_adjacent_indication'),
    ('cognitive_mental_clarity', 'selank',
     'Selank educational monograph: CNS-oriented research; human evidence grade remains limited for consumer goals.',
     'D', 'studied_adjacent_indication')
) AS v(goal_slug, peptide_slug, rationale, grade, match)
JOIN public.kb_goal_domains d ON d.slug = v.goal_slug
JOIN public.kb_peptides p ON p.slug = v.peptide_slug
WHERE p.exclusion_tier = 'educational'
ON CONFLICT (goal_domain_id, peptide_id) DO UPDATE SET
  mechanism_rationale = EXCLUDED.mechanism_rationale,
  evidence_grade_for_this_goal = EXCLUDED.evidence_grade_for_this_goal,
  indication_match = EXCLUDED.indication_match,
  jeffery_review_id = EXCLUDED.jeffery_review_id,
  updated_at = now();

-- Starter route rows (no bioavailability numbers without citations).
INSERT INTO public.kb_peptide_routes (
  peptide_id, route, target_site_class, rationale,
  route_evidence_grade, human_data_for_route,
  is_preferred_by_evidence, preference_rationale
)
SELECT p.id, v.route, v.site, v.rationale, v.grade, v.human, v.preferred, v.pref_r
FROM (
  VALUES
    ('regenbpc', 'liposomal_oral', 'local_gi',
     'Oral delivery places compound near gut mucosa for gastrointestinal education goals.',
     'D', false, true,
     'For gut goals, local GI targeting favors an oral or liposomal-oral studied route when present.'),
    ('regenbpc', 'subcutaneous', 'local_musculoskeletal',
     'Parenteral routes are studied in systemic or musculoskeletal repair education contexts.',
     'D', false, true,
     'For musculoskeletal goals, parenteral routes are preferred when oral delivery is degraded systemically.'),
    ('bpc-157-arginate', 'oral', 'local_gi',
     'Oral salt forms are discussed for GI-localized education; human data remain limited.',
     'D', false, true,
     'Gut goal preference for oral local exposure when that route row exists.'),
    ('n-acetyl-semax-amidate', 'intranasal', 'cns',
     'Intranasal delivery is studied for nose-to-brain CNS education contexts. Systemic bioavailability is not asserted here.',
     'D', false, true,
     'CNS goals prefer intranasal when that route carries supporting educational literature.'),
    ('n-acetyl-selank-amidate', 'intranasal', 'cns',
     'Intranasal delivery is studied for CNS-oriented education. No unsourced bioavailability percentage is stored.',
     'D', false, true,
     'CNS goals prefer intranasal when present with route-level rationale.'),
    ('liraglutide', 'subcutaneous', 'systemic',
     'Subcutaneous administration is the studied systemic route for approved GLP-1 weight indication education.',
     'A', true, true,
     'Systemic metabolic goals prefer the parenteral route with human indication data.')
) AS v(slug, route, site, rationale, grade, human, preferred, pref_r)
JOIN public.kb_peptides p ON p.slug = v.slug
ON CONFLICT (peptide_id, route, target_site_class) DO UPDATE SET
  rationale = EXCLUDED.rationale,
  route_evidence_grade = EXCLUDED.route_evidence_grade,
  human_data_for_route = EXCLUDED.human_data_for_route,
  is_preferred_by_evidence = EXCLUDED.is_preferred_by_evidence,
  preference_rationale = EXCLUDED.preference_rationale,
  updated_at = now();
