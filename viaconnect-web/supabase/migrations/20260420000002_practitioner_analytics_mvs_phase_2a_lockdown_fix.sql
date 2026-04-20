-- =============================================================================
-- Prompt #99 Phase 2 (Path A) audit remediation.
-- =============================================================================
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum
--
-- The initial Phase 2 migration (20260420000001) REVOKEd FROM PUBLIC, but
-- Supabase's default privileges also grant all on new public-schema
-- objects to the anon and authenticated roles directly. That left the
-- three practitioner analytics materialized views reachable through the
-- PostgREST API, bypassing the v_practitioner_* row-filtered wrappers.
-- The materialized_view_in_api security advisor flagged all three.
--
-- Remediation: revoke the default anon + authenticated grants
-- explicitly. Wrapper views remain authenticated-accessible; all live
-- client reads MUST go through v_practitioner_*.
-- =============================================================================

REVOKE ALL ON public.practitioner_engagement_summary_mv FROM anon;
REVOKE ALL ON public.practitioner_engagement_summary_mv FROM authenticated;

REVOKE ALL ON public.practitioner_protocol_effectiveness_mv FROM anon;
REVOKE ALL ON public.practitioner_protocol_effectiveness_mv FROM authenticated;

REVOKE ALL ON public.practitioner_practice_health_mv FROM anon;
REVOKE ALL ON public.practitioner_practice_health_mv FROM authenticated;

-- Re-affirm service_role SELECT so the refresh function + server-side
-- code paths keep working.
GRANT SELECT ON public.practitioner_engagement_summary_mv TO service_role;
GRANT SELECT ON public.practitioner_protocol_effectiveness_mv TO service_role;
GRANT SELECT ON public.practitioner_practice_health_mv TO service_role;

-- Re-affirm wrapper view grants (idempotent).
GRANT SELECT ON public.v_practitioner_engagement_summary TO authenticated;
GRANT SELECT ON public.v_practitioner_protocol_effectiveness TO authenticated;
GRANT SELECT ON public.v_practitioner_practice_health TO authenticated;
