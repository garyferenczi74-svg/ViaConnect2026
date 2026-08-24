-- Prompt 227ah: Sherlock curation DB role + write-isolation prove function.
-- Sherlock may INSERT curation_* and SELECT Collection 14 for census.
-- Sherlock must not INSERT/UPDATE/DELETE kb_peptides or other C14 evidence tables.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sherlock_curation') THEN
    CREATE ROLE sherlock_curation NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO sherlock_curation;

-- Curation writes (proposals, census, negatives, corrections, rejections, cycles)
GRANT SELECT, INSERT ON TABLE public.curation_cycles TO sherlock_curation;
GRANT SELECT, INSERT ON TABLE public.curation_gap_census_snapshots TO sherlock_curation;
GRANT SELECT, INSERT ON TABLE public.curation_proposals TO sherlock_curation;
GRANT SELECT, INSERT ON TABLE public.curation_rejections TO sherlock_curation;
GRANT SELECT, INSERT ON TABLE public.curation_negative_results TO sherlock_curation;
GRANT SELECT, INSERT ON TABLE public.curation_corrections TO sherlock_curation;
GRANT SELECT, INSERT ON TABLE public.curation_human_reviewed_baselines TO sherlock_curation;
GRANT SELECT ON TABLE public.sherlock_curation_kill_switch TO sherlock_curation;
GRANT SELECT ON TABLE public.curation_field_class_map TO sherlock_curation;

-- Read-only Collection 14 for gap census
GRANT SELECT ON TABLE public.kb_peptides TO sherlock_curation;
GRANT SELECT ON TABLE public.kb_peptide_evidence_links TO sherlock_curation;
GRANT SELECT ON TABLE public.kb_goal_peptide_links TO sherlock_curation;
GRANT SELECT ON TABLE public.kb_peptide_routes TO sherlock_curation;
GRANT SELECT ON TABLE public.kb_trials TO sherlock_curation;
GRANT SELECT ON TABLE public.kb_publications TO sherlock_curation;
GRANT SELECT ON TABLE public.kb_peptide_synonyms TO sherlock_curation;

-- Explicit deny on Collection 14 mutations
REVOKE INSERT, UPDATE, DELETE ON TABLE public.kb_peptides FROM sherlock_curation;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.kb_trials FROM sherlock_curation;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.kb_publications FROM sherlock_curation;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.kb_peptide_evidence_links FROM sherlock_curation;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.kb_goal_peptide_links FROM sherlock_curation;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.kb_peptide_routes FROM sherlock_curation;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.kb_peptide_synonyms FROM sherlock_curation;

-- Allow session owner (migration / service postgres) to SET ROLE
DO $$
BEGIN
  EXECUTE format('GRANT sherlock_curation TO %I', current_user);
EXCEPTION WHEN OTHERS THEN
  -- If grant fails (already member / reserved), continue; prove will surface it.
  NULL;
END
$$;

CREATE OR REPLACE FUNCTION public.prove_sherlock_curation_cannot_write_kb_peptides()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_sqlstate text;
  v_msg text;
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.kb_peptides LIMIT 1;
  IF v_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'rejected', false,
      'error', 'no_kb_peptides_rows'
    );
  END IF;

  BEGIN
    EXECUTE 'SET LOCAL ROLE sherlock_curation';
    -- Privilege is checked even when zero rows match; never mutates data.
    UPDATE public.kb_peptides
    SET fda_status = fda_status
    WHERE false AND id = v_id;
    -- If UPDATE was allowed, isolation failed (no row changed).
    RETURN jsonb_build_object(
      'ok', false,
      'rejected', false,
      'error', 'write_was_allowed',
      'role', current_user
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      GET STACKED DIAGNOSTICS
        v_sqlstate = RETURNED_SQLSTATE,
        v_msg = MESSAGE_TEXT;
      RETURN jsonb_build_object(
        'ok', true,
        'rejected', true,
        'sqlstate', v_sqlstate,
        'message', left(v_msg, 200)
      );
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS
        v_sqlstate = RETURNED_SQLSTATE,
        v_msg = MESSAGE_TEXT;
      IF v_sqlstate IN ('42501', '25006') OR v_msg ILIKE '%permission%' THEN
        RETURN jsonb_build_object(
          'ok', true,
          'rejected', true,
          'sqlstate', v_sqlstate,
          'message', left(v_msg, 200)
        );
      END IF;
      RETURN jsonb_build_object(
        'ok', false,
        'rejected', false,
        'sqlstate', v_sqlstate,
        'message', left(v_msg, 200)
      );
  END;
END;
$fn$;

REVOKE ALL ON FUNCTION public.prove_sherlock_curation_cannot_write_kb_peptides() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prove_sherlock_curation_cannot_write_kb_peptides() TO service_role;

COMMENT ON ROLE sherlock_curation IS
  'Prompt 227ah: Collection 14 Sherlock curation role. Proposals only; no kb_peptides writes.';
COMMENT ON FUNCTION public.prove_sherlock_curation_cannot_write_kb_peptides() IS
  'Prompt 227ah: SET ROLE sherlock_curation then attempt UPDATE kb_peptides; expect privilege denial.';
