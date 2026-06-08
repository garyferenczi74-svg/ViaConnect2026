-- Prompt 179a: append-only provenance + self-heal columns on body_goals.
-- Supports CAQ write-through (origin), the pace preset captured at onboarding,
-- and the projection self-heal flag pair. CHECK constraints allow NULL so the
-- existing Prompt 179 rows (created before these columns) remain valid.

ALTER TABLE public.body_goals
  ADD COLUMN IF NOT EXISTS origin TEXT
    CHECK (origin IN ('caq', 'goals_tab', 'weight_card', 'caq_backfill'));

ALTER TABLE public.body_goals
  ADD COLUMN IF NOT EXISTS target_pace_preset TEXT
    CHECK (target_pace_preset IN ('gentle', 'steady', 'ambitious', 'custom_date'));

ALTER TABLE public.body_goals
  ADD COLUMN IF NOT EXISTS needs_resync BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.body_goals
  ADD COLUMN IF NOT EXISTS legacy_synced_at TIMESTAMPTZ;
