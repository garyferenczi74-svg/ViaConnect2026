-- =============================================================================
-- Prompt #93 Phase 1.2: Extend features with launch phase + rollout columns.
-- =============================================================================
-- Additive only. Existing columns are untouched so Prompt #90 tier-based
-- gating continues to work unchanged. The evaluation engine (Phase 2) layers
-- these checks on top of the existing tier check.
--
-- Rollout strategy semantics:
--   all_eligible    every user meeting tier + phase is included
--   percentage      deterministic hash of user_id + feature_id, rollout %
--   cohort_list     user must match any cohort in rollout_cohort_ids
--   opt_in          explicit user opt-in required (user_feature_opt_ins)
--   internal_only   staff / admin / founder roles only
--   kill_switch_off force disabled regardless of other config (overrides)
-- =============================================================================

ALTER TABLE public.features
  ADD COLUMN IF NOT EXISTS launch_phase_id TEXT REFERENCES public.launch_phases(id),
  ADD COLUMN IF NOT EXISTS rollout_strategy TEXT NOT NULL DEFAULT 'all_eligible'
    CHECK (rollout_strategy IN (
      'all_eligible',
      'percentage',
      'cohort_list',
      'opt_in',
      'internal_only',
      'kill_switch_off'
    )),
  ADD COLUMN IF NOT EXISTS rollout_percentage INTEGER
    CHECK (rollout_percentage IS NULL OR rollout_percentage BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS rollout_cohort_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS kill_switch_engaged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kill_switch_engaged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kill_switch_engaged_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS kill_switch_reason TEXT,
  ADD COLUMN IF NOT EXISTS feature_owner UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_evaluated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS evaluation_count_24h INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.features.launch_phase_id IS
  'Optional link to launch_phases.id. If set, feature is only enabled when the associated phase has activation_status in (active, completed).';
COMMENT ON COLUMN public.features.rollout_strategy IS
  'How the feature rolls out to eligible users. See migration _190 header for semantics.';
COMMENT ON COLUMN public.features.rollout_percentage IS
  'For percentage rollout: 0..100. Deterministic bucket = sha256(user_id || feature_id) % 100.';
COMMENT ON COLUMN public.features.kill_switch_engaged IS
  'Emergency kill switch. When true the feature is disabled regardless of all other configuration. Overrides every other check.';
COMMENT ON COLUMN public.features.evaluation_count_24h IS
  'Rolling 24h evaluation counter. Reset by the Phase 6 metrics job; never read by the evaluation engine hot path.';

CREATE INDEX IF NOT EXISTS idx_features_phase
  ON public.features(launch_phase_id)
  WHERE launch_phase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_features_kill_switch
  ON public.features(kill_switch_engaged)
  WHERE kill_switch_engaged = true;
CREATE INDEX IF NOT EXISTS idx_features_rollout_strategy
  ON public.features(rollout_strategy)
  WHERE rollout_strategy <> 'all_eligible';
