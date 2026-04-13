-- Prompt #69 — per-card submission timestamps for Quick Daily Check-in.
-- NULL = not yet submitted today. Set to NOW() on individual card save.

ALTER TABLE daily_checkins
  ADD COLUMN IF NOT EXISTS sleep_submitted_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exercise_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activity_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stress_submitted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS energy_submitted_at   TIMESTAMPTZ;

-- User timezone for midnight reset calculation
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
