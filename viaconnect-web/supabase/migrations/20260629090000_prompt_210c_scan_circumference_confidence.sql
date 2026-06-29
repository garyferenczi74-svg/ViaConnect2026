-- Prompt 210c Task 10: per-field confidence columns for circumference measurements.
-- Additive, idempotent (ADD COLUMN IF NOT EXISTS). Null-defaulted.
--
-- DO NOT apply this migration manually.
-- The controller applies it via Supabase MCP, verifies the columns exist,
-- and regenerates src/lib/supabase/types.ts before shipping.
--
-- body_tracker_circumference: 12 per-girth confidence columns + calibration version.
-- body_tracker_weight: hips_confidence for the hip stored there per Prompt 85d.

ALTER TABLE body_tracker_circumference
  ADD COLUMN IF NOT EXISTS neck_confidence                numeric(3,2),
  ADD COLUMN IF NOT EXISTS chest_confidence               numeric(3,2),
  ADD COLUMN IF NOT EXISTS waist_confidence               numeric(3,2),
  ADD COLUMN IF NOT EXISTS shoulder_width_confidence      numeric(3,2),
  ADD COLUMN IF NOT EXISTS right_upper_arm_confidence     numeric(3,2),
  ADD COLUMN IF NOT EXISTS left_upper_arm_confidence      numeric(3,2),
  ADD COLUMN IF NOT EXISTS right_forearm_confidence       numeric(3,2),
  ADD COLUMN IF NOT EXISTS left_forearm_confidence        numeric(3,2),
  ADD COLUMN IF NOT EXISTS right_upper_thigh_confidence   numeric(3,2),
  ADD COLUMN IF NOT EXISTS left_upper_thigh_confidence    numeric(3,2),
  ADD COLUMN IF NOT EXISTS right_calf_confidence          numeric(3,2),
  ADD COLUMN IF NOT EXISTS left_calf_confidence           numeric(3,2),
  ADD COLUMN IF NOT EXISTS scan_calibration_version       text;

ALTER TABLE body_tracker_weight
  ADD COLUMN IF NOT EXISTS hips_confidence numeric(3,2);
