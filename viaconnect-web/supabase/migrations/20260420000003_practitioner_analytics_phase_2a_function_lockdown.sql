-- =============================================================================
-- Prompt #99 Phase 2 (Path A) — Jeffery audit remediation, pass 2.
-- =============================================================================
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum
--
-- Jeffery flagged that refresh_practitioner_analytics_phase_2a() retained
-- default EXECUTE grants to anon + authenticated. The function is
-- SECURITY DEFINER and runs three CONCURRENTLY refreshes — leaving it
-- callable by any authenticated / anonymous user is a DoS vector.
--
-- Remediation: revoke EXECUTE from PUBLIC + anon + authenticated, then
-- re-grant only to service_role.
--
-- Also annotate the protocol + practice_health MVs with an explicit
-- EXCLUDES clause in their COMMENT so each MV declares its reward-program
-- exclusion individually (not just via the file-header comment).
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.refresh_practitioner_analytics_phase_2a() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_practitioner_analytics_phase_2a() FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_practitioner_analytics_phase_2a() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_practitioner_analytics_phase_2a() TO service_role;

COMMENT ON MATERIALIZED VIEW public.practitioner_protocol_effectiveness_mv IS
  'One row per (practitioner, protocol_name). EXCLUDES reward-program tables per #17b Addendum. Counts and avg confidence only; outcome deltas activate when interaction_events lands.';

COMMENT ON MATERIALIZED VIEW public.practitioner_practice_health_mv IS
  'Landing-page KPI rollup per practitioner. EXCLUDES reward-program tables per #17b Addendum. Combines active-client count, Bio Optimization score distribution, and engagement average.';
