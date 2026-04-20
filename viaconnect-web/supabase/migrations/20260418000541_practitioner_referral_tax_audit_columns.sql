-- =============================================================================
-- Prompt #98 Phase 7 (post-Jeffery review): tax audit actor columns
-- =============================================================================
-- Jeffery flagged an audit-trail gap on the admin tax PATCH endpoint:
-- W-9 collection and 1099 generation mutations did not record the
-- admin actor. Tax documentation is a compliance-grade record, so
-- every state change must be attributable.
--
-- Adds two nullable user references. Older rows remain readable; new
-- admin writes populate the appropriate column.
-- =============================================================================

ALTER TABLE public.practitioner_referral_tax_earnings
  ADD COLUMN IF NOT EXISTS w9_collected_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS form_1099_generated_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN public.practitioner_referral_tax_earnings.w9_collected_by IS
  'Admin user who recorded the W-9 as on-file. Null for pre-audit-column rows.';
COMMENT ON COLUMN public.practitioner_referral_tax_earnings.form_1099_generated_by IS
  'Admin user who marked the 1099 as generated. Null for pre-audit-column rows.';
