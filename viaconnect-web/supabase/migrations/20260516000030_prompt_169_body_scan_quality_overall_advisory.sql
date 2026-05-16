-- =============================================================
-- Prompt #169: body_scan_quality table additive columns
-- Adds overall_pass (boolean) and advisory_notes (jsonb) columns
-- Backfill defaults: overall_pass NULL, advisory_notes '[]'
-- Append only; no DROP, no rename
-- =============================================================

ALTER TABLE public.body_scan_quality
  ADD COLUMN IF NOT EXISTS overall_pass    BOOLEAN,
  ADD COLUMN IF NOT EXISTS advisory_notes  JSONB NOT NULL DEFAULT '[]'::jsonb;
