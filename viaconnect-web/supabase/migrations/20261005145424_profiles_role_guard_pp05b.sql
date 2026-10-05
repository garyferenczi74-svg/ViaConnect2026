CREATE OR REPLACE FUNCTION public.profiles_guard_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role_setting text;
  v_effective_role text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS NULL OR NEW.role = 'patient' THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
      RETURN NEW;
    END IF;
  END IF;

  v_role_setting := pg_catalog.current_setting('role', true);
  v_effective_role := CASE
    WHEN v_role_setting IS NULL OR v_role_setting IN ('', 'none')
    THEN session_user::text
    ELSE v_role_setting
  END;

  IF v_effective_role NOT IN (
    'postgres',
    'supabase_admin',
    'supabase_auth_admin',
    'service_role'
  ) THEN
    RAISE EXCEPTION 'PROFILES_ROLE_NOT_SELF_ASSIGNABLE'
      USING ERRCODE = '42501',
            HINT = 'profiles.role can only be changed by service role or a database admin.';
  END IF;

  INSERT INTO public.audit_logs (
    action, table_name, record_id, user_id, old_data, new_data
  ) VALUES (
    'profiles_role_change',
    'profiles',
    NEW.id::text,
    auth.uid(),
    CASE WHEN TG_OP = 'UPDATE'
         THEN pg_catalog.jsonb_build_object('role', OLD.role)
         ELSE NULL END,
    pg_catalog.jsonb_build_object('role', NEW.role, 'via', v_effective_role)
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.profiles_guard_role_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.profiles_guard_role_change() FROM anon, authenticated;

COMMENT ON FUNCTION public.profiles_guard_role_change() IS
  'Blocks non-privileged callers from setting or changing profiles.role. Caller = current_setting(role) when SET ROLE is active, else session_user (NOT current_user). Privileged: postgres, supabase_admin, supabase_auth_admin, service_role. PP-05b.';

DROP TRIGGER IF EXISTS profiles_guard_role_change ON public.profiles;
CREATE TRIGGER profiles_guard_role_change
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_role_change();

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND role IS NOT DISTINCT FROM (
      SELECT p.role FROM public.profiles AS p WHERE p.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND (role IS NULL OR role = 'patient')
  );