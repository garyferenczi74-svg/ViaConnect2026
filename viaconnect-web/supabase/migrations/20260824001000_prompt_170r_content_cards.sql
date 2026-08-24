-- Prompt 170r Phase 1: educational content cards (append-only).
-- Tables were missing on ViaConnect2026. Shapes match
-- docs/prompts/prompt-170r-phase-1-spec-2026-06-01.md section 3.1-3.2.
-- Publisher writes drafts first; published rows require the linter plus
-- Gary approval when caution is high or the category is genetic_education.

CREATE TABLE IF NOT EXISTS public.content_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  lead_text TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  key_takeaways_jsonb JSONB,
  what_to_do_next_jsonb JSONB,
  related_card_ids UUID[] NOT NULL DEFAULT '{}',
  citations_jsonb JSONB,
  fda_disclaimer_variant TEXT NOT NULL DEFAULT 'standard',
  primary_category TEXT NOT NULL CHECK (primary_category IN (
    'nutrient_education', 'bioavailability_and_absorption',
    'macronutrient_patterns', 'food_synergies_and_antagonists',
    'genetic_education', 'lifestyle_factors',
    'condition_relevant_education', 'supplement_mechanism')),
  secondary_tags TEXT[] NOT NULL DEFAULT '{}',
  triggering_caq_flags_jsonb JSONB,
  triggering_meal_patterns_jsonb JSONB,
  triggering_supplement_patterns_jsonb JSONB,
  relevance_score_weights_jsonb JSONB,
  prerequisite_card_ids UUID[] NOT NULL DEFAULT '{}',
  safety_mode_filter TEXT NOT NULL DEFAULT 'surface' CHECK (safety_mode_filter IN (
    'surface', 'do_not_surface_safety_mode', 'surface_only_safety_mode')),
  medical_caution_level TEXT NOT NULL DEFAULT 'low' CHECK (medical_caution_level IN (
    'low', 'medium', 'high')),
  bioavailability_bridge_card BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_reading_time_minutes INT,
  word_count INT,
  version INT NOT NULL DEFAULT 1,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  last_reviewed_at TIMESTAMPTZ,
  kelsey_compliance_review_id TEXT,
  gary_approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  gary_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_cards_published_category
  ON public.content_cards(primary_category, last_reviewed_at DESC)
  WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_content_cards_slug
  ON public.content_cards(slug) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_content_cards_secondary_tags
  ON public.content_cards USING GIN (secondary_tags) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_content_cards_bioavailability_bridge
  ON public.content_cards(bioavailability_bridge_card)
  WHERE is_published = TRUE AND bioavailability_bridge_card = TRUE;

ALTER TABLE public.content_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_cards_published_readable" ON public.content_cards;
CREATE POLICY "content_cards_published_readable"
  ON public.content_cards FOR SELECT
  USING (is_published = TRUE AND auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS content_cards_updated_at ON public.content_cards;
CREATE TRIGGER content_cards_updated_at
  BEFORE UPDATE ON public.content_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.content_card_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_card_id UUID REFERENCES public.content_cards(id) ON DELETE SET NULL,
  draft_slug TEXT NOT NULL,
  draft_title TEXT NOT NULL,
  draft_body_markdown TEXT NOT NULL,
  draft_metadata_jsonb JSONB,
  draft_state TEXT NOT NULL DEFAULT 'gordon_authoring' CHECK (draft_state IN (
    'gordon_authoring', 'gordon_review', 'kelsey_review',
    'linter_check', 'gary_approval', 'approved',
    'rejected', 'published')),
  rejection_reason TEXT,
  kelsey_review_notes TEXT,
  linter_check_results_jsonb JSONB,
  gordon_author_id UUID,
  kelsey_reviewer_id UUID,
  gary_approver_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_card_drafts_state
  ON public.content_card_drafts(draft_state, updated_at DESC);

ALTER TABLE public.content_card_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drafts_service_role_only" ON public.content_card_drafts;
CREATE POLICY "drafts_service_role_only"
  ON public.content_card_drafts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS content_card_drafts_updated_at ON public.content_card_drafts;
CREATE TRIGGER content_card_drafts_updated_at
  BEFORE UPDATE ON public.content_card_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
