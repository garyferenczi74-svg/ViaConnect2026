-- Prompt #85c Phase K: goal_reached + arnold_adjustment Key Moments triggers.
-- Completes the 9-value event_type enum coverage from Phase H.
-- Mirrors Phase I/J pattern: SECURITY DEFINER, search_path locked, idempotent.

-- ── goal_reached event ─────────────────────────────────────────────────────
-- Fires when the LAST milestone in a chain completes (milestone_order = total_milestones).
-- Note: milestone_completed trigger from Phase I will ALSO fire on the same row
-- (intermediate event), so the last milestone produces TWO Key Moments by design:
-- one milestone_completed (per-milestone) + one goal_reached (chain finale).
CREATE OR REPLACE FUNCTION public.trg_record_goal_reached_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
BEGIN
  IF NEW.completed_date IS NOT NULL
     AND NEW.milestone_order = NEW.total_milestones
     AND (TG_OP = 'INSERT' OR OLD.completed_date IS NULL)
     AND NOT EXISTS (
       SELECT 1 FROM public.body_tracker_journey_events
       WHERE user_id = NEW.user_id
         AND event_type = 'goal_reached'
         AND (metadata->>'milestone_id')::uuid = NEW.id
     )
  THEN
    INSERT INTO public.body_tracker_journey_events
      (user_id, event_type, title, detail, occurred_at, metadata)
    VALUES (
      NEW.user_id,
      'goal_reached',
      'Goal reached: ' || COALESCE(NEW.title, 'Final milestone'),
      CASE WHEN NEW.grade IS NOT NULL THEN 'Grade: ' || NEW.grade ELSE NULL END,
      NEW.completed_date::timestamptz,
      jsonb_build_object(
        'milestone_id', NEW.id,
        'milestone_order', NEW.milestone_order,
        'total_milestones', NEW.total_milestones,
        'grade', NEW.grade
      )
    );
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS bt_event_on_goal_reached ON public.body_tracker_milestones;
CREATE TRIGGER bt_event_on_goal_reached
  AFTER INSERT OR UPDATE OF completed_date ON public.body_tracker_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_record_goal_reached_event();

-- ── arnold_adjustment event ────────────────────────────────────────────────
-- Fires on new body_tracker_recommendations row, rate-limited to one event
-- per 24-hour window per user to prevent timeline noise from regenerations.
CREATE OR REPLACE FUNCTION public.trg_record_arnold_adjustment_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.body_tracker_journey_events
    WHERE user_id = NEW.user_id
      AND event_type = 'arnold_adjustment'
      AND occurred_at > (NOW() - INTERVAL '24 hours')
  ) THEN
    INSERT INTO public.body_tracker_journey_events
      (user_id, event_type, title, occurred_at, metadata)
    VALUES (
      NEW.user_id,
      'arnold_adjustment',
      'Arnold updated your recommendation',
      COALESCE(NEW.generated_at, NOW()),
      jsonb_build_object(
        'recommendation_id', NEW.id,
        'confidence_tier', NEW.confidence_tier,
        'sources', NEW.source_ids
      )
    );
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS bt_event_on_arnold_adjustment ON public.body_tracker_recommendations;
CREATE TRIGGER bt_event_on_arnold_adjustment
  AFTER INSERT ON public.body_tracker_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_record_arnold_adjustment_event();

-- ── One-time backfill ──────────────────────────────────────────────────────

-- goal_reached backfill: any milestone where completed_date set AND last in chain
INSERT INTO public.body_tracker_journey_events
  (user_id, event_type, title, detail, occurred_at, metadata)
SELECT
  m.user_id,
  'goal_reached',
  'Goal reached: ' || COALESCE(m.title, 'Final milestone'),
  CASE WHEN m.grade IS NOT NULL THEN 'Grade: ' || m.grade ELSE NULL END,
  m.completed_date::timestamptz,
  jsonb_build_object(
    'milestone_id', m.id,
    'milestone_order', m.milestone_order,
    'total_milestones', m.total_milestones,
    'grade', m.grade,
    'backfilled', TRUE
  )
FROM public.body_tracker_milestones m
WHERE m.completed_date IS NOT NULL
  AND m.milestone_order = m.total_milestones
  AND NOT EXISTS (
    SELECT 1 FROM public.body_tracker_journey_events e
    WHERE e.user_id = m.user_id
      AND e.event_type = 'goal_reached'
      AND (e.metadata->>'milestone_id')::uuid = m.id
  );

-- arnold_adjustment backfill: most recent recommendation per user (one-time anchor)
INSERT INTO public.body_tracker_journey_events
  (user_id, event_type, title, occurred_at, metadata)
SELECT DISTINCT ON (r.user_id)
  r.user_id,
  'arnold_adjustment',
  'Arnold updated your recommendation',
  COALESCE(r.generated_at, NOW()),
  jsonb_build_object(
    'recommendation_id', r.id,
    'confidence_tier', r.confidence_tier,
    'sources', r.source_ids,
    'backfilled', TRUE
  )
FROM public.body_tracker_recommendations r
WHERE NOT EXISTS (
  SELECT 1 FROM public.body_tracker_journey_events e
  WHERE e.user_id = r.user_id AND e.event_type = 'arnold_adjustment'
)
ORDER BY r.user_id, r.generated_at DESC NULLS LAST;

COMMENT ON FUNCTION public.trg_record_goal_reached_event() IS
  'Prompt #85c Phase K: auto-records goal_reached Key Moments event when the FINAL milestone in a chain completes (milestone_order = total_milestones). Fires alongside milestone_completed for the same row by design.';
COMMENT ON FUNCTION public.trg_record_arnold_adjustment_event() IS
  'Prompt #85c Phase K: auto-records arnold_adjustment Key Moments event on new body_tracker_recommendations rows. Rate-limited to once per 24-hour window per user to avoid timeline noise.';
