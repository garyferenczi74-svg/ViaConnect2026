-- Prompt #85c Phase J: server-side triggers for wearable_connected + supplement_added
-- Key Moments events. Mirrors Phase I pattern: SECURITY DEFINER, search_path locked,
-- NOT EXISTS guards, idempotent CREATE OR REPLACE + DROP TRIGGER IF EXISTS.
-- Both fire once per user (first wearable connected, first supplement added).
-- Subsequent rows do not produce additional Key Moments to avoid timeline noise.

-- ── wearable_connected event ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_record_wearable_connected_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_title TEXT;
  v_device TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.body_tracker_journey_events
    WHERE user_id = NEW.user_id AND event_type = 'wearable_connected'
  ) THEN
    v_device := COALESCE(NEW.device_name, NEW.device_type, 'wearable device');
    v_title := 'Connected ' || v_device;
    INSERT INTO public.body_tracker_journey_events
      (user_id, event_type, title, occurred_at, metadata)
    VALUES (
      NEW.user_id,
      'wearable_connected',
      v_title,
      COALESCE(NEW.connected_at, NOW()),
      jsonb_build_object(
        'integration_id', NEW.id,
        'device_type', NEW.device_type,
        'device_name', NEW.device_name
      )
    );
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS bt_event_on_wearable_connected ON public.wearable_integrations;
CREATE TRIGGER bt_event_on_wearable_connected
  AFTER INSERT ON public.wearable_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_record_wearable_connected_event();

-- ── supplement_added event ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_record_supplement_added_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
BEGIN
  -- Fire only on the user's FIRST supplement; subsequent additions are routine
  IF NOT EXISTS (
    SELECT 1 FROM public.body_tracker_journey_events
    WHERE user_id = NEW.user_id AND event_type = 'supplement_added'
  ) THEN
    INSERT INTO public.body_tracker_journey_events
      (user_id, event_type, title, occurred_at, metadata)
    VALUES (
      NEW.user_id,
      'supplement_added',
      'Started tracking supplements',
      COALESCE(NEW.added_at, NOW()),
      jsonb_build_object(
        'first_supplement_id', NEW.id,
        'first_supplement_name', NEW.supplement_name
      )
    );
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS bt_event_on_supplement_added ON public.user_current_supplements;
CREATE TRIGGER bt_event_on_supplement_added
  AFTER INSERT ON public.user_current_supplements
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_record_supplement_added_event();

-- ── One-time backfill ──────────────────────────────────────────────────────

-- wearable_connected backfill: earliest connection per user
INSERT INTO public.body_tracker_journey_events
  (user_id, event_type, title, occurred_at, metadata)
SELECT DISTINCT ON (wi.user_id)
  wi.user_id,
  'wearable_connected',
  'Connected ' || COALESCE(wi.device_name, wi.device_type, 'wearable device'),
  COALESCE(wi.connected_at, NOW()),
  jsonb_build_object(
    'integration_id', wi.id,
    'device_type', wi.device_type,
    'device_name', wi.device_name,
    'backfilled', TRUE
  )
FROM public.wearable_integrations wi
WHERE NOT EXISTS (
  SELECT 1 FROM public.body_tracker_journey_events e
  WHERE e.user_id = wi.user_id AND e.event_type = 'wearable_connected'
)
ORDER BY wi.user_id, wi.connected_at NULLS LAST;

-- supplement_added backfill: first supplement per user
INSERT INTO public.body_tracker_journey_events
  (user_id, event_type, title, occurred_at, metadata)
SELECT DISTINCT ON (s.user_id)
  s.user_id,
  'supplement_added',
  'Started tracking supplements',
  COALESCE(s.added_at, NOW()),
  jsonb_build_object(
    'first_supplement_id', s.id,
    'first_supplement_name', s.supplement_name,
    'backfilled', TRUE
  )
FROM public.user_current_supplements s
WHERE NOT EXISTS (
  SELECT 1 FROM public.body_tracker_journey_events e
  WHERE e.user_id = s.user_id AND e.event_type = 'supplement_added'
)
ORDER BY s.user_id, s.added_at NULLS LAST;

COMMENT ON FUNCTION public.trg_record_wearable_connected_event() IS
  'Prompt #85c Phase J: auto-records wearable_connected Key Moments event on first wearable_integrations row per user. Title includes device_name when available.';
COMMENT ON FUNCTION public.trg_record_supplement_added_event() IS
  'Prompt #85c Phase J: auto-records supplement_added Key Moments event on first user_current_supplements row per user. One-per-user only to avoid timeline noise.';
