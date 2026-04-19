-- =============================================================================
-- Prompt #94 Phase 1.2: Customer acquisition attribution
-- =============================================================================
-- Append-only. Per-user first-touch + last-touch + referral attribution.
-- Inserted at signup by the public API path (auth check is the row's own
-- user_id = auth.uid() so the user can write their own row exactly once).
-- Admin reads everything; no other role can read.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.customer_acquisition_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  acquired_at TIMESTAMPTZ NOT NULL,

  -- First-touch (captured at session start pre-signup, persisted into
  -- session storage, written here at account creation).
  first_touch_channel TEXT NOT NULL CHECK (first_touch_channel IN (
    'facebook_ads', 'google_ads', 'tiktok_ads',
    'podcast_sponsorship', 'forbes_article', 'pr_earned_media',
    'direct_email', 'conference', 'practitioner_referral',
    'consumer_referral', 'content_marketing', 'seo_organic',
    'direct_traffic', 'unknown', 'other'
  )),
  first_touch_campaign TEXT,
  first_touch_source TEXT,
  first_touch_medium TEXT,
  first_touch_referrer_url TEXT,
  first_touch_landing_page TEXT,

  -- Last-touch (captured at conversion, may equal first-touch when same
  -- session). Channel constraint mirrors first_touch.
  last_touch_channel TEXT CHECK (last_touch_channel IS NULL OR last_touch_channel IN (
    'facebook_ads', 'google_ads', 'tiktok_ads',
    'podcast_sponsorship', 'forbes_article', 'pr_earned_media',
    'direct_email', 'conference', 'practitioner_referral',
    'consumer_referral', 'content_marketing', 'seo_organic',
    'direct_traffic', 'unknown', 'other'
  )),
  last_touch_campaign TEXT,
  last_touch_source TEXT,
  last_touch_medium TEXT,

  -- Referral attribution
  referred_by_user_id UUID REFERENCES auth.users(id),
  referred_by_practitioner_id UUID REFERENCES public.practitioners(id),
  referral_code_used TEXT,

  -- Derived categorization (also computable from above; denormalized
  -- here for fast SELECT in the CAC engine).
  is_practitioner_attached BOOLEAN NOT NULL DEFAULT false,
  is_paid_acquisition BOOLEAN NOT NULL DEFAULT false,
  is_organic BOOLEAN NOT NULL DEFAULT false,

  -- Provenance
  user_agent TEXT,
  ip_country TEXT,
  ip_region TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.customer_acquisition_attribution IS
  'Per-user acquisition attribution. First-touch captured pre-signup; last-touch captured at account creation. Enables channel-specific CAC.';
COMMENT ON COLUMN public.customer_acquisition_attribution.is_practitioner_attached IS
  'True when referred_by_practitioner_id is set OR when user has an active practitioner relationship at signup.';

CREATE INDEX IF NOT EXISTS idx_cac_attrib_user
  ON public.customer_acquisition_attribution(user_id);
CREATE INDEX IF NOT EXISTS idx_cac_attrib_acquired
  ON public.customer_acquisition_attribution(acquired_at);
CREATE INDEX IF NOT EXISTS idx_cac_attrib_first_channel
  ON public.customer_acquisition_attribution(first_touch_channel, acquired_at);
CREATE INDEX IF NOT EXISTS idx_cac_attrib_practitioner
  ON public.customer_acquisition_attribution(referred_by_practitioner_id)
  WHERE referred_by_practitioner_id IS NOT NULL;

ALTER TABLE public.customer_acquisition_attribution ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cac_attrib_admin_all ON public.customer_acquisition_attribution;
CREATE POLICY cac_attrib_admin_all
  ON public.customer_acquisition_attribution FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow each user to insert exactly their own attribution row at signup.
-- Combined with the UNIQUE(user_id) constraint this is one row per user.
DROP POLICY IF EXISTS cac_attrib_self_insert ON public.customer_acquisition_attribution;
CREATE POLICY cac_attrib_self_insert
  ON public.customer_acquisition_attribution FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
