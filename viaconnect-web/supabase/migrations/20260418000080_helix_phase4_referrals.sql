-- Prompt #92 Phase 4: referral codes + attribution lifecycle (append-only)

CREATE TABLE IF NOT EXISTS public.helix_referral_codes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE CHECK (length(code) BETWEEN 4 AND 16),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.helix_referral_codes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='helix_referral_codes' AND policyname='referral_codes_self_read') THEN
    CREATE POLICY "referral_codes_self_read" ON public.helix_referral_codes FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_helix_referral_codes_code ON public.helix_referral_codes(code);

ALTER TABLE public.helix_referrals
  ADD COLUMN IF NOT EXISTS signed_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_purchase_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_purchase_genex360_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_helix_referrals_referred_user
  ON public.helix_referrals(referred_user_id)
  WHERE referred_user_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='helix_referrals' AND constraint_name='helix_referrals_no_self_referral') THEN
    ALTER TABLE public.helix_referrals
      ADD CONSTRAINT helix_referrals_no_self_referral
      CHECK (referrer_id IS NULL OR referred_user_id IS NULL OR referrer_id <> referred_user_id)
      NOT VALID;
    BEGIN
      ALTER TABLE public.helix_referrals VALIDATE CONSTRAINT helix_referrals_no_self_referral;
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'Existing helix_referrals row violates self-referral rule; constraint left NOT VALID.';
    END;
  END IF;
END $$;
