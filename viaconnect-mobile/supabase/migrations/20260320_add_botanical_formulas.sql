-- ============================================================
-- Migration: Add botanical_formulas tables for Naturopath Portal
-- Tables: botanical_formulas, botanical_formula_items
-- Applied: 2026-03-20
-- ============================================================

-- 1. Botanical formulas (naturopath multi-herb formulations)
CREATE TABLE IF NOT EXISTS public.botanical_formulas (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  practitioner_id uuid NOT NULL REFERENCES public.profiles(id),
  patient_id uuid REFERENCES public.profiles(id),
  formula_name text NOT NULL,
  preparation text NOT NULL CHECK (preparation IN ('tincture', 'tea', 'capsule', 'topical', 'powder')),
  instructions text,
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.botanical_formulas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Practitioners can view own formulas" ON public.botanical_formulas
  FOR SELECT USING (auth.uid() = practitioner_id);
CREATE POLICY "Practitioners can insert formulas" ON public.botanical_formulas
  FOR INSERT WITH CHECK (auth.uid() = practitioner_id);
CREATE POLICY "Practitioners can update own formulas" ON public.botanical_formulas
  FOR UPDATE USING (auth.uid() = practitioner_id);

-- 2. Botanical formula items (herbs in a formula)
CREATE TABLE IF NOT EXISTS public.botanical_formula_items (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  formula_id uuid NOT NULL REFERENCES public.botanical_formulas(id) ON DELETE CASCADE,
  herb_id uuid NOT NULL REFERENCES public.herbs(id),
  dosage text,
  ratio text,
  sequence_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.botanical_formula_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Items viewable with formula access" ON public.botanical_formula_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.botanical_formulas WHERE id = formula_id AND practitioner_id = auth.uid())
  );
CREATE POLICY "Items insertable with formula access" ON public.botanical_formula_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.botanical_formulas WHERE id = formula_id AND practitioner_id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_botanical_formulas_practitioner ON public.botanical_formulas(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_botanical_formulas_patient ON public.botanical_formulas(patient_id);
CREATE INDEX IF NOT EXISTS idx_botanical_formula_items_formula ON public.botanical_formula_items(formula_id);
