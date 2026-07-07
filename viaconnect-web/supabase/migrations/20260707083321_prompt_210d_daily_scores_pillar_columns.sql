-- Prompt 210d P0-4: daily_scores pillar columns (append-only).
-- The gauge writer (src/app/actions/dailyScores.ts updateGaugeScores) upserts
-- these eight columns and the windowed journey graph reader
-- (src/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/
-- useBioOptimizationTrend.ts) selects them, but none exist on the live
-- daily_scores table (2026-07-07 drift snapshot: docs/integrity/snapshot/live-types.ts).
-- Append-only per the never-drop rule: live wearable-era columns are untouched
-- and the unapplied 20260413000020_daily_scores_rebuild.sql is NOT applied or copied.
-- Shape test: src/app/actions/__tests__/daily-scores-shape.test.ts parses this file.
-- Sign-off note: the writer upsert targets on conflict (user_id, score_date); a
-- unique index on (user_id, score_date) is a required follow-up decision and is
-- deliberately not created here (this migration is the approved eight columns only).
alter table public.daily_scores
  add column if not exists score_date date,
  add column if not exists data_mode text,
  add column if not exists calculated_at timestamptz,
  add column if not exists overall_score numeric,
  add column if not exists nutrition_score numeric,
  add column if not exists activity_score numeric,
  add column if not exists mood_stress_score numeric,
  add column if not exists energy_score numeric;
