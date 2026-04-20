-- Prompt #100 Jeffery audit remediation.
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum
--
-- map_price_observations is admin-only by RLS, so a practitioner's
-- browser query that embedded observations(source_url) resolved the
-- embed to NULL and broke the "View listing" deep-link on every
-- violation card. Denormalize source_url onto map_violations at
-- detection time so practitioners can see the offending URL directly
-- under their own RLS policy, while observations stay admin-only.

ALTER TABLE public.map_violations
  ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Backfill existing rows from the linked observation.
UPDATE public.map_violations v
SET source_url = o.source_url
FROM public.map_price_observations o
WHERE v.observation_id = o.observation_id
  AND v.source_url IS NULL;

-- Update detect_map_violations to populate source_url on insert.
CREATE OR REPLACE FUNCTION public.detect_map_violations()
RETURNS TABLE(detected INTEGER) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_count INTEGER := 0;
BEGIN
  WITH candidate_observations AS (
    SELECT o.observation_id, o.product_id, o.practitioner_id,
           o.observed_price_cents, o.observed_at, o.source_url,
           p.pricing_tier
    FROM public.map_price_observations o
    JOIN public.products p ON p.id = o.product_id
    WHERE o.observed_at >= NOW() - INTERVAL '30 minutes'
      AND p.pricing_tier IN ('L1','L2')
      AND NOT EXISTS (SELECT 1 FROM public.map_violations v WHERE v.observation_id = o.observation_id)
  ),
  active_policies AS (
    SELECT mp.policy_id, mp.product_id, mp.tier, mp.map_price_cents,
           mp.ingredient_cost_floor_cents,
           mp.map_exemption_window_start, mp.map_exemption_window_end
    FROM public.map_policies mp
    WHERE mp.map_enforcement_start_date <= CURRENT_DATE
  ),
  scored AS (
    SELECT co.observation_id, co.product_id, co.practitioner_id,
           co.observed_price_cents, co.observed_at, co.source_url,
           ap.policy_id, ap.map_price_cents,
           public.classify_map_severity(
             co.observed_price_cents,
             ap.map_price_cents,
             ap.ingredient_cost_floor_cents
           ) AS severity,
           CASE WHEN ap.map_exemption_window_start IS NOT NULL
                 AND co.observed_at::DATE BETWEEN ap.map_exemption_window_start AND ap.map_exemption_window_end
                THEN TRUE ELSE FALSE END AS within_exemption
    FROM candidate_observations co
    JOIN active_policies ap ON ap.product_id = co.product_id AND ap.tier = co.pricing_tier
  ),
  inserted AS (
    INSERT INTO public.map_violations (
      observation_id, product_id, practitioner_id, policy_id, severity,
      observed_price_cents, map_price_cents, discount_pct_below_map,
      status, grace_period_ends_at, remediation_deadline_at, source_url
    )
    SELECT s.observation_id, s.product_id, s.practitioner_id, s.policy_id, s.severity,
      s.observed_price_cents, s.map_price_cents,
      ROUND(((s.map_price_cents - s.observed_price_cents)::NUMERIC / s.map_price_cents) * 100, 2),
      CASE WHEN s.practitioner_id IS NULL THEN 'investigating' ELSE 'active' END,
      NOW() + (public.map_grace_hours(s.severity) || ' hours')::INTERVAL,
      NOW() + (public.map_grace_hours(s.severity) || ' hours')::INTERVAL,
      s.source_url
    FROM scored s
    WHERE s.severity IS NOT NULL AND NOT s.within_exemption
    RETURNING violation_id
  )
  SELECT COUNT(*) INTO new_count FROM inserted;
  RETURN QUERY SELECT new_count;
END;
$$;

COMMENT ON COLUMN public.map_violations.source_url IS
  'Denormalized from map_price_observations at detection time so practitioners can see the offending URL under their own RLS policy without reading the admin-only observations table.';
