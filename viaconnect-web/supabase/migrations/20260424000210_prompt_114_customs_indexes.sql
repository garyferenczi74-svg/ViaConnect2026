-- =============================================================================
-- Prompt #114 P1: Customs — indexes
-- =============================================================================
-- Per performance-advisor (2026-04-23):
--   - Partial indexes for dashboard tile queries (active recordations,
--     open detentions, seizures YTD, IPRS review queue, moiety pipeline).
--   - Covering/INCLUDE indexes where the sum column is the only non-key.
--   - pg_trgm GIN prefilter for IPRS Levenshtein dedup (avoids O(N×M) blow-up).
--   - FK-covering indexes on all 4 customs_*.case_id FKs + other child FKs,
--     pre-committed to prevent advisor residual logging.
--
-- Non-CONCURRENT is safe here because every customs_* table is NEW and
-- empty at migration apply time. The one index that WOULD need
-- CONCURRENTLY (on populated legal_investigation_cases) is deferred to
-- 20260424000240_prompt_114_has_customs_activity.sql along with its
-- column add.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Dashboard tile Q1: recordations active + nearest expiration
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_customs_recordations_active_expiration
  ON public.customs_recordations (cbp_expiration_date)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_customs_recordations_status
  ON public.customs_recordations (status);

-- ---------------------------------------------------------------------------
-- Dashboard tile Q2: detentions awaiting response (BD countdown)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_customs_detentions_open_deadline
  ON public.customs_detentions (response_deadline_date)
  WHERE status IN ('notice_received', 'response_required');

CREATE INDEX IF NOT EXISTS idx_customs_detentions_30day_deadline
  ON public.customs_detentions (detention_30day_deadline_date)
  WHERE status <> 'closed_released';

-- ---------------------------------------------------------------------------
-- Dashboard tile Q3: seizures YTD + aggregate MSRP intercepted
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_customs_seizures_seized_at_desc
  ON public.customs_seizures (seized_at DESC);

CREATE INDEX IF NOT EXISTS idx_customs_detentions_escalated_value
  ON public.customs_detentions (updated_at)
  INCLUDE (msrp_genuine_value_cents)
  WHERE status = 'escalated_seizure';

-- ---------------------------------------------------------------------------
-- Dashboard tile Q4: IPRS review queue
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_customs_iprs_requires_review
  ON public.customs_iprs_scan_results (scanned_at DESC)
  WHERE status = 'requires_review';

CREATE INDEX IF NOT EXISTS idx_customs_iprs_content_hash
  ON public.customs_iprs_scan_results (content_hash)
  WHERE content_hash IS NOT NULL;

-- pg_trgm GIN prefilter for Levenshtein dedup (performance-advisor critical path)
CREATE INDEX IF NOT EXISTS idx_customs_iprs_listing_title_trgm
  ON public.customs_iprs_scan_results
  USING GIN (listing_title_normalized gin_trgm_ops)
  WHERE listing_title_normalized IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Dashboard tile Q5: moiety claim forecast
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_customs_moiety_pipeline_value
  ON public.customs_moiety_claims (status)
  INCLUDE (estimated_net_recovery_cents)
  WHERE status IN ('forecast', 'filed');

-- ---------------------------------------------------------------------------
-- Dashboard tile Q6: fee ledger YTD
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_customs_fee_ledger_posted_at
  ON public.customs_fee_ledger (posted_at)
  INCLUDE (amount_cents);

-- ---------------------------------------------------------------------------
-- FK-covering indexes — pre-commit to avoid autoheal residuals
-- (performance-advisor: 4 case_id FKs + all child-of-customs FKs)
-- ---------------------------------------------------------------------------

-- case_id FKs → legal_investigation_cases
CREATE INDEX IF NOT EXISTS idx_customs_detentions_case_id
  ON public.customs_detentions (case_id)
  WHERE case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customs_seizures_case_id
  ON public.customs_seizures (case_id)
  WHERE case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customs_iprs_case_id
  ON public.customs_iprs_scan_results (case_id)
  WHERE case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customs_e_allegations_case_id
  ON public.customs_e_allegations (case_id)
  WHERE case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customs_counsel_reviews_case_id
  ON public.customs_counsel_reviews (case_id)
  WHERE case_id IS NOT NULL;

-- Child FKs within customs_*
CREATE INDEX IF NOT EXISTS idx_customs_recordation_classes_recordation_id
  ON public.customs_recordation_classes (recordation_id);

CREATE INDEX IF NOT EXISTS idx_customs_detention_images_detention_id
  ON public.customs_detention_images (detention_id);

CREATE INDEX IF NOT EXISTS idx_customs_seizures_detention_id
  ON public.customs_seizures (detention_id)
  WHERE detention_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customs_fines_imposed_seizure_id
  ON public.customs_fines_imposed (seizure_id)
  WHERE seizure_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customs_moiety_claims_e_allegation_id
  ON public.customs_moiety_claims (e_allegation_id)
  WHERE e_allegation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customs_authentication_guides_recordation_id
  ON public.customs_authentication_guides (recordation_id);

CREATE INDEX IF NOT EXISTS idx_customs_guide_sections_guide_id
  ON public.customs_guide_sections (guide_id);

CREATE INDEX IF NOT EXISTS idx_customs_detentions_recordation_id
  ON public.customs_detentions (recordation_id)
  WHERE recordation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customs_iprs_recordation_id
  ON public.customs_iprs_scan_results (recordation_id)
  WHERE recordation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customs_fee_ledger_recordation_id
  ON public.customs_fee_ledger (recordation_id)
  WHERE recordation_id IS NOT NULL;

-- Counsel reviews → target row (polymorphic lookup)
CREATE INDEX IF NOT EXISTS idx_customs_counsel_reviews_target
  ON public.customs_counsel_reviews (target_table, target_row_id);

-- SHA-256 integrity verifier lookup (scheduled job in #240)
CREATE INDEX IF NOT EXISTS idx_customs_detention_images_verify_queue
  ON public.customs_detention_images (last_integrity_verified_at NULLS FIRST);

-- =============================================================================
-- End of 20260424000210_prompt_114_customs_indexes.sql
-- =============================================================================
