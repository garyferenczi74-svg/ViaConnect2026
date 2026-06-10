-- Prompt 185: My Supplements Daily Schedule (Hannah driven timing + drag and drop)
-- Foundation migration: timing knowledge base + per user schedule slots.
--
-- Step 0 discovery notes (verified against migration files 2026-06-09; verify
-- against live with list_migrations before this is applied):
--   Regimen table:      public.user_current_supplements (PK id uuid;
--                       unique(user_id, supplement_name)). Already carries
--                       time_of_day text[], with_food, timing_reason,
--                       timing_source ('hannah_recommended'|'user_set') from
--                       20260605030000 (prompt 175h). This migration adds a
--                       richer per slot model that becomes the source of truth
--                       for the Daily Schedule; the array column stays for
--                       backfill and is NOT dropped (append only).
--   Intake / taken log: REUSED, not recreated. public.protocol_adherence_log
--                       (20260407000100) is the today scoped taken log (keyed
--                       product_slug + scheduled_date + time_of_day; awards
--                       Helix). Prompt 185 mark as taken writes there. No
--                       supplement_intake_log table is created (Gary decision
--                       2026-06-09).
--   CAQ data:           public.assessment_results (jsonb per (user_id, phase));
--                       lifestyle = phase 3. Wake / wind down / largest meal
--                       collection is added on the CAQ path in a later slice,
--                       not here.
--   Timezone:           public.profiles.timezone (default UTC) plus
--                       src/lib/timezone.ts. Reused; no second tz source.
--   Agent:              Hannah (slug 'hannah'); resolved via
--                       src/lib/getDisplayName.ts. The single swap point is the
--                       SUPPLEMENT_TIMING_AGENT_SLUG constant in app code.
--
-- Append only: new tables only. No existing migration, table, or column is
-- altered or dropped. No emojis. No em or en dashes anywhere including comments.

-- ===========================================================================
-- Table A: supplement_timing_rules  (Hannah's curated knowledge base)
-- Seeded reference data, not per user. Readable by all authenticated users;
-- curated updates run server side (service role), never per render web calls.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.supplement_timing_rules (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_key            text NOT NULL UNIQUE,
  default_time_of_day  text NOT NULL CHECK (default_time_of_day IN ('morning','afternoon','evening')),
  with_food            boolean,
  empty_stomach        boolean,
  fat_soluble          boolean NOT NULL DEFAULT false,
  away_from            text[] NOT NULL DEFAULT '{}',
  rationale_short      text NOT NULL,
  source_citation      text,
  compliance_reviewed  boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplement_timing_rules_match_key
  ON public.supplement_timing_rules (match_key);

ALTER TABLE public.supplement_timing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Timing rules readable by authenticated" ON public.supplement_timing_rules;
CREATE POLICY "Timing rules readable by authenticated"
  ON public.supplement_timing_rules
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.supplement_timing_rules TO authenticated;

-- ===========================================================================
-- Table B: user_supplement_schedule  (per user, per slot assignment)
-- One row per (user supplement, time of day slot). Supports split dosing (the
-- same supplement in more than one bucket), intra bucket ordering, and per slot
-- source + rationale. user_id is denormalized from the parent regimen row so
-- RLS scopes by auth.uid() exactly as user_current_supplements and
-- protocol_adherence_log already do.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.user_supplement_schedule (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_supplement_id   uuid NOT NULL REFERENCES public.user_current_supplements(id) ON DELETE CASCADE,
  time_of_day          text NOT NULL CHECK (time_of_day IN ('morning','afternoon','evening')),
  time_source          text NOT NULL CHECK (time_source IN ('user_caq','user_manual','user_drag','hannah')),
  dose_note            text,
  rationale            text,
  display_order        integer NOT NULL DEFAULT 0,
  assigned_at          timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_supplement_id, time_of_day)
);

CREATE INDEX IF NOT EXISTS idx_user_supplement_schedule_user
  ON public.user_supplement_schedule (user_id);
CREATE INDEX IF NOT EXISTS idx_user_supplement_schedule_supplement
  ON public.user_supplement_schedule (user_supplement_id);
CREATE INDEX IF NOT EXISTS idx_user_supplement_schedule_bucket
  ON public.user_supplement_schedule (user_id, time_of_day, display_order);

ALTER TABLE public.user_supplement_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own supplement schedule" ON public.user_supplement_schedule;
CREATE POLICY "Users manage own supplement schedule"
  ON public.user_supplement_schedule
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
