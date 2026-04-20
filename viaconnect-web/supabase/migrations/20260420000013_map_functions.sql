-- =============================================================================
-- Prompt #100 MAP Enforcement — detection, scoring, grace-period functions.
-- =============================================================================
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum
-- Every query is scoped `WHERE p.pricing_tier IN ('L1','L2')` per §3.1.
-- =============================================================================

-- 1) Severity classifier helper --------------------------------------------
CREATE OR REPLACE FUNCTION public.classify_map_severity(
  observed_cents         INTEGER,
  map_cents              INTEGER,
  ingredient_floor_cents INTEGER
) RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  discount_pct NUMERIC(5,2);
BEGIN
  IF observed_cents IS NULL OR map_cents IS NULL OR map_cents <= 0 THEN
    RETURN NULL;
  END IF;
  IF observed_cents < ingredient_floor_cents THEN RETURN 'black'; END IF;
  IF observed_cents >= map_cents THEN RETURN NULL; END IF;
  discount_pct := ((map_cents - observed_cents)::NUMERIC / map_cents) * 100;
  IF discount_pct > 15 THEN RETURN 'red';
  ELSIF discount_pct > 5 THEN RETURN 'orange';
  ELSE RETURN 'yellow';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.classify_map_severity IS
  'Pure severity classifier. Yellow/Orange/Red/Black per Prompt #100 §4.3.';

-- 2) Grace-period hours per severity --------------------------------------
CREATE OR REPLACE FUNCTION public.map_grace_hours(severity TEXT)
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE severity
    WHEN 'yellow' THEN 168
    WHEN 'orange' THEN 72
    WHEN 'red'    THEN 48
    WHEN 'black'  THEN 24
    ELSE 72
  END;
$$;

-- 3) Detect violations -----------------------------------------------------
-- Reads recent observations (last 30 minutes), compares to the active
-- MAP policy for that (product_id, tier) pair, and inserts violation
-- rows when the observation trips a severity threshold. Respects
-- exemption windows. Anonymous observations (practitioner_id IS NULL)
-- land with status='investigating' — fair-enforcement guardrail §3.4.
CREATE OR REPLACE FUNCTION public.detect_map_violations()
RETURNS TABLE(detected INTEGER) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_count INTEGER := 0;
BEGIN
  WITH candidate_observations AS (
    SELECT
      o.observation_id,
      o.product_id,
      o.practitioner_id,
      o.observed_price_cents,
      o.observed_at,
      p.pricing_tier
    FROM public.map_price_observations o
    JOIN public.products p ON p.id = o.product_id
    WHERE o.observed_at >= NOW() - INTERVAL '30 minutes'
      AND p.pricing_tier IN ('L1','L2')  -- §3.1 scope guardrail
      AND NOT EXISTS (
        SELECT 1 FROM public.map_violations v WHERE v.observation_id = o.observation_id
      )
  ),
  active_policies AS (
    SELECT
      mp.policy_id,
      mp.product_id,
      mp.tier,
      mp.map_price_cents,
      mp.ingredient_cost_floor_cents,
      mp.map_exemption_window_start,
      mp.map_exemption_window_end
    FROM public.map_policies mp
    WHERE mp.map_enforcement_start_date <= CURRENT_DATE
  ),
  scored AS (
    SELECT
      co.observation_id,
      co.product_id,
      co.practitioner_id,
      co.observed_price_cents,
      co.observed_at,
      ap.policy_id,
      ap.map_price_cents,
      public.classify_map_severity(
        co.observed_price_cents,
        ap.map_price_cents,
        ap.ingredient_cost_floor_cents
      ) AS severity,
      CASE
        WHEN ap.map_exemption_window_start IS NOT NULL
         AND co.observed_at::DATE BETWEEN ap.map_exemption_window_start AND ap.map_exemption_window_end
        THEN TRUE ELSE FALSE
      END AS within_exemption
    FROM candidate_observations co
    JOIN active_policies ap
      ON ap.product_id = co.product_id
     AND ap.tier = co.pricing_tier
  ),
  inserted AS (
    INSERT INTO public.map_violations (
      observation_id, product_id, practitioner_id, policy_id,
      severity, observed_price_cents, map_price_cents,
      discount_pct_below_map, status, grace_period_ends_at,
      remediation_deadline_at
    )
    SELECT
      s.observation_id, s.product_id, s.practitioner_id, s.policy_id,
      s.severity, s.observed_price_cents, s.map_price_cents,
      ROUND(((s.map_price_cents - s.observed_price_cents)::NUMERIC / s.map_price_cents) * 100, 2),
      CASE WHEN s.practitioner_id IS NULL THEN 'investigating' ELSE 'active' END,
      NOW() + (public.map_grace_hours(s.severity) || ' hours')::INTERVAL,
      NOW() + (public.map_grace_hours(s.severity) || ' hours')::INTERVAL
    FROM scored s
    WHERE s.severity IS NOT NULL
      AND NOT s.within_exemption
    RETURNING violation_id
  )
  SELECT COUNT(*) INTO new_count FROM inserted;
  RETURN QUERY SELECT new_count;
END;
$$;

REVOKE ALL ON FUNCTION public.detect_map_violations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_map_violations() TO service_role;

-- 4) Compliance score calculator -------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_map_compliance_scores()
RETURNS TABLE(rows_written INTEGER) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  written INTEGER := 0;
BEGIN
  WITH practitioner_stats AS (
    SELECT
      p.id AS practitioner_id,
      COALESCE(SUM(CASE WHEN v.severity='yellow' AND v.created_at >= NOW() - INTERVAL '90 days' THEN 1 ELSE 0 END),0) AS yellow_90d,
      COALESCE(SUM(CASE WHEN v.severity='orange' AND v.created_at >= NOW() - INTERVAL '90 days' THEN 1 ELSE 0 END),0) AS orange_90d,
      COALESCE(SUM(CASE WHEN v.severity='red'    AND v.created_at >= NOW() - INTERVAL '90 days' THEN 1 ELSE 0 END),0) AS red_90d,
      COALESCE(SUM(CASE WHEN v.severity='black'  AND v.created_at >= NOW() - INTERVAL '90 days' THEN 1 ELSE 0 END),0) AS black_90d,
      COALESCE(EXTRACT(DAY FROM NOW() - MAX(v.created_at))::INTEGER, 9999) AS days_since_last,
      COALESCE(SUM(CASE WHEN v.status='remediated' AND v.remediated_at >= NOW() - INTERVAL '90 days' THEN 1 ELSE 0 END),0) AS remediations_90d
    FROM public.practitioners p
    LEFT JOIN public.map_violations v ON v.practitioner_id = p.id
    GROUP BY p.id
  ),
  scored AS (
    SELECT
      ps.practitioner_id,
      GREATEST(0, LEAST(100,
        100
        - (ps.yellow_90d * 1)
        - (ps.orange_90d * 3)
        - (ps.red_90d * 8)
        - (ps.black_90d * 20)
        + LEAST((ps.days_since_last * 0.1)::INTEGER, 10)
        + LEAST(ps.remediations_90d * 2, 10)
      ))::INTEGER AS score,
      ps.yellow_90d, ps.orange_90d, ps.red_90d, ps.black_90d,
      ps.days_since_last, ps.remediations_90d
    FROM practitioner_stats ps
  ),
  tiered AS (
    SELECT
      s.*,
      CASE
        WHEN s.score < 50 THEN 'Probation'
        WHEN s.score < 70 THEN 'Bronze'
        WHEN s.score < 85 THEN 'Silver'
        WHEN s.score < 95 OR s.red_90d > 0 OR s.black_90d > 0 THEN 'Gold'
        ELSE 'Platinum'
      END AS map_compliance_tier
    FROM scored s
  ),
  upsert AS (
    INSERT INTO public.map_compliance_scores (
      practitioner_id, score, map_compliance_tier,
      yellow_violations_90d, orange_violations_90d,
      red_violations_90d, black_violations_90d,
      days_since_last_violation, self_reported_remediations,
      calculated_at, calculated_date
    )
    SELECT
      t.practitioner_id, t.score, t.map_compliance_tier,
      t.yellow_90d, t.orange_90d, t.red_90d, t.black_90d,
      t.days_since_last, t.remediations_90d,
      NOW(), CURRENT_DATE
    FROM tiered t
    ON CONFLICT (practitioner_id, calculated_date)
    DO UPDATE SET
      score = EXCLUDED.score,
      map_compliance_tier = EXCLUDED.map_compliance_tier,
      yellow_violations_90d = EXCLUDED.yellow_violations_90d,
      orange_violations_90d = EXCLUDED.orange_violations_90d,
      red_violations_90d = EXCLUDED.red_violations_90d,
      black_violations_90d = EXCLUDED.black_violations_90d,
      days_since_last_violation = EXCLUDED.days_since_last_violation,
      self_reported_remediations = EXCLUDED.self_reported_remediations,
      calculated_at = EXCLUDED.calculated_at
    RETURNING score_id
  )
  SELECT COUNT(*) INTO written FROM upsert;
  RETURN QUERY SELECT written;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_map_compliance_scores() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_map_compliance_scores() TO service_role;

-- 5) Grace-period expiration -----------------------------------------------
-- Transitions violations whose grace period has passed to 'escalated'.
-- The map_escalate_violation edge function reads this state and emits
-- the commission-clawback event via emitDataEvent.
CREATE OR REPLACE FUNCTION public.process_expired_map_grace_periods()
RETURNS TABLE(escalated INTEGER) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  WITH promoted AS (
    UPDATE public.map_violations
      SET status = 'escalated',
          escalated_at = NOW()
      WHERE status IN ('active','notified')
        AND grace_period_ends_at < NOW()
        AND practitioner_id IS NOT NULL
      RETURNING violation_id
  )
  SELECT COUNT(*) INTO updated_count FROM promoted;
  RETURN QUERY SELECT updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.process_expired_map_grace_periods() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_expired_map_grace_periods() TO service_role;
