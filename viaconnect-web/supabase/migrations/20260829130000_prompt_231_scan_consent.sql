-- =============================================================================
-- Prompt 231: versioned scan consent (226 pattern)
--
-- Server-side, version-tracked consent gate for the 4-pose body scan flow.
-- Mirrors the Prompt 226 converter_disclaimer_versions / converter_disclaimer_acks
-- shape: a Lex-controlled versioned copy table plus a per-user per-version
-- acknowledgement table. Consent is checked SERVER-side (scanConsentGate.ts,
-- hasScanConsent()) before capture/submit proceeds; localStorage is never
-- the gate.
--
-- scan_consent_versions starts with a placeholder v1 row at lex_status =
-- 'pending' (Lex has not cleared the copy yet). The SELECT policy and the
-- server-side gate both only serve a row once lex_status = 'cleared', so
-- hasScanConsent() finds no active version and fails closed for every user
-- until a later, separate migration flips it, matching the 226 precedent
-- (20260820160000 seeds pending, 20260820162000 clears it).
--
-- Append-only. Author + contract-test only; NOT applied to any live database
-- by this change (application is a separate Gary/Supabase step).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- scan_consent_versions: Lex-controlled versioned consent copy.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scan_consent_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  body_markdown text NOT NULL,
  lex_status text NOT NULL DEFAULT 'pending'
    CHECK (lex_status IN ('pending', 'cleared', 'blocked')),
  effective_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.scan_consent_versions IS
  'Prompt 231: versioned scan consent copy. Only a row with lex_status = cleared is served to hasScanConsent() / GET api/scan/consent. Lex owns final copy; a separate migration flips lex_status once cleared, mirroring the 226 converter_disclaimer_versions pattern.';

COMMENT ON COLUMN public.scan_consent_versions.body_markdown IS
  'Placeholder body pending final Lex copy. Must state that a linked practitioner can view the user scans (condition 13, G ruling: scan privacy = accept shared exposure).';

ALTER TABLE public.scan_consent_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scan_consent_versions_select ON public.scan_consent_versions;
CREATE POLICY scan_consent_versions_select
  ON public.scan_consent_versions
  FOR SELECT TO authenticated
  USING (lex_status = 'cleared');

-- Seed placeholder v1 copy. Pending Lex review; not visible to the SELECT
-- policy above (lex_status = 'pending') and not returned by the active
-- version gate query until a later migration clears it.
INSERT INTO public.scan_consent_versions (version, body_markdown, lex_status)
VALUES (
  '231-scan-v1',
  $c1$**Before your scan**

FormaVision guides you through four photos (front, right, back, left) so ViaConnect can track your body composition over time.

This is educational tracking, not a diagnosis and not medical advice. ViaConnect is not your doctor.

Your scan photos are stored privately in your account. If you have a linked practitioner, they can view your scan photos as part of your shared care record, the same way they can already view your other body tracker photos.

You can retake or discard any photo before you finish, and you can delete a scan afterward.

By continuing, you agree to take these photos and allow ViaConnect and your linked practitioner (if any) to view them as part of your body tracking history.$c1$,
  'pending'
)
ON CONFLICT (version) DO NOTHING;

-- -----------------------------------------------------------------------------
-- scan_consent_acks: per-user, per-version acknowledgement.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scan_consent_acks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_version_id uuid NOT NULL REFERENCES public.scan_consent_versions(id),
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, consent_version_id)
);

COMMENT ON TABLE public.scan_consent_acks IS
  'Prompt 231: server-recorded scan consent acknowledgement, one row per user per consent version. UNIQUE(user_id, consent_version_id) is the FK-covering index; no bare user_id index. Recorded via POST /api/scan/consent using the admin client after auth.getUser() confirms the caller (condition 9). Never written from localStorage.';

ALTER TABLE public.scan_consent_acks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scan_consent_acks_select_own ON public.scan_consent_acks;
CREATE POLICY scan_consent_acks_select_own
  ON public.scan_consent_acks
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
DROP POLICY IF EXISTS scan_consent_acks_insert_own ON public.scan_consent_acks;
CREATE POLICY scan_consent_acks_insert_own
  ON public.scan_consent_acks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- =============================================================================
-- Done. scan_consent_versions (Lex-controlled, RLS SELECT on lex_status =
-- cleared, seeded pending) + scan_consent_acks (owner select/insert via
-- (select auth.uid()), UNIQUE(user_id, consent_version_id) as the sole
-- index). One policy per action on each table, no FOR ALL.
-- =============================================================================
