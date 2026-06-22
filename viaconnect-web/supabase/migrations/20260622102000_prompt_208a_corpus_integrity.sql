-- Prompt 208a Module G: corpus integrity + scientific self-correction. Append-only.
-- Study metadata + conflict log are authenticated-read (about published knowledge);
-- retraction_log + atom_archive are service-role-only (internal ops).

CREATE TABLE IF NOT EXISTS public.atom_study_metadata (
  atom_id uuid PRIMARY KEY,
  design text,
  sample_size integer,
  population text,
  effect_direction text,
  effect_magnitude text,
  ci_summary text,
  grade_assessment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.atom_study_metadata ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS atom_study_metadata_select ON public.atom_study_metadata;
CREATE POLICY atom_study_metadata_select ON public.atom_study_metadata
  FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.atom_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atom_id_a uuid NOT NULL,
  atom_id_b uuid NOT NULL,
  conflict_type text,
  resolution_state text NOT NULL DEFAULT 'open' CHECK (resolution_state IN ('open','resolved','contested')),
  surfaced boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS atom_conflicts_a_idx ON public.atom_conflicts (atom_id_a);
ALTER TABLE public.atom_conflicts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS atom_conflicts_select ON public.atom_conflicts;
CREATE POLICY atom_conflicts_select ON public.atom_conflicts
  FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.retraction_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atom_id uuid NOT NULL,
  source_ref text,
  retracted_at timestamptz,
  detected_at timestamptz NOT NULL DEFAULT now(),
  action_taken text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retraction_log_atom_idx ON public.retraction_log (atom_id);
ALTER TABLE public.retraction_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.atom_archive (
  atom_id uuid PRIMARY KEY,
  archived_content_ref text,
  archived_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.atom_archive ENABLE ROW LEVEL SECURITY;
