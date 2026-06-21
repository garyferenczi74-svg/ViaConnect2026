-- Prompt 208a Module L: gold-set eval harness + cost control. Append-only.
-- Internal/governance tables (service-role only; the gold-set runs in CI/tests and
-- an admin health surface reads results). No authenticated policy.

CREATE TABLE IF NOT EXISTS public.eval_gold_set (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario text NOT NULL,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected_output jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.eval_gold_set ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.eval_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  passed integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  failures jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS eval_runs_run_at_idx ON public.eval_runs (run_at DESC);
ALTER TABLE public.eval_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.cost_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_ref text,
  tokens integer NOT NULL DEFAULT 0,
  api_calls integer NOT NULL DEFAULT 0,
  estimated_cost numeric NOT NULL DEFAULT 0,
  budget_state text NOT NULL DEFAULT 'ok' CHECK (budget_state IN ('ok','approaching','over')),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cost_ledger_recorded_idx ON public.cost_ledger (recorded_at DESC);
ALTER TABLE public.cost_ledger ENABLE ROW LEVEL SECURITY;
