-- =============================================================================
-- Prompt #94 Phase 1.1: Marketing spend tracking
-- =============================================================================
-- Append-only. Manual CFO entry surface for Q1; API integration deferred to a
-- future prompt. Admin-only at every gate (RLS + UI). Spend-month is always
-- normalized to the first day of the month via BEFORE INSERT/UPDATE trigger.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.marketing_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  spend_month DATE NOT NULL,

  channel TEXT NOT NULL CHECK (channel IN (
    'facebook_ads',
    'google_ads',
    'tiktok_ads',
    'podcast_sponsorship',
    'forbes_article',
    'pr_earned_media',
    'direct_email',
    'conference',
    'practitioner_referral_program',
    'content_marketing',
    'seo_organic',
    'other'
  )),
  channel_detail TEXT,

  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),

  entered_manually BOOLEAN NOT NULL DEFAULT true,
  entered_by_user_id UUID REFERENCES auth.users(id),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  api_source TEXT,
  api_sync_id TEXT,
  api_synced_at TIMESTAMPTZ,

  impressions INTEGER CHECK (impressions IS NULL OR impressions >= 0),
  clicks INTEGER CHECK (clicks IS NULL OR clicks >= 0),
  conversions INTEGER CHECK (conversions IS NULL OR conversions >= 0),

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (spend_month, channel, channel_detail)
);

COMMENT ON TABLE public.marketing_spend IS
  'Monthly marketing spend by channel. Q1 launch uses manual CFO entry. API integration deferred to future prompt. Admin-only.';
COMMENT ON COLUMN public.marketing_spend.spend_month IS
  'First day of the month this spend applies to. Normalized via trigger.';
COMMENT ON COLUMN public.marketing_spend.channel_detail IS
  'Optional subdivision within a channel, e.g., specific campaign name or podcast show name.';

CREATE INDEX IF NOT EXISTS idx_marketing_spend_month
  ON public.marketing_spend(spend_month DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_spend_channel
  ON public.marketing_spend(channel, spend_month DESC);

ALTER TABLE public.marketing_spend ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_spend_admin_all ON public.marketing_spend;
CREATE POLICY marketing_spend_admin_all
  ON public.marketing_spend FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Normalize spend_month to the first of the month so unique constraint works
-- and so all per-month aggregates align across the analytics engine.
CREATE OR REPLACE FUNCTION public.tg_normalize_spend_month()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.spend_month := date_trunc('month', NEW.spend_month)::DATE;
  NEW.updated_at  := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_spend_month_trigger ON public.marketing_spend;
CREATE TRIGGER normalize_spend_month_trigger
  BEFORE INSERT OR UPDATE ON public.marketing_spend
  FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_spend_month();
