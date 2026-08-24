-- Prompt 227a Wave A: Sherlock Collection 14 curation schema.
-- Discovery proposes; promotion reviewed. Class 0/1 auto-apply only with guards.
-- Distinct from Research Hub Sherlock (#61b). Append-only.

-- Cycles
CREATE TABLE IF NOT EXISTS public.curation_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL DEFAULT 'sherlock_curation',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'halted', 'failed')),
  kill_switch_hit boolean NOT NULL DEFAULT false,
  budget jsonb NOT NULL DEFAULT '{}'::jsonb,
  gaps_selected jsonb NOT NULL DEFAULT '[]'::jsonb,
  gaps_closed integer NOT NULL DEFAULT 0,
  proposals_raised jsonb NOT NULL DEFAULT '{}'::jsonb,
  negative_results_count integer NOT NULL DEFAULT 0,
  yield_by_source_tier jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS curation_cycles_started_idx
  ON public.curation_cycles (started_at DESC);

ALTER TABLE public.curation_cycles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS curation_cycles_admin_select ON public.curation_cycles;
CREATE POLICY curation_cycles_admin_select ON public.curation_cycles
  FOR SELECT TO authenticated USING (true);

-- Gap census snapshots (219l artifacts)
CREATE TABLE IF NOT EXISTS public.curation_gap_census_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES public.curation_cycles(id) ON DELETE SET NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.curation_gap_census_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS curation_gap_census_select ON public.curation_gap_census_snapshots;
CREATE POLICY curation_gap_census_select ON public.curation_gap_census_snapshots
  FOR SELECT TO authenticated USING (true);

-- Field -> change class map (G60). Total for writable Collection 14 fields.
CREATE TABLE IF NOT EXISTS public.curation_field_class_map (
  target_table text NOT NULL,
  target_field text NOT NULL,
  change_class integer NOT NULL CHECK (change_class BETWEEN 0 AND 5),
  notes text NOT NULL DEFAULT '',
  PRIMARY KEY (target_table, target_field)
);

ALTER TABLE public.curation_field_class_map ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS curation_field_class_map_select ON public.curation_field_class_map;
CREATE POLICY curation_field_class_map_select ON public.curation_field_class_map
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.curation_field_class_map (target_table, target_field, change_class, notes) VALUES
  ('kb_trials', 'row_insert', 0, 'Additive trial row'),
  ('kb_publications', 'row_insert', 0, 'Additive publication row'),
  ('kb_peptide_synonyms', 'row_insert', 0, 'Additive synonym'),
  ('kb_trials', 'last_verified_at', 0, 'Freshness refresh'),
  ('kb_publications', 'last_verified_at', 0, 'Freshness refresh'),
  ('kb_peptides', 'evidence_grade_overall', 1, 'Downgrade auto; upgrade is class 2 via direction'),
  ('kb_peptides', 'honesty_layer', 1, 'Honesty / provenance counts'),
  ('kb_goal_peptide_links', 'evidence_grade_for_this_goal', 1, 'Cap/downgrade path'),
  ('kb_goal_peptide_links', 'indication_match', 2, 'Indication match changes'),
  ('kb_goal_peptide_links', 'row_insert', 2, 'New goal link'),
  ('kb_peptide_routes', 'is_preferred_by_evidence', 2, 'Route preference'),
  ('kb_peptide_routes', 'bioavailability_value', 2, 'Bioavailability value'),
  ('kb_peptides', 'misconception_notes', 2, 'Misconception notes'),
  ('kb_peptides', 'provenance_disclosure', 2, 'Disclosure edits'),
  ('kb_peptides', 'fda_status', 3, 'Regulatory'),
  ('kb_peptides', 'fda_503a_category', 3, '503A'),
  ('kb_peptides', 'wada_status', 3, 'WADA'),
  ('kb_peptides', 'wada_class', 3, 'WADA class'),
  ('kb_peptides', 'controlled_substance', 3, 'Controlled substance'),
  ('kb_peptides', 'exclusion_tier', 3, 'Exclusion tier'),
  ('kb_peptides', 'consumer_safe', 4, 'Marshall'),
  ('kb_goal_domains', 'row_insert', 5, 'Canon / taxonomy'),
  ('authorities_sources', 'source_tier', 5, 'Source tier reassignment')
ON CONFLICT (target_table, target_field) DO UPDATE SET
  change_class = EXCLUDED.change_class,
  notes = EXCLUDED.notes;

-- Proposals
CREATE TABLE IF NOT EXISTS public.curation_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES public.curation_cycles(id) ON DELETE SET NULL,
  gap_type text NOT NULL,
  target_table text NOT NULL,
  target_row_id uuid,
  target_field text NOT NULL,
  change_class integer NOT NULL CHECK (change_class BETWEEN 0 AND 5),
  direction text NOT NULL
    CHECK (direction IN ('addition', 'correction', 'subtraction', 'negative_result')),
  current_value jsonb,
  proposed_value jsonb,
  rationale text NOT NULL DEFAULT '',
  supporting_record_ids uuid[] NOT NULL DEFAULT '{}',
  source_tier integer,
  provenance_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN (
      'proposed', 'auto_applied', 'approved', 'rejected', 'superseded', 'escalated'
    )),
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  applied_at timestamptz,
  applied_by text,
  prior_value jsonb,
  reverted_at timestamptz,
  revert_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS curation_proposals_status_idx
  ON public.curation_proposals (status, change_class, created_at DESC);
CREATE INDEX IF NOT EXISTS curation_proposals_cycle_idx
  ON public.curation_proposals (cycle_id);

ALTER TABLE public.curation_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS curation_proposals_select ON public.curation_proposals;
CREATE POLICY curation_proposals_select ON public.curation_proposals
  FOR SELECT TO authenticated USING (true);

-- Rejection ledger (loop prevention)
CREATE TABLE IF NOT EXISTS public.curation_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES public.curation_proposals(id) ON DELETE SET NULL,
  fingerprint text NOT NULL,
  reason text NOT NULL,
  supporting_record_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS curation_rejections_fingerprint_idx
  ON public.curation_rejections (fingerprint);

ALTER TABLE public.curation_rejections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS curation_rejections_select ON public.curation_rejections;
CREATE POLICY curation_rejections_select ON public.curation_rejections
  FOR SELECT TO authenticated USING (true);

-- Negative results
CREATE TABLE IF NOT EXISTS public.curation_negative_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES public.curation_cycles(id) ON DELETE SET NULL,
  gap_type text NOT NULL,
  target_row_id uuid,
  query_terms_used text[] NOT NULL DEFAULT '{}',
  sources_searched text[] NOT NULL DEFAULT '{}',
  date_range_covered text,
  result_count integer NOT NULL DEFAULT 0 CHECK (result_count = 0),
  interpretation text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.curation_negative_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS curation_negative_results_select ON public.curation_negative_results;
CREATE POLICY curation_negative_results_select ON public.curation_negative_results
  FOR SELECT TO authenticated USING (true);

-- Corrections log
CREATE TABLE IF NOT EXISTS public.curation_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  compound_slug text,
  what_changed text NOT NULL,
  why text NOT NULL DEFAULT '',
  direction text NOT NULL
    CHECK (direction IN ('addition', 'correction', 'subtraction', 'negative_result')),
  triggering_record_id uuid,
  proposal_id uuid REFERENCES public.curation_proposals(id) ON DELETE SET NULL,
  public_summary text,
  marshall_status text NOT NULL DEFAULT 'pending'
    CHECK (marshall_status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.curation_corrections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS curation_corrections_select ON public.curation_corrections;
CREATE POLICY curation_corrections_select ON public.curation_corrections
  FOR SELECT TO authenticated USING (true);

-- Kill switch
CREATE TABLE IF NOT EXISTS public.sherlock_curation_kill_switch (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_halted boolean NOT NULL DEFAULT false,
  set_by text,
  set_at timestamptz,
  reason text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.sherlock_curation_kill_switch (id, is_halted, reason)
VALUES (1, false, 'initial')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.sherlock_curation_kill_switch ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sherlock_curation_kill_switch_select ON public.sherlock_curation_kill_switch;
CREATE POLICY sherlock_curation_kill_switch_select ON public.sherlock_curation_kill_switch
  FOR SELECT TO authenticated USING (true);

-- Human-reviewed baselines for drift audit
CREATE TABLE IF NOT EXISTS public.curation_human_reviewed_baselines (
  peptide_id uuid PRIMARY KEY REFERENCES public.kb_peptides(id) ON DELETE CASCADE,
  evidence_grade_overall text,
  honesty_layer jsonb NOT NULL DEFAULT '{}'::jsonb,
  provenance_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by text NOT NULL DEFAULT 'jeffery'
);

ALTER TABLE public.curation_human_reviewed_baselines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS curation_baselines_select ON public.curation_human_reviewed_baselines;
CREATE POLICY curation_baselines_select ON public.curation_human_reviewed_baselines
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.curation_proposals IS
  'Prompt 227a: Sherlock curation proposals. Sherlock writes proposals; Thanos applies Class 0/1.';
COMMENT ON TABLE public.curation_field_class_map IS
  'Prompt 227a G60: change class assigned by field lookup, never by agent judgement.';
COMMENT ON TABLE public.sherlock_curation_kill_switch IS
  'Prompt 227a: server-side halt for Collection 14 Sherlock curation loop.';
