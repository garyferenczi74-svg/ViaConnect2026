-- =============================================================================
-- Prompt #99 Phase 2 (Path A): practitioner analytics materialized views for
-- the surfaces whose upstream tables are live as of 2026-04-20.
-- =============================================================================
-- EXCLUDES: all helix_* tables per #17b Addendum
--
-- Live dependencies:
--   * practitioners
--   * patient_practitioner_relationships (consent flags enforced)
--   * engagement_score_snapshots (aggregate score column only; no rewards data)
--   * user_protocols
--   * profiles (bio_optimization_score)
--
-- Deferred surfaces (cohorts, revenue) still return dependency_pending
-- from the client loader until those tables populate.
-- =============================================================================

-- 1) Engagement summary materialized view
--
-- Aggregates the latest engagement_score per consenting active client
-- under each practitioner. The reward-specific column on
-- engagement_score_snapshots is intentionally NOT selected.
CREATE MATERIALIZED VIEW IF NOT EXISTS public.practitioner_engagement_summary_mv AS
WITH consenting_active AS (
  SELECT ppr.practitioner_id, ppr.patient_user_id
  FROM public.patient_practitioner_relationships ppr
  WHERE ppr.status = 'active'
    AND ppr.ended_at IS NULL
    AND ppr.consent_share_engagement_score = true
),
latest_score AS (
  SELECT DISTINCT ON (ca.practitioner_id, ca.patient_user_id)
    ca.practitioner_id,
    ca.patient_user_id,
    ess.score,
    ess.period_end_date
  FROM consenting_active ca
  LEFT JOIN public.engagement_score_snapshots ess
    ON ess.user_id = ca.patient_user_id
  ORDER BY ca.practitioner_id, ca.patient_user_id, ess.period_end_date DESC NULLS LAST
)
SELECT
  p.id AS practitioner_id,
  COUNT(DISTINCT ls.patient_user_id) AS consenting_client_count,
  COUNT(DISTINCT ls.patient_user_id) FILTER (WHERE ls.score IS NOT NULL) AS clients_with_score,
  COALESCE(ROUND(AVG(ls.score))::INT, 0) AS avg_engagement_score,
  COALESCE(
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ls.score)::INT,
    0
  ) AS p50_engagement_score,
  COALESCE(
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY ls.score)::INT,
    0
  ) AS p90_engagement_score,
  COUNT(*) FILTER (WHERE ls.score < 30) AS clients_low_engagement,
  COUNT(*) FILTER (WHERE ls.score >= 30 AND ls.score <= 60) AS clients_medium_engagement,
  COUNT(*) FILTER (WHERE ls.score >= 61 AND ls.score <= 80) AS clients_high_engagement,
  COUNT(*) FILTER (WHERE ls.score > 80) AS clients_very_high_engagement,
  NOW() AS refreshed_at
FROM public.practitioners p
LEFT JOIN latest_score ls ON ls.practitioner_id = p.id
GROUP BY p.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_practitioner_engagement_summary_mv_pk
  ON public.practitioner_engagement_summary_mv(practitioner_id);

COMMENT ON MATERIALIZED VIEW public.practitioner_engagement_summary_mv IS
  'Aggregate engagement signals per practitioner. Respects patient consent flag and never surfaces reward-program activity columns from engagement_score_snapshots.';

-- 2) Protocol effectiveness materialized view
--
-- Top protocols by assignment volume per practitioner. Partial until
-- interaction_events + assessment_outcome_deltas are live — this phase
-- reports counts and confidence only.
CREATE MATERIALIZED VIEW IF NOT EXISTS public.practitioner_protocol_effectiveness_mv AS
WITH consenting_active AS (
  SELECT ppr.practitioner_id, ppr.patient_user_id
  FROM public.patient_practitioner_relationships ppr
  WHERE ppr.status = 'active'
    AND ppr.ended_at IS NULL
    AND ppr.consent_share_protocol = true
)
SELECT
  p.id AS practitioner_id,
  up.protocol_name,
  COUNT(DISTINCT up.user_id) FILTER (WHERE up.is_active = true) AS active_client_count,
  COUNT(DISTINCT up.user_id) AS total_client_count,
  COALESCE(AVG(up.confidence_score)::NUMERIC(4,2), 0) AS avg_confidence_score,
  MAX(up.updated_at) AS most_recent_assignment,
  NOW() AS refreshed_at
FROM public.practitioners p
INNER JOIN consenting_active ca ON ca.practitioner_id = p.id
INNER JOIN public.user_protocols up ON up.user_id = ca.patient_user_id
GROUP BY p.id, up.protocol_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_practitioner_protocol_effectiveness_mv_pk
  ON public.practitioner_protocol_effectiveness_mv(practitioner_id, protocol_name);

COMMENT ON MATERIALIZED VIEW public.practitioner_protocol_effectiveness_mv IS
  'One row per (practitioner, protocol_name). Counts and avg confidence only; outcome deltas activate when interaction_events lands.';

-- 3) Practice health materialized view
--
-- Landing-page KPIs. Combines active-client count, Bio Optimization
-- score averages from profiles, and engagement averages from the
-- engagement summary view.
CREATE MATERIALIZED VIEW IF NOT EXISTS public.practitioner_practice_health_mv AS
WITH active_relationships AS (
  SELECT
    ppr.practitioner_id,
    ppr.patient_user_id,
    ppr.started_at,
    ppr.consent_share_labs
  FROM public.patient_practitioner_relationships ppr
  WHERE ppr.status = 'active' AND ppr.ended_at IS NULL
),
bio_opt_per_client AS (
  SELECT
    ar.practitioner_id,
    ar.patient_user_id,
    pr.bio_optimization_score
  FROM active_relationships ar
  LEFT JOIN public.profiles pr ON pr.id = ar.patient_user_id
)
SELECT
  p.id AS practitioner_id,
  COUNT(DISTINCT ar.patient_user_id) AS total_active_clients,
  COUNT(DISTINCT ar.patient_user_id) FILTER (
    WHERE ar.started_at >= NOW() - INTERVAL '30 days'
  ) AS new_clients_30d,
  COUNT(DISTINCT ar.patient_user_id) FILTER (
    WHERE ar.started_at >= NOW() - INTERVAL '90 days'
  ) AS new_clients_90d,
  COALESCE(ROUND(AVG(boc.bio_optimization_score))::INT, 0) AS avg_bio_optimization_score,
  COUNT(*) FILTER (WHERE boc.bio_optimization_score >= 80) AS clients_bio_opt_high,
  COUNT(*) FILTER (WHERE boc.bio_optimization_score >= 60 AND boc.bio_optimization_score < 80) AS clients_bio_opt_mid,
  COUNT(*) FILTER (WHERE boc.bio_optimization_score < 60 AND boc.bio_optimization_score IS NOT NULL) AS clients_bio_opt_low,
  COALESCE(es.avg_engagement_score, 0) AS avg_engagement_score,
  NOW() AS refreshed_at
FROM public.practitioners p
LEFT JOIN active_relationships ar ON ar.practitioner_id = p.id
LEFT JOIN bio_opt_per_client boc ON boc.practitioner_id = p.id AND boc.patient_user_id = ar.patient_user_id
LEFT JOIN public.practitioner_engagement_summary_mv es ON es.practitioner_id = p.id
GROUP BY p.id, es.avg_engagement_score;

CREATE UNIQUE INDEX IF NOT EXISTS idx_practitioner_practice_health_mv_pk
  ON public.practitioner_practice_health_mv(practitioner_id);

COMMENT ON MATERIALIZED VIEW public.practitioner_practice_health_mv IS
  'Landing-page KPI rollup per practitioner. Combines active-client count, Bio Optimization score distribution, and engagement average.';

-- 4) Refresh function
--
-- Not auto-scheduled in this migration; the existing 6 AM cron job
-- activates under Prompt #17a once live. Intended to be called by that
-- job or invoked manually for ad-hoc refresh during rollout.
CREATE OR REPLACE FUNCTION public.refresh_practitioner_analytics_phase_2a()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.practitioner_engagement_summary_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.practitioner_protocol_effectiveness_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.practitioner_practice_health_mv;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_practitioner_analytics_phase_2a() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_practitioner_analytics_phase_2a() TO service_role;

-- 5) Access control
--
-- Lock the MVs to service_role only. Consumer-facing reads go through
-- RLS-filtered wrapper views that also deny consumer + naturopath roles.
REVOKE ALL ON public.practitioner_engagement_summary_mv FROM PUBLIC;
REVOKE ALL ON public.practitioner_protocol_effectiveness_mv FROM PUBLIC;
REVOKE ALL ON public.practitioner_practice_health_mv FROM PUBLIC;
GRANT SELECT ON public.practitioner_engagement_summary_mv TO service_role;
GRANT SELECT ON public.practitioner_protocol_effectiveness_mv TO service_role;
GRANT SELECT ON public.practitioner_practice_health_mv TO service_role;

-- 6) RLS-equivalent wrapper views
--
-- Each view filters rows to the caller's own practitioner record OR
-- surfaces everything to admins. Consumer + naturopath roles resolve
-- to zero rows because they match neither branch.
CREATE OR REPLACE VIEW public.v_practitioner_engagement_summary
WITH (security_invoker = true) AS
SELECT *
FROM public.practitioner_engagement_summary_mv m
WHERE m.practitioner_id IN (
  SELECT pr.id FROM public.practitioners pr WHERE pr.user_id = auth.uid()
)
OR EXISTS (
  SELECT 1 FROM public.profiles pf WHERE pf.id = auth.uid() AND pf.role = 'admin'
);

CREATE OR REPLACE VIEW public.v_practitioner_protocol_effectiveness
WITH (security_invoker = true) AS
SELECT *
FROM public.practitioner_protocol_effectiveness_mv m
WHERE m.practitioner_id IN (
  SELECT pr.id FROM public.practitioners pr WHERE pr.user_id = auth.uid()
)
OR EXISTS (
  SELECT 1 FROM public.profiles pf WHERE pf.id = auth.uid() AND pf.role = 'admin'
);

CREATE OR REPLACE VIEW public.v_practitioner_practice_health
WITH (security_invoker = true) AS
SELECT *
FROM public.practitioner_practice_health_mv m
WHERE m.practitioner_id IN (
  SELECT pr.id FROM public.practitioners pr WHERE pr.user_id = auth.uid()
)
OR EXISTS (
  SELECT 1 FROM public.profiles pf WHERE pf.id = auth.uid() AND pf.role = 'admin'
);

GRANT SELECT ON public.v_practitioner_engagement_summary TO authenticated;
GRANT SELECT ON public.v_practitioner_protocol_effectiveness TO authenticated;
GRANT SELECT ON public.v_practitioner_practice_health TO authenticated;

COMMENT ON VIEW public.v_practitioner_engagement_summary IS
  'Row-filtered wrapper over practitioner_engagement_summary_mv. Practitioner sees own row; admin sees all; consumer + naturopath see zero rows.';
COMMENT ON VIEW public.v_practitioner_protocol_effectiveness IS
  'Row-filtered wrapper over practitioner_protocol_effectiveness_mv. Practitioner sees own rows; admin sees all; consumer + naturopath see zero rows.';
COMMENT ON VIEW public.v_practitioner_practice_health IS
  'Row-filtered wrapper over practitioner_practice_health_mv. Practitioner sees own row; admin sees all; consumer + naturopath see zero rows.';

-- 7) Initial populate
REFRESH MATERIALIZED VIEW public.practitioner_engagement_summary_mv;
REFRESH MATERIALIZED VIEW public.practitioner_protocol_effectiveness_mv;
REFRESH MATERIALIZED VIEW public.practitioner_practice_health_mv;
