-- =============================================================================
-- Prompt #96 Phase 4: Compliance reviewer assignments + role registry
-- =============================================================================
-- Append-only. Three pieces:
--   1. white_label_compliance_reviewer_roles: which admin user holds which
--      compliance reviewer role (compliance_officer = Steve, medical_director
--      = Fadi). Two-column lookup; admin-only.
--   2. white_label_reviewer_assignments: per-(label_design, reviewer_role)
--      open assignment row. INSERT-on-submit; DELETE-on-decision (the
--      durable history is in white_label_compliance_reviews from Phase 1).
--   3. wl_pending_reviews_with_sla: helper view summarising the inbox
--      with the elapsed hours since assignment so the front end can show
--      reminder/escalation labels.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.white_label_compliance_reviewer_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('compliance_officer', 'medical_director')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, reviewer_role)
);

COMMENT ON TABLE public.white_label_compliance_reviewer_roles IS
  'Which admin holds which compliance reviewer role. Multiple admins per role allowed (back-up coverage); the inbox lists every assignment for every active holder.';

CREATE INDEX IF NOT EXISTS idx_wl_reviewer_roles_active
  ON public.white_label_compliance_reviewer_roles(reviewer_role)
  WHERE is_active = true;

ALTER TABLE public.white_label_compliance_reviewer_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wl_reviewer_roles_admin_all ON public.white_label_compliance_reviewer_roles;
CREATE POLICY wl_reviewer_roles_admin_all
  ON public.white_label_compliance_reviewer_roles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 2. Reviewer assignments (working set)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.white_label_reviewer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_design_id UUID NOT NULL REFERENCES public.white_label_label_designs(id) ON DELETE CASCADE,
  reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('compliance_officer', 'medical_director')),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'recused')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completed_by_user_id UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (label_design_id, reviewer_role)
);

COMMENT ON TABLE public.white_label_reviewer_assignments IS
  'Per-(label_design, role) row created on submit. Status flips to completed when the reviewer logs a decision. Permanent history lives in white_label_compliance_reviews.';

CREATE INDEX IF NOT EXISTS idx_wl_reviewer_assign_pending
  ON public.white_label_reviewer_assignments(reviewer_role, assigned_at)
  WHERE status = 'pending';

ALTER TABLE public.white_label_reviewer_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wl_reviewer_assign_admin_all ON public.white_label_reviewer_assignments;
CREATE POLICY wl_reviewer_assign_admin_all
  ON public.white_label_reviewer_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Practitioner can read assignment rows for their own labels (read-only).
DROP POLICY IF EXISTS wl_reviewer_assign_practitioner_read ON public.white_label_reviewer_assignments;
CREATE POLICY wl_reviewer_assign_practitioner_read
  ON public.white_label_reviewer_assignments FOR SELECT TO authenticated
  USING (
    label_design_id IN (
      SELECT id FROM public.white_label_label_designs
       WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 3. SLA-decorated pending-reviews view
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.wl_pending_reviews_with_sla AS
SELECT
  ra.id              AS assignment_id,
  ra.label_design_id,
  ra.reviewer_role,
  ra.assigned_at,
  EXTRACT(EPOCH FROM (NOW() - ra.assigned_at)) / 3600 AS hours_pending,
  CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - ra.assigned_at)) / 3600 >= 48 THEN 'escalation_due'
    WHEN EXTRACT(EPOCH FROM (NOW() - ra.assigned_at)) / 3600 >= 36 THEN 'reminder_due'
    ELSE 'on_time'
  END                AS sla_status,
  ld.practitioner_id,
  ld.display_product_name,
  ld.version_number,
  ld.status          AS label_status
FROM public.white_label_reviewer_assignments ra
JOIN public.white_label_label_designs ld ON ld.id = ra.label_design_id
WHERE ra.status = 'pending'
ORDER BY ra.assigned_at ASC;

COMMENT ON VIEW public.wl_pending_reviews_with_sla IS
  'Inbox source: pending reviewer assignments with elapsed hours and SLA bucket. Powered by the same thresholds as the pure classifyReviewSla helper (36h reminder, 48h escalation).';
