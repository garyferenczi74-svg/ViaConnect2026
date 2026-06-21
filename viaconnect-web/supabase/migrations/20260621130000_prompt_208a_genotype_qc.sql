-- Prompt 208a Module A: genotype QC + normalization. Append-only.
-- genotype_uploads = one QC verdict per upload; variant_calls = per-variant QC.
-- Owner-scoped RLS (consumer-derived QC data). The qualified-variant reader in
-- synthesis uses variant_calls to BLOCK rule application on unresolved orientation.

CREATE TABLE IF NOT EXISTS public.genotype_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text,
  detected_build text,
  normalized_build text,
  qc_status text NOT NULL DEFAULT 'clean' CHECK (qc_status IN ('clean','flagged','blocked')),
  normalization_confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS genotype_uploads_user_idx ON public.genotype_uploads (user_id, created_at DESC);
ALTER TABLE public.genotype_uploads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS genotype_uploads_select_own ON public.genotype_uploads;
CREATE POLICY genotype_uploads_select_own ON public.genotype_uploads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS genotype_uploads_insert_own ON public.genotype_uploads;
CREATE POLICY genotype_uploads_insert_own ON public.genotype_uploads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.variant_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id uuid REFERENCES public.genotype_uploads(id) ON DELETE CASCADE,
  rsid text NOT NULL,
  raw_genotype text,
  normalized_genotype text,
  orientation_resolved boolean NOT NULL DEFAULT false,
  call_quality text,
  is_no_call boolean NOT NULL DEFAULT false,
  is_imputed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS variant_calls_user_rsid_idx ON public.variant_calls (user_id, rsid, created_at DESC);
ALTER TABLE public.variant_calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS variant_calls_select_own ON public.variant_calls;
CREATE POLICY variant_calls_select_own ON public.variant_calls
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS variant_calls_insert_own ON public.variant_calls;
CREATE POLICY variant_calls_insert_own ON public.variant_calls
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
