-- =============================================================================
-- Encryption slice 1 (Gary 2026-10-03). NOT APPLIED by this change.
-- Apply only after Gary approves. Do not run this file against production
-- from the app, CI, or an agent session.
--
-- Apply order: this file FIRST, then
--   20261003120100_vip_sensitive_note_search_path.sql
-- The two files do not depend on each other. Filename order is the order.
--
-- What this file does
-- 1. Stores one naturopath credential on the practitioner account
--    (public.practitioners.user_id): licence type, jurisdiction, licence
--    number, verification_status default 'unverified'.
-- 2. Widens profiles_role_check so the literal 'naturopath' can be stored.
--    Every role allowed by 20260423000010_legal_role_extensions.sql is kept,
--    so rows that pass today's constraint still pass. 'consumer',
--    'board_member', and 'exec_reporting_admin' are not added.
-- 3. Blocks a signed-in account from giving itself role 'naturopath'.
--    "Users can update own profile" (repo policy snapshot) allows an
--    owner to update their own profiles row. Existing route checks treat
--    profiles.role = 'naturopath' as access to /naturopath/*. Letting the
--    owner set that role would open the portal on apply. postgres,
--    supabase_admin, supabase_auth_admin, service_role, and a caller whose
--    profiles.role is admin may set it.
--
-- Gary 2026-10-03: naturopath is not a separate account role. It is a
-- credential. The role literal stays only so existing writers and
-- prescription_issue / session-role checks stop hitting a check violation
-- when an admin or service role stores it. Portal opening for a
-- practitioner credential is an app flag, default off, and requires
-- verification_status = 'verified'.
--
-- Store support: Apple App Store Review Guidelines 5.1.1 (permission) and
-- 5.1.3 (health data), and Google Play User Data / Data safety. Recording
-- a licence and keeping verification at unverified stops an unverified
-- self-declaration from being treated as naturopath access. This file does
-- not change lab, genetics, note, or photo policies.
--
-- Licence type values match naturopath_profiles.license_type in
-- 20260407000060_protocol_sharing.sql (ND, NMD, RHN, CNP, other).
-- practitioners.credential_type (nd, dc, lac, ...) is a different column
-- and is not copied here.
--
-- Audit: credential inserts, updates, and deletes write public.audit_logs
-- (action, table_name, record_id, user_id, old_data, new_data). The
-- licence number is not copied into the audit payload. A transition that
-- sets profiles.role to naturopath writes one audit row. This trigger
-- assumes those audit_logs columns exist (they are in
-- src/lib/supabase/types.ts). That was not re-checked on the live database
-- for this file.
--
-- Rollback (do not run as part of apply). If any profiles.role is
-- 'naturopath', restoring the old check fails until those rows are moved
-- off that role. Moving them is a data change and needs Gary's approval.
--
--   DROP TRIGGER IF EXISTS practitioner_naturopath_credentials_guard
--     ON public.practitioner_naturopath_credentials;
--   DROP FUNCTION IF EXISTS public.practitioner_naturopath_credentials_guard();
--   DROP TABLE IF EXISTS public.practitioner_naturopath_credentials;
--   DROP TRIGGER IF EXISTS profiles_block_self_assign_naturopath_role
--     ON public.profiles;
--   DROP FUNCTION IF EXISTS public.profiles_block_self_assign_naturopath_role();
--   ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
--   ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
--     CHECK (role = ANY (ARRAY[
--       'patient','practitioner','admin','compliance_officer',
--       'legal_ops','cfo','ceo','medical_director'
--     ]));
-- =============================================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY[
    'patient',
    'practitioner',
    'admin',
    'compliance_officer',
    'legal_ops',
    'cfo',
    'ceo',
    'medical_director',
    'naturopath'
  ])) NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_role_check;

COMMENT ON CONSTRAINT profiles_role_check ON public.profiles IS
  'Roles kept from 20260423000010, plus naturopath so an admin or service role can store the literal existing app checks already read. Naturopath product access is the practitioner_naturopath_credentials row, not this role. Account owners cannot self-assign naturopath (profiles_block_self_assign_naturopath_role).';

CREATE OR REPLACE FUNCTION public.profiles_block_self_assign_naturopath_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role text;
BEGIN
  IF NEW.role IS DISTINCT FROM 'naturopath' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.role = 'naturopath' THEN
    RETURN NEW;
  END IF;

  IF current_user IN (
    'postgres',
    'supabase_admin',
    'supabase_auth_admin',
    'service_role'
  ) THEN
    -- privileged path continues to the audit insert below
    NULL;
  ELSE
    SELECT p.role INTO v_caller_role
    FROM public.profiles AS p
    WHERE p.id = auth.uid();

    IF v_caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'NATUROPATH_ROLE_NOT_SELF_ASSIGNABLE'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.audit_logs (
    action, table_name, record_id, user_id, old_data, new_data
  ) VALUES (
    'set_role_naturopath',
    'profiles',
    NEW.id,
    auth.uid(),
    CASE
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('role', OLD.role)
      ELSE NULL
    END,
    jsonb_build_object('role', 'naturopath')
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.profiles_block_self_assign_naturopath_role()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.profiles_block_self_assign_naturopath_role()
  FROM anon, authenticated;

DROP TRIGGER IF EXISTS profiles_block_self_assign_naturopath_role
  ON public.profiles;
CREATE TRIGGER profiles_block_self_assign_naturopath_role
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_block_self_assign_naturopath_role();

CREATE TABLE IF NOT EXISTS public.practitioner_naturopath_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_user_id uuid NOT NULL
    REFERENCES public.practitioners (user_id) ON DELETE CASCADE,
  licence_type text NOT NULL
    CHECK (licence_type IN ('ND', 'NMD', 'RHN', 'CNP', 'other')),
  jurisdiction text NOT NULL,
  licence_number text NOT NULL,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN (
      'unverified', 'pending', 'verified', 'rejected', 'expired'
    )),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT practitioner_naturopath_credentials_user_key
    UNIQUE (practitioner_user_id)
);

COMMENT ON TABLE public.practitioner_naturopath_credentials IS
  'Naturopath credential on a practitioner account (Gary 2026-10-03). One row per practitioners.user_id. verification_status defaults to unverified. Does not grant lab, genetics, note, or photo access.';

COMMENT ON COLUMN public.practitioner_naturopath_credentials.verification_status IS
  'Defaults to unverified. The account owner cannot set this to verified. Apple 5.1.1 / 5.1.3 and Play User Data: portal opening waits on verification plus the app flag NATUROPATH_CREDENTIAL_PORTAL_ACCESS (default off).';

CREATE INDEX IF NOT EXISTS idx_practitioner_naturopath_credentials_status
  ON public.practitioner_naturopath_credentials (verification_status);

ALTER TABLE public.practitioner_naturopath_credentials ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.practitioner_naturopath_credentials FROM PUBLIC;
REVOKE ALL ON TABLE public.practitioner_naturopath_credentials FROM anon;
REVOKE ALL ON TABLE public.practitioner_naturopath_credentials FROM authenticated;
GRANT SELECT, INSERT, UPDATE
  ON TABLE public.practitioner_naturopath_credentials TO authenticated;
GRANT ALL
  ON TABLE public.practitioner_naturopath_credentials TO service_role;

DROP POLICY IF EXISTS practitioner_naturopath_credentials_select_own
  ON public.practitioner_naturopath_credentials;
CREATE POLICY practitioner_naturopath_credentials_select_own
  ON public.practitioner_naturopath_credentials
  FOR SELECT
  TO authenticated
  USING (practitioner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS practitioner_naturopath_credentials_insert_own
  ON public.practitioner_naturopath_credentials;
CREATE POLICY practitioner_naturopath_credentials_insert_own
  ON public.practitioner_naturopath_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    practitioner_user_id = (SELECT auth.uid())
    AND verification_status = 'unverified'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'practitioner'
    )
  );

DROP POLICY IF EXISTS practitioner_naturopath_credentials_update_own
  ON public.practitioner_naturopath_credentials;
CREATE POLICY practitioner_naturopath_credentials_update_own
  ON public.practitioner_naturopath_credentials
  FOR UPDATE
  TO authenticated
  USING (practitioner_user_id = (SELECT auth.uid()))
  WITH CHECK (practitioner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS practitioner_naturopath_credentials_admin_all
  ON public.practitioner_naturopath_credentials;
CREATE POLICY practitioner_naturopath_credentials_admin_all
  ON public.practitioner_naturopath_credentials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.practitioner_naturopath_credentials_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
  v_privileged boolean;
  v_row_id uuid;
BEGIN
  v_privileged := current_user IN (
    'postgres',
    'supabase_admin',
    'supabase_auth_admin',
    'service_role'
  );

  IF auth.uid() IS NOT NULL THEN
    SELECT p.role INTO v_role
    FROM public.profiles AS p
    WHERE p.id = auth.uid();
  END IF;

  IF v_role = 'admin' THEN
    v_privileged := true;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF NOT v_privileged THEN
      RAISE EXCEPTION 'NATUROPATH_CREDENTIAL_DELETE_FORBIDDEN'
        USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.audit_logs (
      action, table_name, record_id, user_id, old_data, new_data
    ) VALUES (
      'delete',
      'practitioner_naturopath_credentials',
      OLD.id,
      auth.uid(),
      jsonb_build_object(
        'licence_type', OLD.licence_type,
        'jurisdiction', OLD.jurisdiction,
        'verification_status', OLD.verification_status,
        'licence_number_present', OLD.licence_number IS NOT NULL
      ),
      NULL
    );
    RETURN OLD;
  END IF;

  IF NEW.id IS NULL THEN
    NEW.id := pg_catalog.gen_random_uuid();
  END IF;
  v_row_id := NEW.id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.verification_status IS NULL THEN
      NEW.verification_status := 'unverified';
    END IF;
    IF NOT v_privileged THEN
      IF v_role IS DISTINCT FROM 'practitioner' THEN
        RAISE EXCEPTION 'NATUROPATH_CREDENTIAL_REQUIRES_PRACTITIONER_ROLE'
          USING ERRCODE = '42501';
      END IF;
      IF NEW.practitioner_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'NATUROPATH_CREDENTIAL_OWNER_MISMATCH'
          USING ERRCODE = '42501';
      END IF;
      IF NEW.verification_status IS DISTINCT FROM 'unverified' THEN
        RAISE EXCEPTION 'NATUROPATH_CREDENTIAL_VERIFICATION_NOT_SELF_SERVE'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT v_privileged THEN
      IF NEW.practitioner_user_id IS DISTINCT FROM OLD.practitioner_user_id
         OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
         OR NEW.practitioner_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'NATUROPATH_CREDENTIAL_VERIFICATION_NOT_SELF_SERVE'
          USING ERRCODE = '42501';
      END IF;
    END IF;
    NEW.updated_at := pg_catalog.now();
  END IF;

  INSERT INTO public.audit_logs (
    action, table_name, record_id, user_id, old_data, new_data
  ) VALUES (
    lower(TG_OP),
    'practitioner_naturopath_credentials',
    v_row_id,
    auth.uid(),
    CASE
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
        'licence_type', OLD.licence_type,
        'jurisdiction', OLD.jurisdiction,
        'verification_status', OLD.verification_status,
        'licence_number_present', OLD.licence_number IS NOT NULL
      )
      ELSE NULL
    END,
    jsonb_build_object(
      'licence_type', NEW.licence_type,
      'jurisdiction', NEW.jurisdiction,
      'verification_status', NEW.verification_status,
      'licence_number_present', NEW.licence_number IS NOT NULL
    )
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.practitioner_naturopath_credentials_guard()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.practitioner_naturopath_credentials_guard()
  FROM anon, authenticated;

DROP TRIGGER IF EXISTS practitioner_naturopath_credentials_guard
  ON public.practitioner_naturopath_credentials;
CREATE TRIGGER practitioner_naturopath_credentials_guard
  BEFORE INSERT OR UPDATE OR DELETE
  ON public.practitioner_naturopath_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.practitioner_naturopath_credentials_guard();
