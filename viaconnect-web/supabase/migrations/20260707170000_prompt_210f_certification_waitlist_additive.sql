-- =============================================================================
-- Prompt 210f Task F3: certification/waitlist ADDITIVE tranche migration
-- =============================================================================
-- Gary Decision 2 (2026-07-07): full go-live for the certification/waitlist
-- cluster (P1 decision sheet cluster 4). This file is the SCHEMA portion that
-- stops the live lead loss on the public practitioner waitlist form
-- (src/app/api/waitlist/practitioner/route.ts); the mailer cron arming is
-- Task F4 and nothing here arms it. Assembled from the cluster 4 unapplied
-- source migrations, in their original order:
--
--   1. 20260418000010_practitioner_cohorts.sql
--   2. 20260418000020_practitioner_waitlist.sql
--   3. 20260418000040_practitioner_email_queue.sql
--   4. 20260418000070_certification_levels.sql
--   5. 20260418000100_practitioner_certifications.sql
--
-- NOT EXTRACTED (scope boundaries, recorded in
-- .superpowers/sdd/task-210f-F3-report.md):
--   * 20260418000030_practitioner_invitations.sql (practitioner_invitations
--     table + validate_practitioner_invitation RPC): outside the F3 coverage
--     list in the 210f execution plan (five tables). The waitlist route
--     downgrades invitation-token submissions to submission_type = 'public'
--     when validation fails, so the lead-loss stop does not depend on it.
--   * 20260418000050_practitioner_mailer_cron.sql: the ENTIRE file (agent
--     registry activation row + cron.unschedule/cron.schedule pair that
--     http_posts the practitioner-waitlist-mailer function) is Task F4's
--     arming step. Reproduced verbatim in the F4 ARMING comment block at the
--     end of this file; nothing from it executes here.
--   * The _150 invitation RPCs the decision sheet lists under cluster 4
--     (lookup_practitioner_invitation, accept_practitioner_invitation)
--     already shipped with Task F1 and are not duplicated here.
--
-- Destructive statements found in the cluster sources: NONE. Every source
-- DROP POLICY IF EXISTS / DROP TRIGGER IF EXISTS is an adjacent idempotent
-- recreate pair and is converted to a guarded create (no DROP carried).
-- Nothing new was appended to the evidence pack for this tranche.
--
-- Conversions applied during extraction, mirroring Task F1:
--   * Every DROP POLICY IF EXISTS + CREATE POLICY adjacency pair becomes a
--     DO block that creates the policy only when pg_policies has no row for
--     it (no DROP carried).
--   * The source DROP TRIGGER IF EXISTS + CREATE TRIGGER pair becomes a DO
--     block gated on pg_trigger.
--   * Every bare auth.uid() in a policy is wrapped to the initplan form
--     (select auth.uid()) per the established repo remediation
--     (see 20260622180000).
--   * Both seeds are wrapped in empty-table guards with their source
--     ON CONFLICT clauses kept intact: idempotent on live apply and a no-op
--     on a fresh full replay where the original files run first.
--   * Both queue functions keep their source SECURITY DEFINER,
--     SET search_path = public, pg_temp pins, and REVOKE/GRANT pairs
--     verbatim.
--
-- CLOSES THE F1 DEFERRAL (docs/integrity/practitioner-core-drop-evidence.md,
-- "Additional deferrals" section 1): section 6 attaches
-- practitioners_waitlist_id_fkey and practitioners_cohort_id_fkey now that
-- this file creates their target tables. Both columns hold zero rows live,
-- so the attach cannot fail on data.
--
-- Shape test: src/lib/__tests__/certification_waitlist-migration-shape.test.ts
-- parses this file. DO NOT add destructive statements or executable cron
-- statements here; the test fails on any DROP token and on any
-- cron.schedule / http_post / registry insert outside comments.
-- =============================================================================

-- =============================================================================
-- SECTION 1 of 6: from 20260418000010_practitioner_cohorts.sql
-- =============================================================================
-- Cohorts group approved waitlist entries into batched onboarding waves.
-- Read access: authenticated + anon may read non-planning cohorts so the
-- public marketing page can show "Cohort N now selecting" copy. Admin-only
-- writes via profiles.role = 'admin'.

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_cohorts'
      AND policyname = 'cohorts_read_public'
  ) THEN
    CREATE POLICY cohorts_read_public
      ON public.practitioner_cohorts FOR SELECT
      TO authenticated, anon
      USING (status <> 'planning');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_cohorts'
      AND policyname = 'cohorts_admin_all'
  ) THEN
    CREATE POLICY cohorts_admin_all
      ON public.practitioner_cohorts FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = (select auth.uid()) AND role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = (select auth.uid()) AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Seed Cohort 1 (status starts as 'selecting' so anon marketing pages can
-- render it; admins flip to 'onboarding' when invitations send). Source
-- ON CONFLICT kept; empty-table guard added per the 210f seed convention.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.practitioner_cohorts
  ) THEN
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
  END IF;
END $$;

-- =============================================================================
-- SECTION 2 of 6: from 20260418000020_practitioner_waitlist.sql
-- =============================================================================
-- Captures practitioner intent. Hybrid public signup + invitation-only flow.
-- Anon can INSERT (public submission). Authenticated submitters can read
-- their own row by email match. Admins manage everything.

CREATE TABLE IF NOT EXISTS public.practitioner_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,

  -- Practice information
  practice_name TEXT NOT NULL,
  practice_url TEXT,
  practice_street_address TEXT,
  practice_city TEXT,
  practice_state TEXT,
  practice_postal_code TEXT,
  practice_country TEXT DEFAULT 'US',

  -- Credentials
  credential_type TEXT NOT NULL CHECK (credential_type IN (
    'md', 'do', 'nd', 'dc', 'np', 'pa', 'rd', 'lac', 'other'
  )),
  credential_type_other TEXT,
  license_state TEXT,
  license_number TEXT,
  npi_number TEXT,
  years_in_practice INTEGER CHECK (years_in_practice IS NULL OR years_in_practice BETWEEN 0 AND 80),

  -- Practice profile
  approximate_patient_panel_size INTEGER CHECK (approximate_patient_panel_size IS NULL OR approximate_patient_panel_size >= 0),
  primary_clinical_focus TEXT NOT NULL CHECK (primary_clinical_focus IN (
    'functional_medicine', 'integrative_medicine', 'naturopathic',
    'chiropractic', 'nutrition', 'acupuncture_tcm',
    'ayurvedic', 'longevity', 'precision_wellness',
    'general_primary_care', 'other'
  )),
  primary_clinical_focus_other TEXT,
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  uses_genetic_testing BOOLEAN,
  currently_dispensing_supplements BOOLEAN,
  estimated_monthly_supplement_volume_cents INTEGER,

  -- Interest context
  referral_source TEXT NOT NULL CHECK (referral_source IN (
    'forbes_article', 'carlyle_social', 'podcast',
    'direct_email', 'colleague_referral', 'conference',
    'search_engine', 'social_media', 'other'
  )),
  referral_source_other TEXT,
  interest_reason TEXT NOT NULL CHECK (char_length(interest_reason) BETWEEN 20 AND 2000),
  biggest_clinical_challenge TEXT,
  desired_platform_features TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Waitlist metadata
  submission_type TEXT NOT NULL DEFAULT 'public' CHECK (submission_type IN ('public', 'invitation')),
  invitation_token TEXT,
  invited_by_user_id UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'pending_review',
    'approved_for_cohort',
    'waitlisted',
    'declined',
    'converted_to_practitioner',
    'withdrew'
  )),
  status_updated_at TIMESTAMPTZ,
  status_updated_by UUID REFERENCES auth.users(id),
  admin_notes TEXT,

  -- Cohort assignment (target created in section 1 of this file)
  assigned_cohort_id UUID REFERENCES public.practitioner_cohorts(id),
  priority_score INTEGER CHECK (priority_score IS NULL OR priority_score BETWEEN 0 AND 100),

  -- Communication
  last_email_sent_at TIMESTAMPTZ,
  email_sequence_step INTEGER DEFAULT 0,
  unsubscribed BOOLEAN DEFAULT false,

  -- Conversion tracking
  converted_to_user_id UUID REFERENCES auth.users(id),
  converted_at TIMESTAMPTZ,

  -- Provenance
  user_agent TEXT,
  ip_address TEXT,
  referrer_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (email)
);

COMMENT ON TABLE public.practitioner_waitlist IS
  'Practitioner waitlist submissions. Hybrid public signup + invitation-only flow. Ships with consumer launch.';

CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.practitioner_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.practitioner_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_cohort
  ON public.practitioner_waitlist(assigned_cohort_id) WHERE assigned_cohort_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_waitlist_priority
  ON public.practitioner_waitlist(priority_score DESC) WHERE status = 'pending_review';
CREATE INDEX IF NOT EXISTS idx_waitlist_invitation_token
  ON public.practitioner_waitlist(invitation_token) WHERE invitation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_waitlist_credential
  ON public.practitioner_waitlist(credential_type);

ALTER TABLE public.practitioner_waitlist ENABLE ROW LEVEL SECURITY;

-- Public submissions: anyone (anon or authenticated) may insert. The API
-- route validates payload shape and the unique(email) constraint blocks
-- duplicates server-side. No SELECT grant for anon.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_waitlist'
      AND policyname = 'waitlist_public_insert'
  ) THEN
    CREATE POLICY "waitlist_public_insert"
      ON public.practitioner_waitlist FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Authenticated submitters can read their own entry by email match. This
-- powers the "check my waitlist status" flow if they sign up later.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_waitlist'
      AND policyname = 'waitlist_self_read'
  ) THEN
    CREATE POLICY "waitlist_self_read"
      ON public.practitioner_waitlist FOR SELECT
      TO authenticated
      USING (email = (SELECT email FROM auth.users WHERE id = (select auth.uid())));
  END IF;
END $$;

-- Admins have full access.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_waitlist'
      AND policyname = 'waitlist_admin_all'
  ) THEN
    CREATE POLICY "waitlist_admin_all"
      ON public.practitioner_waitlist FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = (select auth.uid()) AND role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = (select auth.uid()) AND role = 'admin'
        )
      );
  END IF;
END $$;

-- =============================================================================
-- SECTION 3 of 6: from 20260418000040_practitioner_email_queue.sql
-- =============================================================================
-- Drives the 6-step waitlist nurture sequence using SUPABASE built-in SMTP
-- only. The practitioner-waitlist-mailer Edge Function consumes this queue
-- on a pg_cron tick; that cron registration is Task F4 (see the F4 ARMING
-- block at the end of this file) and is NOT applied here. Until F4 arms,
-- rows enqueue and sit pending: no email sends, no lead is lost.

CREATE TABLE IF NOT EXISTS public.practitioner_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_id UUID NOT NULL REFERENCES public.practitioner_waitlist(id) ON DELETE CASCADE,
  step INTEGER NOT NULL CHECK (step BETWEEN 1 AND 6),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  -- Transport tag locks the queue to Supabase SMTP. Any future provider
  -- added here is a policy decision, not an accident.
  transport TEXT NOT NULL DEFAULT 'supabase_smtp' CHECK (transport IN ('supabase_smtp')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (waitlist_id, step)
);

COMMENT ON TABLE public.practitioner_email_queue IS
  'Practitioner waitlist email nurture queue. Supabase SMTP only; no third-party transports permitted.';

CREATE INDEX IF NOT EXISTS idx_pwlq_due
  ON public.practitioner_email_queue(scheduled_for)
  WHERE status = 'pending';

ALTER TABLE public.practitioner_email_queue ENABLE ROW LEVEL SECURITY;

-- Admin-only access. Edge Function uses service role to enqueue and consume.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_email_queue'
      AND policyname = 'pwlq_admin_all'
  ) THEN
    CREATE POLICY "pwlq_admin_all"
      ON public.practitioner_email_queue FOR ALL
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

-- Helper: enqueue the welcome email (step 1) on signup.
CREATE OR REPLACE FUNCTION public.enqueue_practitioner_welcome_email(p_waitlist_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.practitioner_email_queue (waitlist_id, step, scheduled_for)
  VALUES (p_waitlist_id, 1, NOW())
  ON CONFLICT (waitlist_id, step) DO NOTHING
  RETURNING id INTO v_id;

  UPDATE public.practitioner_waitlist
     SET email_sequence_step = GREATEST(email_sequence_step, 1),
         updated_at = NOW()
   WHERE id = p_waitlist_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_practitioner_welcome_email(UUID) FROM public;
REVOKE ALL ON FUNCTION public.enqueue_practitioner_welcome_email(UUID) FROM anon;
-- Server-only. Anonymous origins must not be able to enqueue arbitrary
-- welcome emails for discovered waitlist UUIDs. The public API route does
-- NOT call this RPC; instead, the AFTER INSERT trigger below enqueues
-- step 1 automatically as a side-effect of row creation.
GRANT EXECUTE ON FUNCTION public.enqueue_practitioner_welcome_email(UUID) TO service_role;

-- Trigger: enqueue welcome email automatically on waitlist row creation.
-- Runs as table owner (no RLS conflict) and is the only path to step 1.
CREATE OR REPLACE FUNCTION public.tg_practitioner_waitlist_enqueue_welcome()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.enqueue_practitioner_welcome_email(NEW.id);
  RETURN NEW;
END;
$$;

-- Source DROP TRIGGER + CREATE TRIGGER pair converted to a pg_trigger guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'practitioner_waitlist_enqueue_welcome'
      AND tgrelid = 'public.practitioner_waitlist'::regclass
  ) THEN
    CREATE TRIGGER practitioner_waitlist_enqueue_welcome
      AFTER INSERT ON public.practitioner_waitlist
      FOR EACH ROW EXECUTE FUNCTION public.tg_practitioner_waitlist_enqueue_welcome();
  END IF;
END $$;

-- =============================================================================
-- SECTION 4 of 6: from 20260418000070_certification_levels.sql
-- =============================================================================
-- Three certification levels per spec. CE partnership status starts as
-- 'pending' for all paid levels; flipped to 'active' once the CE board
-- partnership is countersigned.

CREATE TABLE IF NOT EXISTS public.certification_levels (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  level_number INTEGER NOT NULL UNIQUE,
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  annual_recertification_price_cents INTEGER CHECK (
    annual_recertification_price_cents IS NULL OR annual_recertification_price_cents >= 0
  ),
  description TEXT,
  estimated_hours INTEGER CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
  ce_credits_offered INTEGER CHECK (ce_credits_offered IS NULL OR ce_credits_offered >= 0),
  ce_partnership_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    ce_partnership_status IN ('pending', 'active', 'inactive')
  ),
  validity_months INTEGER CHECK (validity_months IS NULL OR validity_months > 0),
  is_required BOOLEAN NOT NULL DEFAULT false,
  unlocks_white_label BOOLEAN NOT NULL DEFAULT false,
  unlocks_custom_formulation BOOLEAN NOT NULL DEFAULT false,
  lms_course_id TEXT,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.certification_levels IS
  'Practitioner certification program levels: Foundation (free, required), Precision Protocol Designer ($888), Master Practitioner ($1,888). $388 annual recert for paid levels.';
COMMENT ON COLUMN public.certification_levels.ce_partnership_status IS
  'pending = partnership in progress (Q1 2027 launch state); active = CE credits issued; inactive = partnership lapsed.';

ALTER TABLE public.certification_levels ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'certification_levels'
      AND policyname = 'cert_levels_read_all'
  ) THEN
    CREATE POLICY cert_levels_read_all
      ON public.certification_levels FOR SELECT
      TO authenticated, anon
      USING (is_active = true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'certification_levels'
      AND policyname = 'cert_levels_admin_write'
  ) THEN
    CREATE POLICY cert_levels_admin_write
      ON public.certification_levels FOR ALL
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

-- Seed the three-level catalog. Source ON CONFLICT upsert kept; empty-table
-- guard added per the 210f seed convention.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.certification_levels
  ) THEN
    INSERT INTO public.certification_levels (
      id, display_name, level_number, price_cents, annual_recertification_price_cents,
      description, estimated_hours, ce_credits_offered,
      validity_months, is_required, unlocks_white_label, unlocks_custom_formulation,
      sort_order
    ) VALUES
      ('foundation', 'Level 1: Foundation',
        1, 0, NULL,
        'Free foundation course required for all practitioner accounts. Covers ViaCura product line, basic genetic concepts, platform usage. Completion required before prescribing products.',
        5, 5, 24, true, false, false, 1),
      ('precision_designer', 'Level 2: Precision Protocol Designer',
        2, 88800, 38800,
        'Clinical training on methylation, genetic variant interpretation, protocol building with GeneX360 data. Case studies and applied learning. Required for practitioners working with GeneX360 data clinically.',
        18, 20, 24, false, false, false, 2),
      ('master_practitioner', 'Level 3: Master Practitioner',
        3, 188800, 38800,
        'Advanced clinical training, patient case review, practice integration, marketing to patients. Unlocks White-Label Platform tier pricing and Custom Formulation program access. Confers Preferred Practitioner status.',
        35, 35, 24, false, true, true, 3)
    ON CONFLICT (id) DO UPDATE SET
      display_name                       = EXCLUDED.display_name,
      level_number                       = EXCLUDED.level_number,
      price_cents                        = EXCLUDED.price_cents,
      annual_recertification_price_cents = EXCLUDED.annual_recertification_price_cents,
      description                        = EXCLUDED.description,
      estimated_hours                    = EXCLUDED.estimated_hours,
      ce_credits_offered                 = EXCLUDED.ce_credits_offered,
      validity_months                    = EXCLUDED.validity_months,
      is_required                        = EXCLUDED.is_required,
      unlocks_white_label                = EXCLUDED.unlocks_white_label,
      unlocks_custom_formulation         = EXCLUDED.unlocks_custom_formulation,
      sort_order                         = EXCLUDED.sort_order,
      updated_at                         = NOW();
  END IF;
END $$;

-- =============================================================================
-- SECTION 5 of 6: from 20260418000100_practitioner_certifications.sql
-- =============================================================================
-- Tracks each practitioner's enrollment + progress through the certification
-- program. practitioners(id) exists live (F1 applied 2026-07-07);
-- certification_levels is created in section 4 of this file.

CREATE TABLE IF NOT EXISTS public.practitioner_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  certification_level_id TEXT NOT NULL REFERENCES public.certification_levels(id),

  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN (
    'enrolled', 'in_progress', 'completed', 'certified', 'expired', 'revoked'
  )),

  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  certified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- LMS integration
  lms_enrollment_id TEXT,
  lms_progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (lms_progress_percent BETWEEN 0 AND 100),
  lms_last_sync_at TIMESTAMPTZ,

  -- Certificate
  certificate_number TEXT UNIQUE,
  certificate_url TEXT,

  -- CE credits
  ce_credits_earned INTEGER NOT NULL DEFAULT 0 CHECK (ce_credits_earned >= 0),
  ce_credit_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    ce_credit_status IN ('pending', 'issued', 'not_eligible')
  ),

  -- Payment
  amount_paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
  stripe_payment_intent_id TEXT,

  -- Recertification chain
  is_recertification BOOLEAN NOT NULL DEFAULT false,
  parent_certification_id UUID REFERENCES public.practitioner_certifications(id),

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (practitioner_id, certification_level_id, is_recertification, enrolled_at)
);

COMMENT ON TABLE public.practitioner_certifications IS
  'Practitioner certification enrollments and progress. lms_progress_percent updated by LMS webhooks.';

CREATE INDEX IF NOT EXISTS idx_prac_certs_practitioner
  ON public.practitioner_certifications(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_prac_certs_active
  ON public.practitioner_certifications(practitioner_id, status)
  WHERE status IN ('certified', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_prac_certs_expiring
  ON public.practitioner_certifications(expires_at)
  WHERE status = 'certified';

ALTER TABLE public.practitioner_certifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_certifications'
      AND policyname = 'prac_certs_self_read'
  ) THEN
    CREATE POLICY prac_certs_self_read
      ON public.practitioner_certifications FOR SELECT
      TO authenticated
      USING (
        practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = (select auth.uid()))
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_certifications'
      AND policyname = 'prac_certs_admin_all'
  ) THEN
    CREATE POLICY prac_certs_admin_all
      ON public.practitioner_certifications FOR ALL
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

-- =============================================================================
-- SECTION 6 of 6: F1 deferral closure (evidence pack, Additional deferrals 1)
-- =============================================================================
-- Task F1 added practitioners.waitlist_id / cohort_id as plain UUID columns
-- because these target tables did not exist live at F1 apply time. This file
-- creates both targets above, so the recorded one-line ALTERs now attach,
-- guarded exactly like F1's conditional-FK DO block. Both columns hold zero
-- rows live, so the attach cannot fail on data.

DO $$
BEGIN
  IF to_regclass('public.practitioner_waitlist') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'practitioners_waitlist_id_fkey'
         AND conrelid = 'public.practitioners'::regclass
     ) THEN
    ALTER TABLE public.practitioners
      ADD CONSTRAINT practitioners_waitlist_id_fkey
      FOREIGN KEY (waitlist_id) REFERENCES public.practitioner_waitlist(id);
  END IF;

  IF to_regclass('public.practitioner_cohorts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'practitioners_cohort_id_fkey'
         AND conrelid = 'public.practitioners'::regclass
     ) THEN
    ALTER TABLE public.practitioners
      ADD CONSTRAINT practitioners_cohort_id_fkey
      FOREIGN KEY (cohort_id) REFERENCES public.practitioner_cohorts(id);
  END IF;
END $$;

-- =============================================================================
-- F4 ARMING, DO NOT APPLY IN F3
-- =============================================================================
-- The ENTIRE content of 20260418000050_practitioner_mailer_cron.sql is
-- reproduced below so Task F4 can lift it verbatim once the
-- practitioner-waitlist-mailer edge function is deployed, the pre-arm
-- checklist (idempotency proof, caps, kill switch, candidate-set query,
-- CASL/CAN-SPAM clearance, Gary first-run sign-off) passes. Every line below
-- carries a single leading "-- "; strip that prefix to recover the source
-- file byte-for-byte. NOTHING BELOW THIS LINE EXECUTES IN F3. The agent
-- registry activation row rides with F4 too: registering the mailer as
-- is_active with a 20-minute heartbeat health check before the function is
-- deployed would only raise false monitoring alerts.
--
-- -- =============================================================================
-- -- Prompt #91, Phase 1: Practitioner mailer cron + registry registration
-- -- =============================================================================
-- -- Append-only. Schedules the practitioner-waitlist-mailer Edge Function to
-- -- drain the practitioner_email_queue every 5 minutes, and registers it in
-- -- ultrathink_agent_registry so Jeffery can monitor heartbeats.
-- --
-- -- Mirrors the patterns from:
-- --   supabase/migrations/20260409000021_sherlock_cron.sql        (cron schedule)
-- --   supabase/migrations/20260416000100_arnold_supervisor_wiring.sql  (registry + cron pair)
-- -- =============================================================================
--
-- -- ---------------------------------------------------------------------------
-- -- 1) Register the mailer in the agent registry so Jeffery can monitor it
-- -- ---------------------------------------------------------------------------
--
-- INSERT INTO public.ultrathink_agent_registry
--   (agent_name, display_name, origin_prompt, agent_type, tier, description,
--    reports, runtime_kind, runtime_handle, expected_period_minutes,
--    health_check_query, is_critical, is_active)
-- VALUES
--   ('practitioner-waitlist-mailer',
--    'Practitioner Waitlist Mailer',
--    'Prompt #91',
--    'engagement',
--    2,
--    'Drains practitioner_email_queue every 5 minutes and sends nurture emails through the project SMTP server. Supabase-only transport; no third-party providers.',
--    'jeffery',
--    'edge_function',
--    'practitioner-waitlist-mailer',
--    5,
--    'SELECT 1 FROM public.ultrathink_agent_events WHERE agent_name = ''practitioner-waitlist-mailer'' AND event_type IN (''heartbeat'',''complete'') AND created_at > now() - interval ''20 minutes''',
--    false,
--    true)
-- ON CONFLICT (agent_name) DO UPDATE SET
--   display_name            = EXCLUDED.display_name,
--   description             = EXCLUDED.description,
--   reports                 = EXCLUDED.reports,
--   runtime_kind            = EXCLUDED.runtime_kind,
--   runtime_handle          = EXCLUDED.runtime_handle,
--   expected_period_minutes = EXCLUDED.expected_period_minutes,
--   health_check_query      = EXCLUDED.health_check_query,
--   is_critical             = EXCLUDED.is_critical,
--   is_active               = EXCLUDED.is_active,
--   updated_at              = now();
--
-- -- ---------------------------------------------------------------------------
-- -- 2) Schedule the mailer every 5 minutes at off-zero minute :03,:08,...
-- --    (avoids collision with sherlock at :07, brand-enricher pattern, and
-- --    arnold-tick at :17,:47)
-- -- ---------------------------------------------------------------------------
--
-- DO $$
-- BEGIN
--   PERFORM cron.unschedule('practitioner_waitlist_mailer_cron');
-- EXCEPTION
--   WHEN OTHERS THEN NULL;
-- END $$;
--
-- SELECT cron.schedule(
--   'practitioner_waitlist_mailer_cron',
--   '3,8,13,18,23,28,33,38,43,48,53,58 * * * *',
--   $sql$
--   SELECT extensions.http_post(
--     url := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/practitioner-waitlist-mailer',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key', true))
--     ),
--     body := jsonb_build_object(
--       'trigger', 'cron',
--       'scheduled_at', now()
--     )::text
--   );
--   $sql$
-- );
