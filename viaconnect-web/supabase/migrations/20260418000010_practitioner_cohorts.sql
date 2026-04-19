-- =============================================================================
-- Prompt #91, Phase 1.3: Practitioner cohorts
-- =============================================================================
-- Append-only. Cohorts group approved waitlist entries into batched onboarding
-- waves. Cohort 1 ships ~30 days after consumer launch with 25 founding
-- practitioners. Subsequent cohorts grow the panel.
--
-- Read access: all authenticated + anon may read non-planning cohorts so the
-- public marketing page can show "Cohort N now selecting" copy. Admin-only
-- writes via profiles.role='admin'.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.practitioner_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cohort_number INTEGER NOT NULL UNIQUE,
  target_size INTEGER NOT NULL DEFAULT 25,
  onboarding_start_date DATE,
  onboarding_end_date DATE,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN (
    'planning', 'selecting', 'onboarding', 'active', 'completed'
  )),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.practitioner_cohorts IS
  'Practitioner onboarding cohorts. Cohort 1 = 25 founding practitioners onboarded ~30 days after consumer launch.';

CREATE INDEX IF NOT EXISTS idx_practitioner_cohorts_status
  ON public.practitioner_cohorts(status);

ALTER TABLE public.practitioner_cohorts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cohorts_read_public ON public.practitioner_cohorts;
CREATE POLICY cohorts_read_public
  ON public.practitioner_cohorts FOR SELECT
  TO authenticated, anon
  USING (status <> 'planning');

DROP POLICY IF EXISTS cohorts_admin_all ON public.practitioner_cohorts;
CREATE POLICY cohorts_admin_all
  ON public.practitioner_cohorts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Seed Cohort 1 (status starts as 'selecting' so anon marketing pages can
-- render it; admins flip to 'onboarding' when invitations send).
INSERT INTO public.practitioner_cohorts (
  name, cohort_number, target_size, status, description
) VALUES (
  'Cohort 1: Founding Practitioners',
  1,
  25,
  'selecting',
  'First wave of practitioners onboarded at practitioner portal launch. Concierge-supported onboarding with direct founder engagement. Target: 25 practitioners representing diverse specialties and geographies.'
)
ON CONFLICT (cohort_number) DO NOTHING;
