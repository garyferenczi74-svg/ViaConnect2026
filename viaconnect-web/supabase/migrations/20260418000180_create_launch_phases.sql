-- =============================================================================
-- Prompt #93 Phase 1.1: Launch phases reference table.
-- =============================================================================
-- Commercial launch phase registry. A feature may be associated with a launch
-- phase via features.launch_phase_id (added in migration _190). The flag
-- evaluation engine (Phase 2) requires phase.activation_status IN
-- ('active','completed') for a feature linked to a phase to resolve enabled.
--
-- Append-only. Phases are seeded with the five major launch events from the
-- FarmCeutica Pricing Architecture roadmap. Additional phases (custom events,
-- geographic expansions) can be inserted by admins via the Phase 4 admin UI.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.launch_phases (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  phase_type TEXT NOT NULL CHECK (phase_type IN (
    'consumer_launch',
    'practitioner_launch',
    'sproutables_launch',
    'white_label_products_launch',
    'custom_formulations_launch',
    'international_expansion',
    'custom_event'
  )),
  target_activation_date DATE,
  actual_activation_date DATE,
  activation_status TEXT NOT NULL DEFAULT 'planned' CHECK (activation_status IN (
    'planned', 'scheduled', 'active', 'paused', 'completed', 'canceled'
  )),
  sort_order INTEGER NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.launch_phases IS
  'Commercial launch phases. Features can be associated with a launch phase; feature flags respect both their phase status and their individual active state.';
COMMENT ON COLUMN public.launch_phases.activation_status IS
  'planned = future phase, scheduled = activation datetime set, active = currently live, paused = temporarily disabled, completed = phase fully rolled out, canceled = phase abandoned';

ALTER TABLE public.launch_phases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='launch_phases' AND policyname='launch_phases_read_all') THEN
    CREATE POLICY "launch_phases_read_all"
      ON public.launch_phases FOR SELECT
      TO authenticated, anon USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='launch_phases' AND policyname='launch_phases_admin_all') THEN
    CREATE POLICY "launch_phases_admin_all"
      ON public.launch_phases FOR ALL
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_launch_phases_status
  ON public.launch_phases(activation_status);
CREATE INDEX IF NOT EXISTS idx_launch_phases_target_date
  ON public.launch_phases(target_activation_date);

-- -----------------------------------------------------------------------------
-- Seed the five major launch phases from the FarmCeutica Pricing roadmap.
-- ON CONFLICT DO NOTHING makes the seed idempotent; rerunning the migration
-- will not overwrite admin-driven edits to phase status or activation dates.
-- -----------------------------------------------------------------------------
INSERT INTO public.launch_phases (
  id, display_name, description, phase_type,
  target_activation_date, activation_status, sort_order
) VALUES
  ('consumer_q1_2027',
   'Consumer Launch (Q1 2027)',
   'ViaCura adult consumer brand launch. Free, Gold, Platinum, and Platinum+ Family tiers active. GeneX360 three-tier offering. Supplement discount architecture. Outcome stack bundles. Helix Rewards.',
   'consumer_launch', '2027-01-15', 'planned', 1),
  ('practitioner_q1_2027',
   'Practitioner Launch (Q1 2027 + 30 days)',
   'Cohort 1 practitioner onboarding. Standard Portal ($128.88) and White-Label Platform ($288.88) tiers. Wholesale pricing. Four-level certification program. Medium co-branded patient experience.',
   'practitioner_launch', '2027-02-15', 'planned', 2),
  ('sproutables_q4_2027',
   'Sproutables Launch (Q4 2027)',
   'ViaCura Sproutables children''s line launch. Platinum+ Family integration with Sproutables. Pediatric-specific supplementation.',
   'sproutables_launch', '2027-10-15', 'planned', 3),
  ('white_label_products_2028',
   'White-Label Products (Q3 to Q4 2028)',
   'FarmCeutica Private Label launch for qualified practitioners. Minimum 10,000 units annual commitment. Foundations-tier formulations available; flagship formulations remain ViaCura-exclusive.',
   'white_label_products_launch', '2028-09-01', 'planned', 4),
  ('custom_formulations_2029',
   'Custom Formulations (Q2 to Q3 2029)',
   'Level 4 Custom Formulation program for Master Practitioners. Custom formulations with 2 to 3 year exclusivity periods.',
   'custom_formulations_launch', '2029-05-01', 'planned', 5)
ON CONFLICT (id) DO NOTHING;
