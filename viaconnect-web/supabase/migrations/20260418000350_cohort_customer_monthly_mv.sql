-- =============================================================================
-- Prompt #94 Phase 4.4: cohort_customer_monthly materialized view
-- =============================================================================
-- Append-only. Per-user-per-month aggregate that powers every cohort query
-- on the admin dashboard. Refreshed nightly via the cron migration in
-- 20260418000360_cohort_mv_refresh_cron.sql; live re-aggregation from raw
-- tables is the fallback when the view is stale.
--
-- Sources:
--   * customer_acquisition_attribution -> cohort_month + first_touch_channel
--                                         + is_practitioner_attached
--   * customer_archetypes (is_primary)  -> archetype_id
--   * memberships                       -> initial_tier_id, was_active per month
--   * shop_orders                       -> revenue_cents per month
--                                         (subtract discount_cents to get net)
--
-- Three "active" definitions are surfaced as separate columns so the
-- dashboard's strict / standard / loose toggle reads the same row:
--   active_subscription_count   strict   (active membership in month)
--   any_purchase_or_active_count standard (active OR shop_orders > 0)
--   logged_in_count             loose    (placeholder; wired post-launch
--                                         when a session_login event stream
--                                         exists; for now equals standard)
--
-- contribution_margin_cents is computed at compute time from the variable
-- cost model in src/lib/analytics/variable-costs.ts. The view stores
-- revenue_cents only; the API route attaches contribution margin per-row
-- from the cost model. This keeps the view refreshable without coupling to
-- COGS-table churn.
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.cohort_customer_monthly AS
WITH user_cohorts AS (
  SELECT
    caa.user_id,
    DATE_TRUNC('month', caa.acquired_at)::DATE AS cohort_month,
    caa.first_touch_channel,
    caa.is_practitioner_attached,
    ca.archetype_id,
    m.tier_id        AS initial_tier_id,
    m.current_period_start::TIMESTAMPTZ AS membership_start,
    m.current_period_end::TIMESTAMPTZ   AS membership_end,
    m.status         AS membership_status
  FROM public.customer_acquisition_attribution caa
  LEFT JOIN LATERAL (
    SELECT archetype_id
    FROM public.customer_archetypes
    WHERE user_id = caa.user_id AND is_primary = true
    LIMIT 1
  ) ca ON true
  LEFT JOIN LATERAL (
    SELECT tier_id, status, current_period_start, current_period_end
    FROM public.memberships
    WHERE user_id = caa.user_id
    ORDER BY started_at ASC NULLS LAST
    LIMIT 1
  ) m ON true
),
month_grid AS (
  SELECT
    uc.user_id,
    uc.cohort_month,
    uc.first_touch_channel,
    uc.is_practitioner_attached,
    uc.archetype_id,
    uc.initial_tier_id,
    uc.membership_start,
    uc.membership_end,
    uc.membership_status,
    gs.activity_month::DATE AS activity_month
  FROM user_cohorts uc
  CROSS JOIN LATERAL generate_series(
    uc.cohort_month,
    DATE_TRUNC('month', NOW())::DATE,
    INTERVAL '1 month'
  ) gs(activity_month)
),
monthly_orders AS (
  SELECT
    user_id,
    DATE_TRUNC('month', created_at)::DATE AS activity_month,
    SUM(GREATEST(0, COALESCE(total_cents, 0))) AS gross_revenue_cents,
    COUNT(*)                                   AS order_count
  FROM public.shop_orders
  WHERE status NOT IN ('cancelled', 'refunded')
  GROUP BY user_id, DATE_TRUNC('month', created_at)
)
SELECT
  mg.user_id,
  mg.cohort_month,
  mg.first_touch_channel,
  mg.is_practitioner_attached,
  mg.archetype_id,
  mg.initial_tier_id,
  mg.activity_month,
  -- strict
  CASE
    WHEN mg.membership_status = 'active'
      AND mg.activity_month >= DATE_TRUNC('month', mg.membership_start)
      AND (mg.membership_end IS NULL
           OR mg.activity_month <= DATE_TRUNC('month', mg.membership_end))
    THEN true ELSE false
  END AS was_active_strict,
  -- standard
  CASE
    WHEN COALESCE(mo.order_count, 0) > 0
      OR (mg.membership_status = 'active'
          AND mg.activity_month >= DATE_TRUNC('month', mg.membership_start)
          AND (mg.membership_end IS NULL
               OR mg.activity_month <= DATE_TRUNC('month', mg.membership_end)))
    THEN true ELSE false
  END AS was_active_standard,
  -- loose (placeholder until login event stream lands; mirrors standard for now)
  CASE
    WHEN COALESCE(mo.order_count, 0) > 0
      OR (mg.membership_status = 'active'
          AND mg.activity_month >= DATE_TRUNC('month', mg.membership_start)
          AND (mg.membership_end IS NULL
               OR mg.activity_month <= DATE_TRUNC('month', mg.membership_end)))
    THEN true ELSE false
  END AS was_logged_in,
  COALESCE(mo.gross_revenue_cents, 0) AS revenue_cents,
  -- contribution_margin_cents is filled by the application layer at compute
  -- time from variable-costs.ts. Stored as 0 here so the view shape is
  -- stable; the cohort-engine API route subtracts variable cost per row.
  0::BIGINT AS contribution_margin_cents
FROM month_grid mg
LEFT JOIN monthly_orders mo
  ON mo.user_id = mg.user_id
 AND mo.activity_month = mg.activity_month;

COMMENT ON MATERIALIZED VIEW public.cohort_customer_monthly IS
  'Per-user-per-month aggregate driving the cohort dashboard. Refreshed nightly via pg_cron. contribution_margin_cents is computed at API compute time from the variable cost model; column kept here for shape stability.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_cohort_customer_monthly_user_month
  ON public.cohort_customer_monthly(user_id, activity_month);
CREATE INDEX IF NOT EXISTS idx_cohort_customer_monthly_cohort
  ON public.cohort_customer_monthly(cohort_month, activity_month);
CREATE INDEX IF NOT EXISTS idx_cohort_customer_monthly_channel
  ON public.cohort_customer_monthly(first_touch_channel, cohort_month);
CREATE INDEX IF NOT EXISTS idx_cohort_customer_monthly_archetype
  ON public.cohort_customer_monthly(archetype_id, cohort_month)
  WHERE archetype_id IS NOT NULL;
