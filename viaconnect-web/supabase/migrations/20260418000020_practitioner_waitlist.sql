-- =============================================================================
-- Prompt #91, Phase 1.4: Practitioner waitlist
-- =============================================================================
-- Append-only. Captures practitioner intent during the 30-day window between
-- consumer launch and practitioner portal launch. Hybrid public signup +
-- invitation-only flow. Anon can INSERT (public submission). Authenticated
-- submitters can read their own row by email match. Admins manage everything.
-- =============================================================================

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

  -- Cohort assignment (FK guarded — cohorts table from 20260418000010)
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

-- Indexes
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

-- RLS
ALTER TABLE public.practitioner_waitlist ENABLE ROW LEVEL SECURITY;

-- Public submissions: anyone (anon or authenticated) may insert. The API
-- route validates payload shape and the unique(email) constraint blocks
-- duplicates server-side. No SELECT grant for anon.
DROP POLICY IF EXISTS "waitlist_public_insert" ON public.practitioner_waitlist;
CREATE POLICY "waitlist_public_insert"
  ON public.practitioner_waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated submitters can read their own entry by email match. This
-- powers the "check my waitlist status" flow if they sign up later.
DROP POLICY IF EXISTS "waitlist_self_read" ON public.practitioner_waitlist;
CREATE POLICY "waitlist_self_read"
  ON public.practitioner_waitlist FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Admins have full access.
DROP POLICY IF EXISTS "waitlist_admin_all" ON public.practitioner_waitlist;
CREATE POLICY "waitlist_admin_all"
  ON public.practitioner_waitlist FOR ALL
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
