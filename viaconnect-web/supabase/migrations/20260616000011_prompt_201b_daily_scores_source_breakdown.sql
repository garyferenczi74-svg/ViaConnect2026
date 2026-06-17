-- Prompt 201b: give the Google Health gauge writer a home for the signals that
-- have no dedicated daily_scores column (resting heart rate, oxygen saturation,
-- respiratory rate, raw heart rate, distance, floors, calories, per-session
-- exercise) plus device provenance. Append-only, additive, default empty, so
-- existing rows and the daily-scoring engine are unaffected.
--
-- The live daily_scores keys on (user_id, date); the connector writes the typed
-- columns it already has (recovery_hrv, sleep_hours, steps_count,
-- exercise_minutes) and parks everything else in this JSONB bag, retaining the
-- original values for a future view. UNKNOWN signals are simply absent, never 0.
--
-- All comments use hyphens only. No em-dashes or en-dashes.

alter table public.daily_scores
  add column if not exists source_breakdown jsonb not null default '{}'::jsonb;
