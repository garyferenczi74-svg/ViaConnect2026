-- Prompt 201 follow-up: the idempotency unique index must be on plain columns so
-- supabase-js upsert onConflict can target it. The ingestion funnel always
-- supplies a non-null external_id (a stable source record id, or a generated id
-- for manual entries), so a plain index dedups Apple Health re-imports
-- identically while keeping manual entries distinct.
--
-- All comments use hyphens only. No em-dashes or en-dashes.

drop index if exists public.body_composition_readings_idem;
create unique index if not exists body_composition_readings_idem
  on public.body_composition_readings (user_id, source_id, metric_key, measured_at, external_id);
