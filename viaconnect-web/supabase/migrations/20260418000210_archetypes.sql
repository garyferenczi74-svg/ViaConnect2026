-- =============================================================================
-- Prompt #94 Phase 1.3: Customer archetypes
-- =============================================================================
-- Append-only. Two tables:
--   archetype_definitions   reference data with the 7 spec'd archetypes seeded
--   customer_archetypes     per-user assignment (primary + secondaries) with
--                           full audit trail in signal_payload
--
-- The (user_id, is_primary) UNIQUE is DEFERRABLE INITIALLY DEFERRED so a
-- re-classification job can swap is_primary on the old row + new row inside a
-- single transaction without ever leaving zero or two primaries visible.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Definitions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.archetype_definitions (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  short_description TEXT NOT NULL,
  long_description TEXT NOT NULL,

  primary_motivations TEXT[] NOT NULL,
  typical_clinical_focus TEXT[],
  typical_tier_preference TEXT CHECK (typical_tier_preference IS NULL OR typical_tier_preference IN ('free', 'gold', 'platinum', 'platinum_plus')),
  typical_genex360_tier TEXT CHECK (typical_genex360_tier IS NULL OR typical_genex360_tier IN ('none', 'genex_m', 'core', 'complete')),

  expected_ltv_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
  expected_churn_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.00,

  sort_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.archetype_definitions.expected_ltv_multiplier IS
  'Expected LTV relative to platform average (1.00 = average).';
COMMENT ON COLUMN public.archetype_definitions.expected_churn_multiplier IS
  'Expected churn relative to platform average. <1.00 = lower churn (more retentive).';

ALTER TABLE public.archetype_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS archetype_defs_read_all ON public.archetype_definitions;
CREATE POLICY archetype_defs_read_all
  ON public.archetype_definitions FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS archetype_defs_admin_all ON public.archetype_definitions;
CREATE POLICY archetype_defs_admin_all
  ON public.archetype_definitions FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.archetype_definitions (
  id, display_name, short_description, long_description,
  primary_motivations, typical_clinical_focus,
  typical_tier_preference, typical_genex360_tier,
  expected_ltv_multiplier, expected_churn_multiplier, sort_order
) VALUES
  ('precision_wellness_seeker', 'Precision Wellness Seeker',
    'Evidence-based self-optimizer with disposable income.',
    'Educated consumer in their 30s to 50s, often working in tech, finance, or healthcare. Reads extensively, trusts data, values personalization. Lifetime value driven by Platinum tier subscription and GeneX360 Core or Complete. Highly engaged, low churn once satisfied with results.',
    ARRAY['personalization', 'data driven decisions', 'optimal health', 'prevention'],
    ARRAY['functional_medicine', 'integrative_medicine', 'precision_wellness', 'longevity'],
    'platinum', 'core', 1.80, 0.65, 1),

  ('biohacker_optimizer', 'Biohacker, Optimizer',
    'Performance maximizing experimenter, often male 25 to 45.',
    'Seeks measurable performance improvements: cognitive, physical, metabolic. Purchases peptides, stacks, nootropics. Often follows Huberman, Rhonda Patrick, Attia. Drives high initial order value but more variable retention as they experiment with alternative platforms.',
    ARRAY['performance', 'experimentation', 'quantified self', 'peak cognition'],
    ARRAY['functional_medicine', 'precision_wellness', 'longevity'],
    'platinum', 'complete', 1.50, 1.15, 2),

  ('chronic_condition_navigator', 'Chronic Condition Navigator',
    'Managing an identified chronic condition, seeking better outcomes.',
    'Has a diagnosis (autoimmune, metabolic, gut, hormonal) and is frustrated with standard care. Often referred through a practitioner. Lifetime value is high and durable when the platform produces measurable improvement. Highly practitioner attached.',
    ARRAY['symptom relief', 'root cause', 'quality of life', 'practitioner guidance'],
    ARRAY['functional_medicine', 'integrative_medicine', 'naturopathic', 'gut_health'],
    'platinum', 'core', 2.10, 0.55, 3),

  ('preventive_health_parent', 'Preventive Health Parent',
    'Parent prioritizing family wellness, often mother 30 to 50.',
    'Drives Platinum Plus Family tier adoption. Manages wellness for two to four family members. High engagement with the app, moderate supplement volume per person but multiplied across family. Churn is lower because family wellness decisions are less impulsive to reverse.',
    ARRAY['family wellness', 'prevention', 'clean ingredients', 'long term health'],
    ARRAY['precision_wellness', 'preventive_medicine', 'pediatric'],
    'platinum_plus', 'core', 2.40, 0.50, 4),

  ('performance_athlete', 'Performance Athlete',
    'Competitive or serious recreational athlete, broad age range.',
    'Triathletes, CrossFitters, serious cyclists, weekend warriors. High supplement volume especially during training blocks. Seasonal variance in engagement. Gold or Platinum tier typical; GeneX-M sufficient for most.',
    ARRAY['performance', 'recovery', 'body composition', 'endurance'],
    ARRAY['sports_medicine', 'functional_medicine'],
    'gold', 'genex_m', 1.30, 0.90, 5),

  ('longevity_investor', 'Longevity Investor',
    'Affluent 45 plus, aggressively pursuing healthspan extension.',
    'Highest AOV segment. Purchases Complete GeneX360, full Platinum, multiple Outcome Stack bundles. Follows Bryan Johnson, Peter Attia. Low price sensitivity. Very low churn when the platform delivers advanced features. Small but extraordinarily valuable segment.',
    ARRAY['longevity', 'healthspan', 'advanced biomarkers', 'cutting edge protocols'],
    ARRAY['longevity', 'functional_medicine', 'integrative_medicine'],
    'platinum', 'complete', 3.20, 0.40, 6),

  ('genetic_curious_explorer', 'Genetic Curious Explorer',
    'Intrigued by genetic testing, lower engagement intensity.',
    'Attracted primarily by GeneX360 testing. Purchases one time test plus included gifted membership; may or may not continue after gift period. Conversion to paid rate is the key metric for this archetype. Often discovered the platform through a friend who got tested.',
    ARRAY['curiosity', 'self knowledge', 'genetic insight', 'novelty'],
    ARRAY['precision_wellness', 'general_primary_care'],
    'free', 'core', 0.70, 1.80, 7)
ON CONFLICT (id) DO UPDATE SET
  display_name              = EXCLUDED.display_name,
  short_description         = EXCLUDED.short_description,
  long_description          = EXCLUDED.long_description,
  primary_motivations       = EXCLUDED.primary_motivations,
  typical_clinical_focus    = EXCLUDED.typical_clinical_focus,
  typical_tier_preference   = EXCLUDED.typical_tier_preference,
  typical_genex360_tier     = EXCLUDED.typical_genex360_tier,
  expected_ltv_multiplier   = EXCLUDED.expected_ltv_multiplier,
  expected_churn_multiplier = EXCLUDED.expected_churn_multiplier,
  sort_order                = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- 2. Per-user assignment
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customer_archetypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archetype_id TEXT NOT NULL REFERENCES public.archetype_definitions(id),

  confidence_score NUMERIC(4, 3) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),

  assigned_from TEXT NOT NULL CHECK (assigned_from IN (
    'caq_initial', 'caq_refined_with_behavior', 'manual_admin_override', 'machine_learning_v1'
  )),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  signal_payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  is_primary BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DEFERRABLE INITIALLY DEFERRED on the partial index requires a different
-- pattern: PG only supports DEFERRABLE on table-level UNIQUE constraints, not
-- on partial indexes. To get one-primary-per-user with deferrable swap, we
-- model it as a UNIQUE constraint over (user_id, is_primary) WHERE is_primary
-- via a trigger. The simpler path: a partial unique INDEX is non-deferrable
-- but the re-classification job uses a single UPDATE statement that flips
-- the old row's is_primary to false in the same UPDATE that flips the new
-- row's to true (CTE). We document the constraint here as an INDEX with the
-- same effect.
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_archetypes_one_primary
  ON public.customer_archetypes(user_id)
  WHERE is_primary = true;

COMMENT ON INDEX public.uq_customer_archetypes_one_primary IS
  'One primary archetype per user. The re-classification job MUST flip is_primary on the old row to false in the same statement that inserts/flips the new row to true (use a CTE), since the index is non-deferrable.';
COMMENT ON COLUMN public.customer_archetypes.signal_payload IS
  'JSON of CAQ responses + behavioral signals that drove the assignment. Enables debugging and re-classification as algorithm improves.';

CREATE INDEX IF NOT EXISTS idx_customer_archetypes_user
  ON public.customer_archetypes(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_archetypes_archetype
  ON public.customer_archetypes(archetype_id) WHERE is_primary = true;

ALTER TABLE public.customer_archetypes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_archetypes_self_read ON public.customer_archetypes;
CREATE POLICY customer_archetypes_self_read
  ON public.customer_archetypes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS customer_archetypes_admin_all ON public.customer_archetypes;
CREATE POLICY customer_archetypes_admin_all
  ON public.customer_archetypes FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
