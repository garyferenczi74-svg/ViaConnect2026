-- =============================================================================
-- Prompt #96 Audit remediation: Jeffery + Michelangelo audit response
-- =============================================================================
-- Append-only. Five additive corrections discovered after Phase 7 closeout:
--
--   1. Add stripe_refund_id column on production orders so cancellation can
--      record the Stripe refund identifier and survive partial failures.
--   2. Add parent_design_id FK constraint to white_label_label_designs (the
--      parent reference column existed since Phase 1 but lacked a constraint
--      so a corrupted row could point to a non-existent ancestor).
--   3. Recreate wl_pending_reviews_with_sla to filter out reviewer
--      assignments tied to demoted (is_current_version=false) label
--      versions. Without the filter, stale assignments from prior
--      versions appear in the inbox.
--   4. Tighten dispensary RLS: a published dispensary item is readable
--      only by an authenticated user with an active practitioner_patients
--      relationship to that practitioner, OR by an admin. Drops the
--      open-to-any-authenticated policy from _480 which let any user
--      enumerate published products across all practitioners.
--   5. Reaffirm compliance review immutability via a comment on the
--      trigger function: triggers fire on every table operation
--      regardless of caller (including SECURITY DEFINER RPCs), so the
--      block-mutation trigger is sufficient. Auditors flagged a
--      perceived bypass; the comment makes the guarantee explicit.
-- =============================================================================

-- 1. stripe_refund_id on production orders
ALTER TABLE public.white_label_production_orders
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS refund_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS refund_recorded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.white_label_production_orders.stripe_refund_id IS
  'Stripe refund object id when a deposit refund was issued during cancellation. Used as the idempotency anchor on retry.';

-- 2. parent_design_id FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'wl_label_designs_parent_design_id_fkey'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.white_label_label_designs
      ADD CONSTRAINT wl_label_designs_parent_design_id_fkey
      FOREIGN KEY (parent_design_id) REFERENCES public.white_label_label_designs(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Recreate the inbox view filtered by is_current_version
DROP VIEW IF EXISTS public.wl_pending_reviews_with_sla;
CREATE VIEW public.wl_pending_reviews_with_sla AS
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
  AND ld.is_current_version = true
ORDER BY ra.assigned_at ASC;

COMMENT ON VIEW public.wl_pending_reviews_with_sla IS
  'Inbox source: pending assignments for the current version of each label only. Stale assignments tied to revised-away versions are filtered. Same SLA buckets as the pure classifyReviewSla helper (36h reminder, 48h escalation).';

-- 4. Tighten dispensary RLS
DROP POLICY IF EXISTS wl_disp_published_read ON public.white_label_dispensary_settings;
CREATE POLICY wl_disp_published_read
  ON public.white_label_dispensary_settings FOR SELECT TO authenticated
  USING (
    is_published = true
    AND (
      -- caller is a patient of this practitioner
      EXISTS (
        SELECT 1
          FROM public.practitioner_patients pp
         WHERE pp.practitioner_id = white_label_dispensary_settings.practitioner_id
           AND pp.patient_user_id = auth.uid()
           AND pp.status = 'active'
      )
      -- OR caller is an admin
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

COMMENT ON POLICY wl_disp_published_read ON public.white_label_dispensary_settings IS
  'Dispensary published items are readable only by active patients of the practitioner or by admins. Replaces the broader policy from _480 which let any authenticated user enumerate published products across all practitioners.';

-- 5. Re-affirm compliance review immutability
COMMENT ON FUNCTION public.block_compliance_review_mutation IS
  'Immutability enforcer for white_label_compliance_reviews. Triggers fire on every UPDATE / DELETE on the table regardless of the caller; SECURITY DEFINER RPCs are NOT a bypass. To support legitimate retraction in the future, ADD a new review row recording the retraction rather than mutating the original. Do not modify or drop this trigger.';
