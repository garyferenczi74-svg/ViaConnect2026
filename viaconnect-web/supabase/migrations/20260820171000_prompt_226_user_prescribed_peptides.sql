-- Prompt 226: consumer-owned prescribed peptide entries.
-- Values originate from the user (their Rx). Never a platform recommendation.
-- Allowlist enforced in application (converter_eligible). Append-only.

CREATE TABLE IF NOT EXISTS public.user_prescribed_peptides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  peptide_id uuid NOT NULL REFERENCES public.kb_peptides(id) ON DELETE RESTRICT,
  -- User-entered from their prescription
  dose_amount numeric NOT NULL CHECK (dose_amount > 0),
  dose_unit text NOT NULL CHECK (dose_unit IN ('mg', 'mcg', 'IU')),
  vial_amount numeric CHECK (vial_amount IS NULL OR vial_amount > 0),
  vial_unit text CHECK (vial_unit IS NULL OR vial_unit IN ('mg', 'mcg', 'IU')),
  diluent_ml numeric CHECK (diluent_ml IS NULL OR diluent_ml > 0),
  frequency_text text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_prescribed_peptides_notes_len CHECK (char_length(notes) <= 500),
  CONSTRAINT user_prescribed_peptides_label_len CHECK (char_length(label) <= 80),
  CONSTRAINT user_prescribed_peptides_freq_len CHECK (char_length(frequency_text) <= 200)
);

CREATE INDEX IF NOT EXISTS user_prescribed_peptides_user_idx
  ON public.user_prescribed_peptides (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS user_prescribed_peptides_user_peptide_uq
  ON public.user_prescribed_peptides (user_id, peptide_id);

ALTER TABLE public.user_prescribed_peptides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_prescribed_peptides_select_own ON public.user_prescribed_peptides;
CREATE POLICY user_prescribed_peptides_select_own
  ON public.user_prescribed_peptides
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_prescribed_peptides_insert_own ON public.user_prescribed_peptides;
CREATE POLICY user_prescribed_peptides_insert_own
  ON public.user_prescribed_peptides
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_prescribed_peptides_update_own ON public.user_prescribed_peptides;
CREATE POLICY user_prescribed_peptides_update_own
  ON public.user_prescribed_peptides
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_prescribed_peptides_delete_own ON public.user_prescribed_peptides;
CREATE POLICY user_prescribed_peptides_delete_own
  ON public.user_prescribed_peptides
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_prescribed_peptides IS
  'Prompt 226: user-entered prescribed peptides. Not platform knowledge. Never feed Thanos/Hannah/RAG.';
