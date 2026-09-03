-- =============================================================================
-- FormaVision Meshy visual GLB (FRBL photos -> textured mesh).
-- Visual-only metadata on the existing body_photo_sessions row. Never stores
-- girths, body fat, or any measurement invented from the Meshy mesh.
-- Reuses private bucket body-progress-photos for the mirrored GLB.
-- Append-only. Does not edit existing migrations. Not applied here.
-- =============================================================================

ALTER TABLE body_photo_sessions
  ADD COLUMN IF NOT EXISTS meshy_visual jsonb;

COMMENT ON COLUMN body_photo_sessions.meshy_visual IS
  'FormaVision Meshy multi-image-to-3d visual only: task id, status, stored GLB path, byte size, views used. Never measurements, girths, or body-fat. Meshy assets expire in about 3 days; the GLB is mirrored into body-progress-photos.';
