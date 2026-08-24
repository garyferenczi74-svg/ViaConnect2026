-- Prompt 226d Wave A: route-specific evidence child table for Collection 14.
-- Append-only. Bioavailability requires a citation (never community figures).
-- routes_studied on kb_peptides remains a convenience array (synced from this table).

CREATE TABLE IF NOT EXISTS public.kb_peptide_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  peptide_id uuid NOT NULL REFERENCES public.kb_peptides(id) ON DELETE CASCADE,
  route text NOT NULL CHECK (route IN (
    'subcutaneous', 'intramuscular', 'intravenous', 'oral', 'sublingual',
    'intranasal', 'topical', 'transdermal', 'liposomal_oral', 'rectal', 'inhaled'
  )),
  target_site_class text NOT NULL CHECK (target_site_class IN (
    'local_gi', 'local_dermal', 'local_musculoskeletal', 'systemic', 'cns'
  )),
  rationale text NOT NULL DEFAULT '',
  bioavailability_value numeric,
  bioavailability_basis text CHECK (
    bioavailability_basis IS NULL
    OR bioavailability_basis IN (
      'systemic_auc', 'nose_to_brain', 'local_tissue', 'not_stated'
    )
  ),
  bioavailability_citation_id uuid,
  route_evidence_grade text NOT NULL DEFAULT 'E'
    CHECK (route_evidence_grade IN ('A', 'B', 'C', 'D', 'E')),
  human_data_for_route boolean NOT NULL DEFAULT false,
  formulation_notes text,
  is_preferred_by_evidence boolean NOT NULL DEFAULT false,
  preference_rationale text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kb_peptide_routes_peptide_route_uq UNIQUE (peptide_id, route, target_site_class),
  CONSTRAINT kb_peptide_routes_bioavailability_needs_citation CHECK (
    bioavailability_value IS NULL OR bioavailability_citation_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS kb_peptide_routes_peptide_idx
  ON public.kb_peptide_routes (peptide_id);

COMMENT ON TABLE public.kb_peptide_routes IS
  'Prompt 226d: route-specific pharmacology evidence. Not administration instruction. Bioavailability null unless cited.';

ALTER TABLE public.kb_peptide_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_peptide_routes_select_authenticated ON public.kb_peptide_routes;
CREATE POLICY kb_peptide_routes_select_authenticated
  ON public.kb_peptide_routes
  FOR SELECT TO authenticated
  USING (true);

-- Convenience sync: refresh routes_studied array from child rows (best-effort).
CREATE OR REPLACE FUNCTION public.sync_kb_peptides_routes_studied()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.kb_peptides p
  SET
    routes_studied = COALESCE((
      SELECT array_agg(DISTINCT r.route ORDER BY r.route)
      FROM public.kb_peptide_routes r
      WHERE r.peptide_id = COALESCE(NEW.peptide_id, OLD.peptide_id)
    ), '{}'::text[]),
    updated_at = now()
  WHERE p.id = COALESCE(NEW.peptide_id, OLD.peptide_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS kb_peptide_routes_sync_studied ON public.kb_peptide_routes;
CREATE TRIGGER kb_peptide_routes_sync_studied
  AFTER INSERT OR UPDATE OR DELETE ON public.kb_peptide_routes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_kb_peptides_routes_studied();
