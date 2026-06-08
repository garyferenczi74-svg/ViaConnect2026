-- Prompt 179c: extend body_tracker_circumference append-only for scan auto-import
-- and soft-delete. The existing manual circumference feature is unchanged: source
-- defaults to 'manual', scan_id and deleted_at default null, so existing writes
-- (submitEntry) and reads keep working. body_tracker_entries is the shared parent
-- event (also parents weight), so the soft-delete + scan link live on the
-- circumference row itself, scoped to the measurement, not the parent.

ALTER TABLE public.body_tracker_circumference
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'scan'));

ALTER TABLE public.body_tracker_circumference
  ADD COLUMN IF NOT EXISTS scan_id UUID REFERENCES public.body_photo_sessions(id) ON DELETE SET NULL;

ALTER TABLE public.body_tracker_circumference
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- A scan imports at most one circumference row (idempotency, DD-2 + Section 7).
CREATE UNIQUE INDEX IF NOT EXISTS uq_body_tracker_circumference_scan
  ON public.body_tracker_circumference(scan_id) WHERE scan_id IS NOT NULL;

-- Hot read for the trend + history (non-deleted rows per user, newest first).
CREATE INDEX IF NOT EXISTS idx_body_tracker_circumference_user_active
  ON public.body_tracker_circumference(user_id, created_at DESC) WHERE deleted_at IS NULL;
