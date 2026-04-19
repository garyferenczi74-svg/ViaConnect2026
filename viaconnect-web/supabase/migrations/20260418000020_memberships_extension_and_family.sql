-- =============================================================
-- Prompt #90 Phase 1.2: Memberships extension + family_members
-- Extend existing memberships table additively. Keep existing
-- tier (TEXT) and expires_at columns intact for backward compat;
-- add new tier_id FK, current_period_start/end, billing_cycle,
-- status state-machine columns, family support columns, gift
-- tracking, etc. Dual-write strategy: new code writes both.
-- =============================================================

-- 1. Extend public.memberships
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS tier_id TEXT REFERENCES public.membership_tiers(id),
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT
    CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly','annual','gift')),
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT
    CHECK (payment_method IS NULL OR payment_method IN ('stripe','paypal','gift_from_genex360','complimentary')),
  ADD COLUMN IF NOT EXISTS gift_source_id UUID,
  ADD COLUMN IF NOT EXISTS is_annual_prepay BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS additional_adults INTEGER NOT NULL DEFAULT 0 CHECK (additional_adults >= 0),
  ADD COLUMN IF NOT EXISTS additional_children_chunks INTEGER NOT NULL DEFAULT 0 CHECK (additional_children_chunks >= 0),
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill tier_id from the legacy `tier` column where we have a canonical mapping.
-- Only operates on rows that haven't been set yet.
UPDATE public.memberships
SET tier_id = tier
WHERE tier_id IS NULL
  AND tier IN (SELECT id FROM public.membership_tiers);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memberships_user_active
  ON public.memberships(user_id)
  WHERE status IN ('active','trialing','gift_active');

CREATE INDEX IF NOT EXISTS idx_memberships_stripe_sub
  ON public.memberships(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memberships_gift_source
  ON public.memberships(gift_source_id)
  WHERE gift_source_id IS NOT NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.memberships_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_memberships_updated_at') THEN
    CREATE TRIGGER trg_memberships_updated_at
    BEFORE UPDATE ON public.memberships
    FOR EACH ROW EXECUTE FUNCTION public.memberships_set_updated_at();
  END IF;
END $$;

-- 2. Family members table
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  member_type TEXT NOT NULL CHECK (member_type IN ('adult','child')),
  display_name TEXT NOT NULL,
  email TEXT,
  birth_date DATE,
  relationship TEXT CHECK (relationship IS NULL OR relationship IN ('spouse','partner','parent','child','sibling','other')),
  permissions JSONB NOT NULL DEFAULT '{"view_data": true, "approve_protocols": false, "manage_members": false}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  invitation_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.family_members IS 'Family members under a Platinum+ Family primary account. Primary user manages all family members.';
COMMENT ON COLUMN public.family_members.member_user_id IS 'NULL if invitation not yet accepted or child under 13.';
COMMENT ON COLUMN public.family_members.permissions IS 'view_data (can see family dashboard), approve_protocols (adult only), manage_members (primary only).';

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='family_members' AND policyname='family_members_primary_full_access') THEN
    CREATE POLICY "family_members_primary_full_access"
      ON public.family_members FOR ALL
      TO authenticated
      USING (primary_user_id = auth.uid())
      WITH CHECK (primary_user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='family_members' AND policyname='family_members_self_read') THEN
    CREATE POLICY "family_members_self_read"
      ON public.family_members FOR SELECT
      TO authenticated
      USING (member_user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='family_members' AND policyname='family_members_siblings_read') THEN
    CREATE POLICY "family_members_siblings_read"
      ON public.family_members FOR SELECT
      TO authenticated
      USING (
        primary_user_id IN (
          SELECT primary_user_id FROM public.family_members
          WHERE member_user_id = auth.uid() AND is_active = true
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_family_members_primary    ON public.family_members(primary_user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_family_members_member     ON public.family_members(member_user_id)  WHERE member_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_family_members_invitation ON public.family_members(invitation_token) WHERE invitation_token IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_family_members_updated_at') THEN
    CREATE TRIGGER trg_family_members_updated_at
    BEFORE UPDATE ON public.family_members
    FOR EACH ROW EXECUTE FUNCTION public.memberships_set_updated_at();
  END IF;
END $$;
