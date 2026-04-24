-- =============================================================================
-- Prompt #127 P3: HIPAA Security Rule schema
-- =============================================================================
-- Eight tables that back the HIPAA-specific evidence surface. Workforce
-- members are identified by pseudonyms only (cross-packet HMAC, consistent
-- with #122 P1 pseudonymization). Individual patient data never lands in
-- these tables; patient-level references are aggregate counts only.
--
-- RLS mirrors the #122 patterns: compliance SELECT, admin/compliance
-- UPDATE for lifecycle operations, writes through service-role server
-- paths.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. hipaa_risk_analyses — versioned Risk Analysis documents (§ 164.308(a)(1)(ii)(A))
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hipaa_risk_analyses (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version                 int NOT NULL,
  storage_key             text NOT NULL,
  sha256                  text NOT NULL,
  valid_from              date NOT NULL,
  valid_until             date,
  scope_summary           text NOT NULL,
  methodology_summary     text NOT NULL,
  uploaded_by             uuid NOT NULL REFERENCES auth.users(id),
  approved_by             uuid REFERENCES auth.users(id),
  approved_at             timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version)
);

CREATE INDEX IF NOT EXISTS idx_hipaa_risk_analyses_valid
  ON public.hipaa_risk_analyses (valid_until) WHERE approved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hipaa_risk_analyses_uploaded_by
  ON public.hipaa_risk_analyses (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_hipaa_risk_analyses_approved_by
  ON public.hipaa_risk_analyses (approved_by) WHERE approved_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. hipaa_sanction_policies — § 164.308(a)(1)(ii)(C)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hipaa_sanction_policies (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version             int NOT NULL,
  storage_key         text NOT NULL,
  sha256              text NOT NULL,
  effective_from      date NOT NULL,
  effective_until     date,
  approved_by         uuid REFERENCES auth.users(id),
  approved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version)
);

CREATE INDEX IF NOT EXISTS idx_hipaa_sanction_policies_active
  ON public.hipaa_sanction_policies (effective_until) WHERE approved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hipaa_sanction_policies_approved_by
  ON public.hipaa_sanction_policies (approved_by) WHERE approved_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. hipaa_sanction_actions — individual sanction events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hipaa_sanction_actions (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workforce_member_pseudonym text NOT NULL, -- HMAC pseudonym; raw id never stored
  action_kind                text NOT NULL CHECK (action_kind IN (
                               'verbal_warning','written_warning','retraining',
                               'suspension','termination','other'
                             )),
  triggering_incident_id     uuid REFERENCES public.compliance_incidents(id),
  action_date                date NOT NULL,
  recorded_by                uuid NOT NULL REFERENCES auth.users(id),
  recorded_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hipaa_sanctions_date
  ON public.hipaa_sanction_actions (action_date DESC);
CREATE INDEX IF NOT EXISTS idx_hipaa_sanctions_incident
  ON public.hipaa_sanction_actions (triggering_incident_id)
  WHERE triggering_incident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hipaa_sanctions_recorded_by
  ON public.hipaa_sanction_actions (recorded_by);

-- ---------------------------------------------------------------------------
-- 4. hipaa_workforce_training — § 164.308(a)(5) Security Awareness and Training
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hipaa_workforce_training (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workforce_member_pseudonym text NOT NULL,
  training_module            text NOT NULL,
  completion_date            date NOT NULL,
  expiry_date                date,
  score_percent              int CHECK (score_percent BETWEEN 0 AND 100),
  recorded_by                uuid NOT NULL REFERENCES auth.users(id),
  recorded_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hipaa_training_completion
  ON public.hipaa_workforce_training (completion_date DESC);
CREATE INDEX IF NOT EXISTS idx_hipaa_training_expiry
  ON public.hipaa_workforce_training (expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hipaa_training_member
  ON public.hipaa_workforce_training (workforce_member_pseudonym);
CREATE INDEX IF NOT EXISTS idx_hipaa_training_recorded_by
  ON public.hipaa_workforce_training (recorded_by);

-- ---------------------------------------------------------------------------
-- 5. hipaa_contingency_plan_tests — § 164.308(a)(7)(ii)(D)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hipaa_contingency_plan_tests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_date            date NOT NULL,
  scope                text NOT NULL,
  test_kind            text NOT NULL CHECK (test_kind IN (
                         'data_backup_test','disaster_recovery_test',
                         'emergency_mode_test','full_tabletop_exercise','live_drill'
                       )),
  outcome_summary      text NOT NULL,
  storage_key          text,
  corrective_actions   jsonb,
  recorded_by          uuid NOT NULL REFERENCES auth.users(id),
  recorded_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hipaa_contingency_date
  ON public.hipaa_contingency_plan_tests (test_date DESC);
CREATE INDEX IF NOT EXISTS idx_hipaa_contingency_kind
  ON public.hipaa_contingency_plan_tests (test_kind, test_date DESC);
CREATE INDEX IF NOT EXISTS idx_hipaa_contingency_recorded_by
  ON public.hipaa_contingency_plan_tests (recorded_by);

-- ---------------------------------------------------------------------------
-- 6. hipaa_emergency_access_invocations — § 164.312(a)(2)(ii)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hipaa_emergency_access_invocations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoked_at           timestamptz NOT NULL,
  invoked_by           uuid NOT NULL REFERENCES auth.users(id),
  justification        text NOT NULL,
  scope_of_access      text NOT NULL,
  reviewed_by          uuid REFERENCES auth.users(id),
  reviewed_at          timestamptz,
  closed_at            timestamptz,
  recorded_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hipaa_emergency_invoked
  ON public.hipaa_emergency_access_invocations (invoked_at DESC);
CREATE INDEX IF NOT EXISTS idx_hipaa_emergency_invoked_by
  ON public.hipaa_emergency_access_invocations (invoked_by);
CREATE INDEX IF NOT EXISTS idx_hipaa_emergency_reviewed_by
  ON public.hipaa_emergency_access_invocations (reviewed_by) WHERE reviewed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hipaa_emergency_open
  ON public.hipaa_emergency_access_invocations (invoked_at DESC) WHERE closed_at IS NULL;

-- ---------------------------------------------------------------------------
-- 7. hipaa_device_media_events — § 164.310(d)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hipaa_device_media_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id           text NOT NULL,
  event_kind          text NOT NULL CHECK (event_kind IN (
                        'received','reissued','disposed','sanitized','reused','moved','lost','stolen'
                      )),
  event_date          date NOT NULL,
  responsible_party   uuid REFERENCES auth.users(id),
  method              text,
  notes               text,
  recorded_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hipaa_device_date
  ON public.hipaa_device_media_events (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_hipaa_device_kind
  ON public.hipaa_device_media_events (event_kind, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_hipaa_device_id
  ON public.hipaa_device_media_events (device_id);
CREATE INDEX IF NOT EXISTS idx_hipaa_device_party
  ON public.hipaa_device_media_events (responsible_party) WHERE responsible_party IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 8. hipaa_breach_determinations — § 164.402 4-factor assessment
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hipaa_breach_determinations (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id                 uuid NOT NULL REFERENCES public.compliance_incidents(id),
  assessment_date             date NOT NULL,
  breach_risk_factors         jsonb NOT NULL,
  determination               text NOT NULL CHECK (determination IN (
                                'breach_confirmed','low_probability_of_compromise','not_applicable'
                              )),
  rationale                   text NOT NULL,
  assessed_by                 uuid NOT NULL REFERENCES auth.users(id),
  reviewed_by                 uuid REFERENCES auth.users(id),
  reviewed_at                 timestamptz,
  notification_required       boolean NOT NULL DEFAULT false,
  individuals_affected_count  int,
  notification_sent_at        timestamptz,
  ocr_notification_sent_at    timestamptz,
  media_notification_sent_at  timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hipaa_breach_date
  ON public.hipaa_breach_determinations (assessment_date DESC);
CREATE INDEX IF NOT EXISTS idx_hipaa_breach_incident
  ON public.hipaa_breach_determinations (incident_id);
CREATE INDEX IF NOT EXISTS idx_hipaa_breach_assessed_by
  ON public.hipaa_breach_determinations (assessed_by);
CREATE INDEX IF NOT EXISTS idx_hipaa_breach_reviewed_by
  ON public.hipaa_breach_determinations (reviewed_by) WHERE reviewed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hipaa_breach_confirmed
  ON public.hipaa_breach_determinations (assessment_date DESC) WHERE determination = 'breach_confirmed';

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.hipaa_risk_analyses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hipaa_sanction_policies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hipaa_sanction_actions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hipaa_workforce_training         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hipaa_contingency_plan_tests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hipaa_emergency_access_invocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hipaa_device_media_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hipaa_breach_determinations      ENABLE ROW LEVEL SECURITY;

-- Helper: is_hipaa_admin — compliance officer, compliance admin, admin, or superadmin
CREATE OR REPLACE FUNCTION public.is_hipaa_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','superadmin','compliance_admin','compliance_officer')
  );
$$;

COMMENT ON FUNCTION public.is_hipaa_admin() IS
  'Prompt #127 P3: gate for HIPAA evidence writes + reads. Mirrors is_compliance_reader() role set but distinguishes in audit logs.';

-- Read policies
DROP POLICY IF EXISTS hipaa_risk_analyses_read ON public.hipaa_risk_analyses;
CREATE POLICY hipaa_risk_analyses_read ON public.hipaa_risk_analyses
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

DROP POLICY IF EXISTS hipaa_sanction_policies_read ON public.hipaa_sanction_policies;
CREATE POLICY hipaa_sanction_policies_read ON public.hipaa_sanction_policies
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

DROP POLICY IF EXISTS hipaa_sanction_actions_read ON public.hipaa_sanction_actions;
CREATE POLICY hipaa_sanction_actions_read ON public.hipaa_sanction_actions
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

DROP POLICY IF EXISTS hipaa_training_read ON public.hipaa_workforce_training;
CREATE POLICY hipaa_training_read ON public.hipaa_workforce_training
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

DROP POLICY IF EXISTS hipaa_contingency_read ON public.hipaa_contingency_plan_tests;
CREATE POLICY hipaa_contingency_read ON public.hipaa_contingency_plan_tests
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

DROP POLICY IF EXISTS hipaa_emergency_read ON public.hipaa_emergency_access_invocations;
CREATE POLICY hipaa_emergency_read ON public.hipaa_emergency_access_invocations
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

DROP POLICY IF EXISTS hipaa_device_read ON public.hipaa_device_media_events;
CREATE POLICY hipaa_device_read ON public.hipaa_device_media_events
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

DROP POLICY IF EXISTS hipaa_breach_read ON public.hipaa_breach_determinations;
CREATE POLICY hipaa_breach_read ON public.hipaa_breach_determinations
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

-- Write / update policies (admin role set)
DROP POLICY IF EXISTS hipaa_risk_analyses_write ON public.hipaa_risk_analyses;
CREATE POLICY hipaa_risk_analyses_write ON public.hipaa_risk_analyses
  FOR ALL TO authenticated
  USING (public.is_hipaa_admin()) WITH CHECK (public.is_hipaa_admin());

DROP POLICY IF EXISTS hipaa_sanction_policies_write ON public.hipaa_sanction_policies;
CREATE POLICY hipaa_sanction_policies_write ON public.hipaa_sanction_policies
  FOR ALL TO authenticated
  USING (public.is_hipaa_admin()) WITH CHECK (public.is_hipaa_admin());

DROP POLICY IF EXISTS hipaa_sanction_actions_insert ON public.hipaa_sanction_actions;
CREATE POLICY hipaa_sanction_actions_insert ON public.hipaa_sanction_actions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hipaa_admin() AND recorded_by = auth.uid());

DROP POLICY IF EXISTS hipaa_training_insert ON public.hipaa_workforce_training;
CREATE POLICY hipaa_training_insert ON public.hipaa_workforce_training
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hipaa_admin() AND recorded_by = auth.uid());

DROP POLICY IF EXISTS hipaa_contingency_insert ON public.hipaa_contingency_plan_tests;
CREATE POLICY hipaa_contingency_insert ON public.hipaa_contingency_plan_tests
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hipaa_admin() AND recorded_by = auth.uid());

DROP POLICY IF EXISTS hipaa_emergency_insert ON public.hipaa_emergency_access_invocations;
CREATE POLICY hipaa_emergency_insert ON public.hipaa_emergency_access_invocations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hipaa_admin() AND invoked_by = auth.uid());

DROP POLICY IF EXISTS hipaa_emergency_review_update ON public.hipaa_emergency_access_invocations;
CREATE POLICY hipaa_emergency_review_update ON public.hipaa_emergency_access_invocations
  FOR UPDATE TO authenticated
  USING (public.is_hipaa_admin()) WITH CHECK (public.is_hipaa_admin());

DROP POLICY IF EXISTS hipaa_device_insert ON public.hipaa_device_media_events;
CREATE POLICY hipaa_device_insert ON public.hipaa_device_media_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hipaa_admin());

DROP POLICY IF EXISTS hipaa_breach_insert ON public.hipaa_breach_determinations;
CREATE POLICY hipaa_breach_insert ON public.hipaa_breach_determinations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hipaa_admin() AND assessed_by = auth.uid());

DROP POLICY IF EXISTS hipaa_breach_review_update ON public.hipaa_breach_determinations;
CREATE POLICY hipaa_breach_review_update ON public.hipaa_breach_determinations
  FOR UPDATE TO authenticated
  USING (public.is_hipaa_admin()) WITH CHECK (public.is_hipaa_admin());
