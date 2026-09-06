-- =============================================================================
-- FormaVision e2e hybrid: opt-in retain FRBL + Tripo visual GLB.
-- Append-only. Does not edit existing migrations. Not applied here.
-- Photos stay discarded unless photos_retained is true after explicit consent.
-- tripo_visual is visual-only — never girths, body fat, or muscle lbs.
-- =============================================================================

ALTER TABLE body_tracker_photo_scans
  ADD COLUMN IF NOT EXISTS photos_retained boolean NOT NULL DEFAULT false;

ALTER TABLE body_tracker_photo_scans
  ADD COLUMN IF NOT EXISTS photo_session_id uuid REFERENCES body_photo_sessions(id) ON DELETE SET NULL;

ALTER TABLE body_tracker_photo_scans
  ADD COLUMN IF NOT EXISTS retained_views text[];

ALTER TABLE body_photo_sessions
  ADD COLUMN IF NOT EXISTS tripo_visual jsonb;

COMMENT ON COLUMN body_tracker_photo_scans.photos_retained IS
  'True only after explicit opt-in to keep Front/Right/Back/Left for 3D and re-measure. Default discard.';

COMMENT ON COLUMN body_tracker_photo_scans.photo_session_id IS
  'Linked body_photo_sessions row that stores retained FRBL paths for Tripo. Null when photos were discarded.';

COMMENT ON COLUMN body_tracker_photo_scans.retained_views IS
  'Pose ids kept when photos_retained is true (front/right/back/left). Empty/null means discard.';

COMMENT ON COLUMN body_photo_sessions.tripo_visual IS
  'FormaVision Tripo multiview-to-model visual only: task id, status, stored GLB path, byte size, views used. Never measurements, girths, body-fat, or muscle lbs.';
