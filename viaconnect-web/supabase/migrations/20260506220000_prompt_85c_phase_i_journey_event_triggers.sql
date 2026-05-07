-- Prompt #85c Phase I: server-side triggers for caq_completed / genex360_connected /
-- milestone_completed Key Moments events. Append-only. SECURITY DEFINER so the
-- function can write to body_tracker_journey_events on behalf of the row owner;
-- WHERE auth.uid() filtering is unnecessary since we always set user_id from NEW.
-- Each function uses NOT EXISTS guards to prevent duplicate event rows.
-- One-time backfill INSERTs at the end cover users whose source data predates
-- this trigger.

-- ── caq_completed event ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_record_caq_completed_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
BEGIN
  IF NEW.completed = TRUE
     AND (TG_OP = 'INSERT' OR OLD.completed IS DISTINCT FROM TRUE)
     AND NOT EXISTS (
       SELECT 1 FROM public.body_tracker_journey_events
       WHERE user_id = NEW.user_id AND event_type = 'caq_completed'
     )
  THEN
    INSERT INTO public.body_tracker_journey_events
      (user_id, event_type, title, occurred_at, metadata)
    VALUES (
      NEW.user_id,
      'caq_completed',
      'Completed wellness assessment',
      COALESCE(NEW.completed_at, NOW()),
      jsonb_build_object('assessment_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS bt_event_on_caq_completed ON public.clinical_assessments;
CREATE TRIGGER bt_event_on_caq_completed
  AFTER INSERT OR UPDATE OF completed ON public.clinical_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_record_caq_completed_event();

-- ── genex360_connected event ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_record_genex360_connected_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
BEGIN
  IF NOT EXISTS (
       SELECT 1 FROM public.body_tracker_journey_events
       WHERE user_id = NEW.user_id AND event_type = 'genex360_connected'
     )
  THEN
    INSERT INTO public.body_tracker_journey_events
      (user_id, event_type, title, occurred_at, metadata)
    VALUES (
      NEW.user_id,
      'genex360_connected',
      'GeneX360 results landed',
      COALESCE(NEW.created_at, NOW()),
      jsonb_build_object('genetic_profile_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS bt_event_on_genex360_inserted ON public.genetic_profiles;
CREATE TRIGGER bt_event_on_genex360_inserted
  AFTER INSERT ON public.genetic_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_record_genex360_connected_event();

-- ── milestone_completed event ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_record_milestone_completed_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_title TEXT;
  v_detail TEXT;
BEGIN
  IF NEW.completed_date IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.completed_date IS NULL)
  THEN
    v_title := 'Milestone hit: ' || COALESCE(NEW.title, 'Goal reached');
    v_detail := CASE
      WHEN NEW.grade IS NOT NULL THEN 'Grade: ' || NEW.grade
      ELSE NULL
    END;
    INSERT INTO public.body_tracker_journey_events
      (user_id, event_type, title, detail, occurred_at, metadata)
    VALUES (
      NEW.user_id,
      'milestone_completed',
      v_title,
      v_detail,
      NEW.completed_date::timestamptz,
      jsonb_build_object('milestone_id', NEW.id, 'grade', NEW.grade)
    );
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS bt_event_on_milestone_completed ON public.body_tracker_milestones;
CREATE TRIGGER bt_event_on_milestone_completed
  AFTER INSERT OR UPDATE OF completed_date ON public.body_tracker_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_record_milestone_completed_event();

-- ── One-time backfill for users whose source data predates the triggers ─────

-- caq_completed backfill
INSERT INTO public.body_tracker_journey_events
  (user_id, event_type, title, occurred_at, metadata)
SELECT DISTINCT ON (ca.user_id)
  ca.user_id,
  'caq_completed',
  'Completed wellness assessment',
  COALESCE(ca.completed_at, ca.created_at, NOW()),
  jsonb_build_object('assessment_id', ca.id, 'backfilled', TRUE)
FROM public.clinical_assessments ca
WHERE ca.completed = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.body_tracker_journey_events e
    WHERE e.user_id = ca.user_id AND e.event_type = 'caq_completed'
  )
ORDER BY ca.user_id, ca.completed_at NULLS LAST, ca.created_at NULLS LAST;

-- genex360_connected backfill
INSERT INTO public.body_tracker_journey_events
  (user_id, event_type, title, occurred_at, metadata)
SELECT DISTINCT ON (gp.user_id)
  gp.user_id,
  'genex360_connected',
  'GeneX360 results landed',
  COALESCE(gp.created_at, NOW()),
  jsonb_build_object('genetic_profile_id', gp.id, 'backfilled', TRUE)
FROM public.genetic_profiles gp
WHERE NOT EXISTS (
  SELECT 1 FROM public.body_tracker_journey_events e
  WHERE e.user_id = gp.user_id AND e.event_type = 'genex360_connected'
)
ORDER BY gp.user_id, gp.created_at NULLS LAST;

-- milestone_completed backfill
INSERT INTO public.body_tracker_journey_events
  (user_id, event_type, title, detail, occurred_at, metadata)
SELECT
  m.user_id,
  'milestone_completed',
  'Milestone hit: ' || COALESCE(m.title, 'Goal reached'),
  CASE WHEN m.grade IS NOT NULL THEN 'Grade: ' || m.grade ELSE NULL END,
  m.completed_date::timestamptz,
  jsonb_build_object('milestone_id', m.id, 'grade', m.grade, 'backfilled', TRUE)
FROM public.body_tracker_milestones m
WHERE m.completed_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.body_tracker_journey_events e
    WHERE e.user_id = m.user_id
      AND e.event_type = 'milestone_completed'
      AND (e.metadata->>'milestone_id')::uuid = m.id
  );

COMMENT ON FUNCTION public.trg_record_caq_completed_event() IS
  'Prompt #85c Phase I: auto-records caq_completed Key Moments event when clinical_assessments.completed flips to TRUE. SECURITY DEFINER; NOT EXISTS guard prevents duplicates.';
COMMENT ON FUNCTION public.trg_record_genex360_connected_event() IS
  'Prompt #85c Phase I: auto-records genex360_connected Key Moments event on first genetic_profiles row per user.';
COMMENT ON FUNCTION public.trg_record_milestone_completed_event() IS
  'Prompt #85c Phase I: auto-records milestone_completed Key Moments event when body_tracker_milestones.completed_date is set.';
