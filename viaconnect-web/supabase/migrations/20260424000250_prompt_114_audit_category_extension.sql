-- =============================================================================
-- Prompt #114 P2b: Extend legal_operations_audit_log.action_category
-- =============================================================================
-- Append-only: add 7 customs-lane values to the CHECK constraint. No existing
-- rows are invalidated because all current rows already use the 12 #104
-- categories. Gate-A locked 2026-04-23 to support P2 recordations + P3 detentions
-- + P3 seizures + P4 IPRS + P5 e-allegations + P5 moiety + P5 counsel reviews.
-- =============================================================================

ALTER TABLE public.legal_operations_audit_log
  DROP CONSTRAINT IF EXISTS legal_operations_audit_log_action_category_check;

ALTER TABLE public.legal_operations_audit_log
  ADD CONSTRAINT legal_operations_audit_log_action_category_check
  CHECK (action_category IN (
    'case', 'evidence', 'counterparty', 'template', 'enforcement_action',
    'dmca', 'marketplace_complaint', 'counsel_engagement', 'privileged_comm',
    'settlement', 'pii_access', 'privileged_access',
    -- Prompt #114 customs lane additions:
    'customs_recordation',
    'customs_detention',
    'customs_seizure',
    'customs_iprs',
    'customs_e_allegation',
    'customs_moiety',
    'customs_counsel_review'
  ));

COMMENT ON CONSTRAINT legal_operations_audit_log_action_category_check
  ON public.legal_operations_audit_log IS
  '#104 categories plus #114 customs lane: customs_recordation / customs_detention / customs_seizure / customs_iprs / customs_e_allegation / customs_moiety / customs_counsel_review.';
