-- Prompt 221B: Collection 13 Hormone Education Database.
-- Append-only. Registers hormone_education (C13), kb_hormones typed table,
-- payload_type hormone, user hormone_reports, and unmatched marker review queue.
-- Full A1 catalog seeding joins Phase 3; this migration is schema + registry only.

-- ---------------------------------------------------------------------------
-- Extend kb_items.payload_type to include hormone
-- ---------------------------------------------------------------------------
ALTER TABLE public.kb_items
  DROP CONSTRAINT IF EXISTS kb_items_payload_type_check;

ALTER TABLE public.kb_items
  ADD CONSTRAINT kb_items_payload_type_check
  CHECK (payload_type IN (
    'product', 'study', 'association', 'delivery_tech',
    'genetic_test', 'synthesis', 'education_entry', 'hormone'
  ));

-- ---------------------------------------------------------------------------
-- C13 collection registry
-- ---------------------------------------------------------------------------
INSERT INTO public.kb_collections (
  slug, display_name, owning_agent, co_owner_agents, source_classes,
  cadence_class, gate_profile, seeding_phase, status
) VALUES (
  'hormone_education',
  'Hormone education database',
  'arnold',
  ARRAY['elysium', 'gordon', 'thanos', 'hannah', 'lex', 'marshall']::text[],
  ARRAY['pubmed', 'firecrawl_allowlist', 'internal_derivation']::text[],
  'weekly',
  'lex_lane',
  3,
  'planned'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  owning_agent = EXCLUDED.owning_agent,
  co_owner_agents = EXCLUDED.co_owner_agents,
  source_classes = EXCLUDED.source_classes,
  cadence_class = EXCLUDED.cadence_class,
  gate_profile = EXCLUDED.gate_profile,
  seeding_phase = EXCLUDED.seeding_phase;

-- ---------------------------------------------------------------------------
-- kb_hormones (typed payload for C13)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_hormones (
  item_id uuid PRIMARY KEY REFERENCES public.kb_items(id) ON DELETE CASCADE,
  hormone_slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  hormone_class text NOT NULL CHECK (hormone_class IN (
    'androgen', 'estrogen', 'progestogen', 'regulator',
    'thyroid', 'adrenal', 'metabolic', 'other'
  )),
  sex_relevance text NOT NULL CHECK (sex_relevance IN ('male', 'female', 'both')),
  physiology_summary text NOT NULL DEFAULT '',
  male_content_block text NOT NULL DEFAULT '',
  female_content_block text NOT NULL DEFAULT '',
  life_stage_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  typical_ranges jsonb NOT NULL DEFAULT '[]'::jsonb,
  influencing_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_rsids text[] NOT NULL DEFAULT '{}',
  related_study_item_ids uuid[] NOT NULL DEFAULT '{}',
  related_ingredient_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  marker_mapping jsonb NOT NULL DEFAULT '[]'::jsonb,
  consumer_safe boolean NOT NULL DEFAULT false,
  practitioner_depth_block text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_hormones_class_idx
  ON public.kb_hormones (hormone_class);
CREATE INDEX IF NOT EXISTS kb_hormones_sex_idx
  ON public.kb_hormones (sex_relevance);
CREATE INDEX IF NOT EXISTS kb_hormones_consumer_safe_idx
  ON public.kb_hormones (consumer_safe)
  WHERE consumer_safe = true;

ALTER TABLE public.kb_hormones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_hormones_select ON public.kb_hormones;
CREATE POLICY kb_hormones_select ON public.kb_hormones
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.kb_items i
      WHERE i.id = item_id
        AND i.gate_status IN ('approved', 'lex_approved')
        AND COALESCE(i.jeffery_verdict, 'pending') = 'approved'
        AND i.consumer_safe = true
    )
  );

COMMENT ON TABLE public.kb_hormones IS
  'Prompt 221B C13: hormone education typed rows. consumer_safe defaults false until Marshall. practitioner_depth_block never consumer-rendered.';

-- ---------------------------------------------------------------------------
-- User hormone reports (generated Male/Female tracks)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hormone_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track text NOT NULL CHECK (track IN ('male', 'female')),
  generated_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sources jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hormone_reports_user_generated_idx
  ON public.hormone_reports (user_id, track, generated_at DESC);

ALTER TABLE public.hormone_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hormone_reports_select_own ON public.hormone_reports;
CREATE POLICY hormone_reports_select_own ON public.hormone_reports
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS hormone_reports_insert_own ON public.hormone_reports;
CREATE POLICY hormone_reports_insert_own ON public.hormone_reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS hormone_reports_update_own ON public.hormone_reports;
CREATE POLICY hormone_reports_update_own ON public.hormone_reports
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

COMMENT ON TABLE public.hormone_reports IS
  'Prompt 221B: per-user Male/Female hormone report snapshots. Education only; no therapy dosing.';

-- ---------------------------------------------------------------------------
-- Unmatched lab marker review queue (Part C1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hormone_marker_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biomarker text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sample_value numeric,
  sample_unit text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'mapped', 'rejected', 'ignored'
  )),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by text
);

CREATE INDEX IF NOT EXISTS hormone_marker_review_queue_status_idx
  ON public.hormone_marker_review_queue (status, created_at DESC);
CREATE INDEX IF NOT EXISTS hormone_marker_review_queue_biomarker_idx
  ON public.hormone_marker_review_queue (biomarker);

ALTER TABLE public.hormone_marker_review_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hormone_marker_review_queue_admin ON public.hormone_marker_review_queue;
CREATE POLICY hormone_marker_review_queue_admin ON public.hormone_marker_review_queue
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

COMMENT ON TABLE public.hormone_marker_review_queue IS
  'Prompt 221B: unmatched hormone-like lab biomarkers await mapping additions; never silent drop.';
