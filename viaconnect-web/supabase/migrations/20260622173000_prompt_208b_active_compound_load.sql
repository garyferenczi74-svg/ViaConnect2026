-- Prompt 208b 4.6: total stimulant / active-compound load. Append-only.
-- Aggregates a compound (e.g. caffeine) across food/drink + supplements, contextualized
-- by metabolism genetics (CYP1A2). Owner-scoped.
CREATE TABLE IF NOT EXISTS public.active_compound_load (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compound text NOT NULL,
  food_source_total numeric NOT NULL DEFAULT 0,
  supplement_source_total numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  metabolizer_context text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS active_compound_load_user_idx ON public.active_compound_load (user_id, compound, created_at DESC);
ALTER TABLE public.active_compound_load ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS active_compound_load_select_own ON public.active_compound_load;
CREATE POLICY active_compound_load_select_own ON public.active_compound_load
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS active_compound_load_insert_own ON public.active_compound_load;
CREATE POLICY active_compound_load_insert_own ON public.active_compound_load
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
