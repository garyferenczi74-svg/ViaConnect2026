-- Prompt #160: Nutrition Log with AI-powered macro analysis.
-- nutrition_logs is the new canonical table for text-based and photo-based
-- meal entries with the full Gordan macronutrient schema (calories, protein_g,
-- carbs_g, total_fat_g, good_fat_g, healthy_fat_g, saturated_fat_g, sugar_g,
-- fiber_g) plus AI metadata (confidence, ai_notes, ai_model, ai_latency_ms).
-- Separate from the legacy meal_logs table (Prompt #62e) which retains the
-- Quick Log flow on /nutrition. nutrition_logs hosts the new Log Full Meal +
-- Photo AI flows; both tables coexist until a future consolidation pass.

CREATE TABLE IF NOT EXISTS public.nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  source TEXT NOT NULL CHECK (source IN ('manual_text', 'photo_ai', 'barcode', 'imported')),
  raw_input TEXT,
  photo_url TEXT,
  context_note TEXT,
  serving_description TEXT,
  calories INTEGER,
  protein_g NUMERIC(6,1),
  carbs_g NUMERIC(6,1),
  total_fat_g NUMERIC(6,1),
  good_fat_g NUMERIC(6,1),
  healthy_fat_g NUMERIC(6,1),
  saturated_fat_g NUMERIC(6,1),
  sugar_g NUMERIC(6,1),
  fiber_g NUMERIC(6,1),
  confidence NUMERIC(3,2),
  ai_notes TEXT,
  ai_model TEXT,
  ai_latency_ms INTEGER,
  user_edited BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'confirmed', 'discarded')),
  confirmed_at TIMESTAMPTZ,
  discarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nutrition_logs_user_logged_idx
  ON public.nutrition_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS nutrition_logs_user_status_idx
  ON public.nutrition_logs (user_id, status);

ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own nutrition logs" ON public.nutrition_logs;
CREATE POLICY "Users select own nutrition logs"
  ON public.nutrition_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own nutrition logs" ON public.nutrition_logs;
CREATE POLICY "Users insert own nutrition logs"
  ON public.nutrition_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own nutrition logs" ON public.nutrition_logs;
CREATE POLICY "Users update own nutrition logs"
  ON public.nutrition_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own nutrition logs" ON public.nutrition_logs;
CREATE POLICY "Users delete own nutrition logs"
  ON public.nutrition_logs FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.nutrition_logs_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nutrition_logs_set_updated_at ON public.nutrition_logs;
CREATE TRIGGER nutrition_logs_set_updated_at
  BEFORE UPDATE ON public.nutrition_logs
  FOR EACH ROW EXECUTE FUNCTION public.nutrition_logs_set_updated_at();
