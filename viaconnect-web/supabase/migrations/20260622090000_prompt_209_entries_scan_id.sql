-- Prompt 209: provenance + idempotency for scan-sourced composition entries.
-- Additive and forward-safe: a nullable column plus a partial unique index that
-- only constrains scan-sourced rows. Manual entries keep scan_id NULL.
alter table public.body_tracker_entries add column if not exists scan_id uuid;

create unique index if not exists body_tracker_entries_scan_id_key
  on public.body_tracker_entries (scan_id) where scan_id is not null;

comment on column public.body_tracker_entries.scan_id is
  'FormaVision body_tracker_photo_scans.id this entry was derived from. NULL for manual entries. Unique to make scan persistence idempotent.';
