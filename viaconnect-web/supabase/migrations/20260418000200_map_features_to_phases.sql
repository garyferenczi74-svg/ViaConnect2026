-- =============================================================================
-- Prompt #93 Phase 1.3: Map existing features to launch phases.
-- =============================================================================
-- Backfill only. For each feature seeded in migration _010, set
-- launch_phase_id to the commercially appropriate phase. Admins can override
-- any assignment via the Phase 4 admin UI.
--
-- Mapping strategy:
--   sproutables_* + family_dashboard  sproutables_q4_2027
--   practitioner_integration          practitioner_q1_2027
--   everything else (tier level <= 3) consumer_q1_2027
-- =============================================================================

-- Sproutables-specific features (Q4 2027 launch)
UPDATE public.features
   SET launch_phase_id = 'sproutables_q4_2027'
 WHERE launch_phase_id IS NULL
   AND id IN (
     'sproutables_integration',
     'family_dashboard'
   );

-- Practitioner features (30 days after consumer launch)
UPDATE public.features
   SET launch_phase_id = 'practitioner_q1_2027'
 WHERE launch_phase_id IS NULL
   AND id IN (
     'practitioner_integration'
   );

-- All remaining consumer features default to the Q1 2027 consumer launch
UPDATE public.features
   SET launch_phase_id = 'consumer_q1_2027'
 WHERE launch_phase_id IS NULL
   AND minimum_tier_level <= 3;
