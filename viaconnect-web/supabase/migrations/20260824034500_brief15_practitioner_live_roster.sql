-- Brief 15: live practitioner roster.
-- practitioner_patients LEFT JOIN profiles, scoped to auth.uid().
-- SECURITY DEFINER so the clinician can read the joined full_name for
-- their own relationships only. Invited rows with a null patient_id
-- still return; full_name is null and the app uses invited_* fields.
-- Append-only. Does not edit prior migrations.

CREATE OR REPLACE FUNCTION practitioner_list_live_roster()
RETURNS TABLE (
  relationship_id     UUID,
  patient_id          UUID,
  status              TEXT,
  invited_email       TEXT,
  invited_first_name  TEXT,
  invited_last_name   TEXT,
  first_visit_date    DATE,
  invited_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ,
  chief_complaint     TEXT,
  tags                TEXT[],
  full_name           TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'practitioner_list_live_roster: not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    pp.id,
    pp.patient_id,
    pp.status,
    pp.invited_email,
    pp.invited_first_name,
    pp.invited_last_name,
    pp.first_visit_date,
    pp.invited_at,
    pp.updated_at,
    pp.chief_complaint,
    pp.tags,
    p.full_name
  FROM practitioner_patients pp
  LEFT JOIN profiles p ON p.id = pp.patient_id
  WHERE pp.practitioner_id = v_user_id
    AND pp.status IN ('active', 'invited')
  ORDER BY pp.updated_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION practitioner_list_live_roster() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION practitioner_list_live_roster() TO authenticated;
