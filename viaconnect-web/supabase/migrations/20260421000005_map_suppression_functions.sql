-- =============================================================================
-- Prompt #101 — violation suppression: waiver + VIP exemption lookups.
-- =============================================================================
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum
--
-- Extends detect_map_violations() from #100:
--   1. Check for an active waiver covering (practitioner, product, scope).
--      If found + observation at/above waiver price → no violation.
--   2. Check for an active VIP exemption matching a customer-specific URL
--      pattern. If found → no violation.
-- =============================================================================

-- 1) VIP exemption check (URL-pattern matched, not global)
CREATE OR REPLACE FUNCTION public.check_active_vip_exemption(
  p_practitioner_id UUID,
  p_product_id      UUID,
  p_observed_at     TIMESTAMPTZ,
  p_source_url      TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE has_exemption BOOLEAN;
BEGIN
  -- VIP exemptions ONLY suppress customer-authenticated pricing contexts.
  -- Public commerce surfaces (Amazon, Google Shopping, etc.) are NEVER
  -- suppressed, per §6.3 design rule. URL pattern /(customer|patient|
  -- member|vip)/[id] is the recognizable customer-specific prefix.
  IF p_source_url !~ '/(customer|patient|member|vip)/[a-zA-Z0-9_-]+' THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.map_vip_exemptions ve
    WHERE ve.practitioner_id = p_practitioner_id
      AND ve.product_id = p_product_id
      AND ve.status = 'active'
      AND p_observed_at BETWEEN ve.exemption_start_at AND ve.exemption_end_at
  ) INTO has_exemption;

  RETURN has_exemption;
END;
$$;

REVOKE ALL ON FUNCTION public.check_active_vip_exemption FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_active_vip_exemption FROM anon;
REVOKE ALL ON FUNCTION public.check_active_vip_exemption FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_active_vip_exemption TO service_role;

COMMENT ON FUNCTION public.check_active_vip_exemption IS
  'True only when observation URL matches /(customer|patient|member|vip)/ pattern AND an active VIP exemption for (practitioner, product) covers the observation window. Public commerce surfaces always return FALSE.';

-- 2) Active-waiver lookup helper
CREATE OR REPLACE FUNCTION public.check_active_waiver_for_observation(
  p_practitioner_id UUID,
  p_product_id      UUID,
  p_observed_at     TIMESTAMPTZ,
  p_source_url      TEXT
) RETURNS TABLE(
  waiver_id UUID,
  waived_price_cents INTEGER
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT w.waiver_id, ws.waived_price_cents
  FROM public.map_waivers w
  JOIN public.map_waiver_skus ws ON ws.waiver_id = w.waiver_id
  WHERE w.practitioner_id = p_practitioner_id
    AND ws.product_id = p_product_id
    AND w.status = 'active'
    AND p_observed_at BETWEEN w.waiver_start_at AND w.waiver_end_at
    AND (
      w.scope_urls = '[]'::JSONB
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(w.scope_urls) s(url)
        WHERE p_source_url = s.url
           OR p_source_url LIKE (s.url || '%')
      )
    )
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.check_active_waiver_for_observation FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_active_waiver_for_observation FROM anon;
REVOKE ALL ON FUNCTION public.check_active_waiver_for_observation FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_active_waiver_for_observation TO service_role;

-- 3) Rewritten detect_map_violations with suppression + Phase 2 gate
CREATE OR REPLACE FUNCTION public.detect_map_violations()
RETURNS TABLE(detected INTEGER) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_count INTEGER := 0;
BEGIN
  WITH candidate_observations AS (
    SELECT o.observation_id, o.product_id, o.practitioner_id,
           o.observed_price_cents, o.observed_at, o.source, o.source_url,
           o.phase, o.observer_confidence, o.practitioner_confidence,
           o.is_flash_sale, o.flash_sale_ends_at,
           p.pricing_tier
    FROM public.map_price_observations o
    JOIN public.products p ON p.id = o.product_id
    WHERE o.observed_at >= NOW() - INTERVAL '30 minutes'
      AND p.pricing_tier IN ('L1','L2')
      AND NOT EXISTS (SELECT 1 FROM public.map_violations v WHERE v.observation_id = o.observation_id)
      -- Flash-sale fairness: suppress observations during an active flash-sale window.
      AND NOT (o.is_flash_sale = TRUE AND o.flash_sale_ends_at > o.observed_at)
      -- Phase 2 confidence gate: practitioner attribution confidence must be high.
      AND (o.phase = 1 OR COALESCE(o.practitioner_confidence, 0) >= 90)
  ),
  active_policies AS (
    SELECT mp.policy_id, mp.product_id, mp.tier, mp.map_price_cents,
           mp.ingredient_cost_floor_cents,
           mp.map_exemption_window_start, mp.map_exemption_window_end
    FROM public.map_policies mp
    WHERE mp.map_enforcement_start_date <= CURRENT_DATE
  ),
  with_policy AS (
    SELECT co.*, ap.policy_id, ap.map_price_cents, ap.ingredient_cost_floor_cents,
           ap.map_exemption_window_start, ap.map_exemption_window_end
    FROM candidate_observations co
    JOIN active_policies ap ON ap.product_id = co.product_id AND ap.tier = co.pricing_tier
  ),
  with_waiver AS (
    SELECT wp.*,
           wv.waived_price_cents AS waiver_waived_price
    FROM with_policy wp
    LEFT JOIN LATERAL public.check_active_waiver_for_observation(
      wp.practitioner_id, wp.product_id, wp.observed_at, wp.source_url
    ) wv ON TRUE
  ),
  with_vip AS (
    SELECT ww.*,
           public.check_active_vip_exemption(
             ww.practitioner_id, ww.product_id, ww.observed_at, ww.source_url
           ) AS has_vip
    FROM with_waiver ww
    WHERE ww.practitioner_id IS NOT NULL
    UNION ALL
    SELECT ww.*, FALSE AS has_vip
    FROM with_waiver ww
    WHERE ww.practitioner_id IS NULL
  ),
  scored AS (
    SELECT
      wv.*,
      CASE
        -- Absolute margin floor: always a black violation, even under waiver/VIP
        WHEN wv.observed_price_cents < (wv.ingredient_cost_floor_cents * 1.72)::INTEGER
          THEN 'black'
        -- VIP suppression for customer-specific URLs
        WHEN wv.has_vip THEN NULL
        -- Waiver suppression: observed at or above waived price
        WHEN wv.waiver_waived_price IS NOT NULL
             AND wv.observed_price_cents >= wv.waiver_waived_price
          THEN NULL
        -- Exemption window
        WHEN wv.map_exemption_window_start IS NOT NULL
             AND wv.observed_at::DATE BETWEEN wv.map_exemption_window_start AND wv.map_exemption_window_end
          THEN NULL
        -- Normal severity classification
        ELSE public.classify_map_severity(
          wv.observed_price_cents, wv.map_price_cents, wv.ingredient_cost_floor_cents
        )
      END AS severity
    FROM with_vip wv
  ),
  inserted AS (
    INSERT INTO public.map_violations (
      observation_id, product_id, practitioner_id, policy_id, severity,
      observed_price_cents, map_price_cents, discount_pct_below_map,
      status, grace_period_ends_at, remediation_deadline_at, source_url
    )
    SELECT
      s.observation_id, s.product_id, s.practitioner_id, s.policy_id, s.severity,
      s.observed_price_cents, s.map_price_cents,
      ROUND(((s.map_price_cents - s.observed_price_cents)::NUMERIC / s.map_price_cents) * 100, 2),
      -- Phase 2 Red/Black still go through human review before notification.
      -- Status 'investigating' keeps them off the notify queue until admin
      -- review flips them to 'active'.
      CASE
        WHEN s.practitioner_id IS NULL THEN 'investigating'
        WHEN s.phase = 2 AND s.severity IN ('red','black') THEN 'investigating'
        ELSE 'active'
      END,
      NOW() + (public.map_grace_hours(s.severity) || ' hours')::INTERVAL,
      NOW() + (public.map_grace_hours(s.severity) || ' hours')::INTERVAL,
      s.source_url
    FROM scored s
    WHERE s.severity IS NOT NULL
    RETURNING violation_id
  )
  SELECT COUNT(*) INTO new_count FROM inserted;
  RETURN QUERY SELECT new_count;
END;
$$;
