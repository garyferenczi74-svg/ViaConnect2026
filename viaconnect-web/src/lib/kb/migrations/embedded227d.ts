/**
 * Embedded Prompt 227d migration SQL for Vercel runtime apply.
 * Generated from supabase/migrations. Do not hand-edit SQL here.
 */

export const PROMPT_227D_MIGRATIONS: ReadonlyArray<{ file: string; sql: string }> = [
  {
    "file": "20260821250000_prompt_227d_budget_ceiling.sql",
    "sql": "-- Prompt 227d G64: standing Sherlock curation budget ceiling (from measured cycles).\n\nCREATE TABLE IF NOT EXISTS public.curation_budget_ceiling (\n  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),\n  max_class3_per_cycle integer NOT NULL DEFAULT 5\n    CHECK (max_class3_per_cycle BETWEEN 1 AND 20),\n  max_class0_freshness_per_cycle integer NOT NULL DEFAULT 3\n    CHECK (max_class0_freshness_per_cycle BETWEEN 0 AND 20),\n  max_negative_samples_per_cycle integer NOT NULL DEFAULT 5\n    CHECK (max_negative_samples_per_cycle BETWEEN 0 AND 20),\n  measured_cycle_count integer NOT NULL DEFAULT 0,\n  measured_at timestamptz,\n  set_by text,\n  notes text NOT NULL DEFAULT '',\n  updated_at timestamptz NOT NULL DEFAULT now()\n);\n\nINSERT INTO public.curation_budget_ceiling (\n  id,\n  max_class3_per_cycle,\n  max_class0_freshness_per_cycle,\n  max_negative_samples_per_cycle,\n  notes\n) VALUES (\n  1,\n  5,\n  3,\n  5,\n  'Placeholder until 227d prove measures first cycles'\n)\nON CONFLICT (id) DO NOTHING;\n\nALTER TABLE public.curation_budget_ceiling ENABLE ROW LEVEL SECURITY;\nDROP POLICY IF EXISTS curation_budget_ceiling_select ON public.curation_budget_ceiling;\nCREATE POLICY curation_budget_ceiling_select ON public.curation_budget_ceiling\n  FOR SELECT TO authenticated USING (true);\n\nCOMMENT ON TABLE public.curation_budget_ceiling IS\n  'Prompt 227d G64: per-cycle Sherlock curation ceilings set from measured runs.';\n"
  }
];
