-- Prompt 226 Wave 0: concentration converter schema (append-only).
-- Dose values in converter_sessions are USER-ENTERED only.
-- Never readable by Thanos / Hannah retrieval / RAG (enforced in app CI).
-- Collection 14 monographs still forbid dose keys (225 CHECK unchanged).

-- ---------------------------------------------------------------------------
-- Allowlist columns on kb_peptides
-- ---------------------------------------------------------------------------
ALTER TABLE public.kb_peptides
  ADD COLUMN IF NOT EXISTS converter_eligible boolean NOT NULL DEFAULT false;

ALTER TABLE public.kb_peptides
  ADD COLUMN IF NOT EXISTS health_canada_status text NOT NULL DEFAULT 'unknown'
    CHECK (health_canada_status IN (
      'approved', 'approved_other_indication', 'investigational',
      'not_approved', 'withdrawn', 'unknown'
    ));

ALTER TABLE public.kb_peptides
  ADD COLUMN IF NOT EXISTS iu_mg_factor numeric;

ALTER TABLE public.kb_peptides
  ADD COLUMN IF NOT EXISTS iu_mg_factor_verified boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.kb_peptides.converter_eligible IS
  'Prompt 226: Marshall must explicitly flip true. Required together with approved FDA/HC status for Module A picker.';

COMMENT ON COLUMN public.kb_peptides.iu_mg_factor IS
  'Optional compound-specific IU to mg factor. IU unit disabled unless iu_mg_factor_verified is true.';

CREATE INDEX IF NOT EXISTS kb_peptides_converter_eligible_idx
  ON public.kb_peptides (converter_eligible)
  WHERE converter_eligible = true;

-- ---------------------------------------------------------------------------
-- Versioned Lex-controlled disclaimers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.converter_disclaimer_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  layer1_markdown text NOT NULL,
  layer2_text text NOT NULL,
  layer3_text text NOT NULL,
  lex_status text NOT NULL DEFAULT 'pending'
    CHECK (lex_status IN ('pending', 'cleared', 'blocked')),
  marshall_status text NOT NULL DEFAULT 'pending'
    CHECK (marshall_status IN ('pending', 'approved', 'rejected')),
  effective_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.converter_disclaimer_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS converter_disclaimer_versions_select ON public.converter_disclaimer_versions;
CREATE POLICY converter_disclaimer_versions_select
  ON public.converter_disclaimer_versions
  FOR SELECT TO authenticated
  USING (lex_status = 'cleared' AND marshall_status = 'approved');

-- Seed v1 copy (Appendix A / Section 7). Starts pending Lex (G20).
INSERT INTO public.converter_disclaimer_versions (
  version, layer1_markdown, layer2_text, layer3_text, lex_status, marshall_status
)
VALUES (
  '226-v1',
  $d1$**This is a unit conversion tool. It is not a dosing recommendation.**

ViaConnect does not recommend, suggest, or endorse any dose of any compound. This tool converts numbers that you enter into syringe units. Every value it produces comes from values you supplied.

This is educational information only and is not medical advice, not a prescription, and not a substitute for care from a licensed clinician. ViaConnect is not your doctor and no doctor-patient relationship is created by using this tool.

Doses should come from a licensed prescriber who knows your medical history. If you do not have one, this tool cannot substitute for that.

**Confirm which syringe you are physically holding before you continue.** A U-40 syringe used with a U-100 calculation delivers two and a half times the intended amount.$d1$,
  'Educational information only. Not medical advice and not a doctor''s recommendation. This tool converts the values you enter and cannot verify whether they are correct or appropriate for you. Confirm your dose with a licensed prescriber and check your syringe standard before drawing.',
  'Converted from values you entered. Not a recommended dose. Educational use only, not medical advice.',
  'pending',
  'pending'
)
ON CONFLICT (version) DO UPDATE SET
  layer1_markdown = EXCLUDED.layer1_markdown,
  layer2_text = EXCLUDED.layer2_text,
  layer3_text = EXCLUDED.layer3_text,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- First-use acknowledgements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.converter_disclaimer_acks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disclaimer_version_id uuid NOT NULL REFERENCES public.converter_disclaimer_versions(id),
  syringe_standard_confirmed text NOT NULL
    CHECK (syringe_standard_confirmed IN ('U-100', 'U-40')),
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, disclaimer_version_id)
);

ALTER TABLE public.converter_disclaimer_acks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS converter_disclaimer_acks_select_own ON public.converter_disclaimer_acks;
CREATE POLICY converter_disclaimer_acks_select_own
  ON public.converter_disclaimer_acks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS converter_disclaimer_acks_insert_own ON public.converter_disclaimer_acks;
CREATE POLICY converter_disclaimer_acks_insert_own
  ON public.converter_disclaimer_acks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- User converter sessions (G19). User-owned. Never agent-readable by design.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.converter_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  peptide_id uuid NOT NULL REFERENCES public.kb_peptides(id),
  vial_amount numeric NOT NULL CHECK (vial_amount > 0),
  vial_unit text NOT NULL CHECK (vial_unit IN ('mg', 'mcg', 'IU')),
  diluent_ml numeric NOT NULL CHECK (diluent_ml > 0),
  dose_amount numeric NOT NULL CHECK (dose_amount > 0),
  dose_unit text NOT NULL CHECK (dose_unit IN ('mg', 'mcg', 'IU')),
  syringe_standard text NOT NULL CHECK (syringe_standard IN ('U-100', 'U-40')),
  barrel_size integer NOT NULL CHECK (barrel_size IN (100, 50, 30)),
  computed_concentration numeric NOT NULL,
  computed_volume_ml numeric NOT NULL,
  computed_units numeric NOT NULL,
  warnings text[] NOT NULL DEFAULT '{}',
  label text NOT NULL DEFAULT '',
  disclaimer_version_id uuid NOT NULL REFERENCES public.converter_disclaimer_versions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS converter_sessions_user_idx
  ON public.converter_sessions (user_id, created_at DESC);

ALTER TABLE public.converter_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS converter_sessions_select_own ON public.converter_sessions;
CREATE POLICY converter_sessions_select_own
  ON public.converter_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS converter_sessions_insert_own ON public.converter_sessions;
CREATE POLICY converter_sessions_insert_own
  ON public.converter_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS converter_sessions_delete_own ON public.converter_sessions;
CREATE POLICY converter_sessions_delete_own
  ON public.converter_sessions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.converter_sessions IS
  'Prompt 226 Module A: user-entered conversion history. Not a knowledge source. Never feed Thanos/Hannah/RAG.';

-- Module B practitioner_protocols deferred until G17 Lex/Security sign-off.
