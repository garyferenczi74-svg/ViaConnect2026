-- Prompt 208b 4.5: absorption cofactor + nutrient-interaction matrix. Append-only.
-- Reference content (authenticated read) feeding Hannah's timing schedule (separate
-- antagonists, pair synergists) and Gordon's meal guidance.
CREATE TABLE IF NOT EXISTS public.nutrient_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutrient_a text NOT NULL,
  nutrient_b text NOT NULL,
  interaction_type text NOT NULL CHECK (interaction_type IN ('synergy','inhibition','timing_separation')),
  mechanism text,
  evidence_tier smallint CHECK (evidence_tier IN (1,2,3)),
  source_atom_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nutrient_a, nutrient_b, interaction_type)
);
ALTER TABLE public.nutrient_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nutrient_interactions_select ON public.nutrient_interactions;
CREATE POLICY nutrient_interactions_select ON public.nutrient_interactions
  FOR SELECT TO authenticated USING (true);

-- Seed the well-established cofactor / antagonist pairs. Idempotent.
INSERT INTO public.nutrient_interactions (nutrient_a, nutrient_b, interaction_type, mechanism, evidence_tier) VALUES
  ('iron','vitamin_c','synergy','vitamin C enhances non-heme iron absorption',1),
  ('calcium','iron','timing_separation','calcium competes with and reduces iron absorption; separate intake',2),
  ('zinc','copper','inhibition','high-dose zinc reduces copper absorption over time; balance the ratio',2),
  ('calcium','magnesium','timing_separation','calcium and magnesium compete for absorption at high doses; separate or balance',3),
  ('vitamin_d','calcium','synergy','vitamin D increases intestinal calcium absorption',1),
  ('zinc','iron','timing_separation','zinc and non-heme iron compete for absorption at high doses taken together',3),
  ('vitamin_e','vitamin_k','inhibition','high-dose vitamin E can antagonize vitamin K function',3),
  ('vitamin_d','magnesium','synergy','magnesium is a required cofactor for vitamin D metabolism',2)
ON CONFLICT (nutrient_a, nutrient_b, interaction_type) DO NOTHING;
