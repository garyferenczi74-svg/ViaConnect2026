-- Prompt 227d G64: standing Sherlock curation budget ceiling (from measured cycles).

CREATE TABLE IF NOT EXISTS public.curation_budget_ceiling (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  max_class3_per_cycle integer NOT NULL DEFAULT 5
    CHECK (max_class3_per_cycle BETWEEN 1 AND 20),
  max_class0_freshness_per_cycle integer NOT NULL DEFAULT 3
    CHECK (max_class0_freshness_per_cycle BETWEEN 0 AND 20),
  max_negative_samples_per_cycle integer NOT NULL DEFAULT 5
    CHECK (max_negative_samples_per_cycle BETWEEN 0 AND 20),
  measured_cycle_count integer NOT NULL DEFAULT 0,
  measured_at timestamptz,
  set_by text,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.curation_budget_ceiling (
  id,
  max_class3_per_cycle,
  max_class0_freshness_per_cycle,
  max_negative_samples_per_cycle,
  notes
) VALUES (
  1,
  5,
  3,
  5,
  'Placeholder until 227d prove measures first cycles'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.curation_budget_ceiling ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS curation_budget_ceiling_select ON public.curation_budget_ceiling;
CREATE POLICY curation_budget_ceiling_select ON public.curation_budget_ceiling
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.curation_budget_ceiling IS
  'Prompt 227d G64: per-cycle Sherlock curation ceilings set from measured runs.';
