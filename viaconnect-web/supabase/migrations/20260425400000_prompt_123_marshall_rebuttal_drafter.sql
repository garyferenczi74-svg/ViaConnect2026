-- =============================================================================
-- Prompt #123: Marshall Automated Rebuttal Drafter (APPEND-ONLY)
-- =============================================================================
-- Six tables backing the appeal analyzer + drafter + decision queue:
--   appeal_analyses             one analyzer output per appeal
--   rebuttal_templates          versioned, jurisdiction-aware templates
--   appeal_drafts               versioned drafts per appeal
--   appeal_decisions            Steve's final decisions with audit trail
--   appeal_patterns             pattern-detector output (per/cross-practitioner)
--   appeal_agreement_rollups    daily agreement-rate rollups per tuple
--
-- All decision authority stays with Steve Rica; no auto-send. Server-enforced
-- dual-approval for termination-adjacent recommendations.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.appeal_analyses (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id                uuid NOT NULL UNIQUE REFERENCES public.practitioner_notice_appeals(id) ON DELETE CASCADE,
  claim_type               text NOT NULL,
  sub_claim_type           text NOT NULL CHECK (sub_claim_type IN (
                             'identity_mismatch','policy_disagreement','evidence_insufficient',
                             'already_cured','context_missing','good_faith_misinterpretation',
                             'procedural_objection','other')),
  recommendation           text NOT NULL CHECK (recommendation IN (
                             'uphold','reverse','partial','request_more_info','manual_review','escalate')),
  confidence               numeric(3,2) NOT NULL CHECK (confidence >= 0.00 AND confidence <= 1.00),
  rationale                jsonb NOT NULL,
  drift_report             jsonb NOT NULL,
  pattern_report           jsonb,
  suggested_template_id    uuid,
  requires_dual_approval   boolean NOT NULL DEFAULT false,
  dual_approvers           text[],
  analyzer_version         text NOT NULL,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appeal_analyses_appeal ON public.appeal_analyses(appeal_id);
CREATE INDEX IF NOT EXISTS idx_appeal_analyses_recommendation ON public.appeal_analyses(recommendation);

CREATE TABLE IF NOT EXISTS public.rebuttal_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code   text NOT NULL,
  disposition     text NOT NULL CHECK (disposition IN (
                    'uphold','reverse','partial','request_more_info','escalation_notice')),
  claim_type      text NOT NULL,
  jurisdiction    text NOT NULL CHECK (jurisdiction IN ('US','CA','EU','UK','AU','generic')),
  language        text NOT NULL DEFAULT 'en-US',
  version         int NOT NULL,
  body            text NOT NULL,
  required_slots  text[] NOT NULL,
  active          boolean NOT NULL DEFAULT true,
  approved_by     uuid REFERENCES auth.users(id),
  approved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_code, version)
);

CREATE INDEX IF NOT EXISTS idx_rebuttal_templates_active
  ON public.rebuttal_templates(template_code, jurisdiction, language)
  WHERE active = true;

CREATE TABLE IF NOT EXISTS public.appeal_drafts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id             uuid NOT NULL REFERENCES public.practitioner_notice_appeals(id) ON DELETE CASCADE,
  analysis_id           uuid NOT NULL REFERENCES public.appeal_analyses(id),
  template_id           uuid NOT NULL REFERENCES public.rebuttal_templates(id),
  template_version      int NOT NULL,
  version               int NOT NULL DEFAULT 1,
  draft_text            text NOT NULL,
  augmentation_used     boolean NOT NULL DEFAULT false,
  self_check_passed     boolean NOT NULL,
  self_check_findings   jsonb,
  generated_at          timestamptz NOT NULL DEFAULT now(),
  generated_by          text NOT NULL,
  superseded_by         uuid REFERENCES public.appeal_drafts(id),
  UNIQUE (appeal_id, version)
);

CREATE INDEX IF NOT EXISTS idx_appeal_drafts_appeal
  ON public.appeal_drafts(appeal_id, version DESC);

CREATE TABLE IF NOT EXISTS public.appeal_decisions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id                   uuid NOT NULL UNIQUE REFERENCES public.practitioner_notice_appeals(id) ON DELETE CASCADE,
  analysis_id                 uuid NOT NULL REFERENCES public.appeal_analyses(id),
  final_draft_id              uuid REFERENCES public.appeal_drafts(id),
  decision_kind               text NOT NULL CHECK (decision_kind IN (
                                'approved_as_drafted','modified','reviewed_manually',
                                'requested_more_info','escalated')),
  modification_reason_code    text CHECK (modification_reason_code IN (
                                'marshall_missed_key_evidence','marshall_misapplied_rule',
                                'marshall_tone_inappropriate','jurisdictional_nuance',
                                'practitioner_relationship_context','legal_counsel_input',
                                'factual_error_in_template','pattern_requires_different_handling',
                                'other_with_note')),
  modification_note           text,
  diff_summary                jsonb,
  decided_by                  uuid NOT NULL REFERENCES auth.users(id),
  decided_at                  timestamptz NOT NULL DEFAULT now(),
  second_approver             uuid REFERENCES auth.users(id),
  second_approver_at          timestamptz,
  second_approver_note        text,
  final_response_sha256       text,
  sent_at                     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_appeal_decisions_decided ON public.appeal_decisions(decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_appeal_decisions_kind ON public.appeal_decisions(decision_kind);

CREATE TABLE IF NOT EXISTS public.appeal_patterns (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_code        text NOT NULL,
  pattern_scope       text NOT NULL CHECK (pattern_scope IN ('practitioner','cross_practitioner','rule','jurisdiction')),
  practitioner_ids    uuid[],
  rule_ids            text[],
  jurisdiction        text,
  time_window_start   timestamptz NOT NULL,
  time_window_end     timestamptz NOT NULL,
  severity            text NOT NULL CHECK (severity IN ('info','low','medium','high')),
  details             jsonb NOT NULL,
  status              text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','dismissed','acted_on')),
  acknowledged_by     uuid REFERENCES auth.users(id),
  acknowledged_at     timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appeal_patterns_status_created ON public.appeal_patterns(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appeal_patterns_scope ON public.appeal_patterns(pattern_scope);

CREATE TABLE IF NOT EXISTS public.appeal_agreement_rollups (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_start                date NOT NULL,
  window_end                  date NOT NULL,
  rule_id                     text NOT NULL,
  claim_type                  text NOT NULL,
  jurisdiction                text NOT NULL,
  recommendation_count        int NOT NULL,
  approved_as_drafted_count   int NOT NULL,
  modified_count              int NOT NULL,
  reviewed_manually_count     int NOT NULL,
  agreement_rate              numeric(4,3) NOT NULL,
  modal_override_reason       text,
  flagged                     boolean NOT NULL DEFAULT false,
  computed_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (window_start, window_end, rule_id, claim_type, jurisdiction)
);

CREATE INDEX IF NOT EXISTS idx_appeal_agreement_flagged
  ON public.appeal_agreement_rollups(flagged, window_end DESC) WHERE flagged = true;

ALTER TABLE public.appeal_analyses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeal_drafts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rebuttal_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeal_decisions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeal_patterns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeal_agreement_rollups  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appeals_admin_read ON public.appeal_analyses;
CREATE POLICY appeals_admin_read ON public.appeal_analyses FOR SELECT TO authenticated
  USING (auth.jwt()->>'role' IN ('compliance_admin','admin','superadmin'));

DROP POLICY IF EXISTS drafts_admin_read ON public.appeal_drafts;
CREATE POLICY drafts_admin_read ON public.appeal_drafts FOR SELECT TO authenticated
  USING (auth.jwt()->>'role' IN ('compliance_admin','admin','superadmin'));

DROP POLICY IF EXISTS templates_admin_rw ON public.rebuttal_templates;
CREATE POLICY templates_admin_rw ON public.rebuttal_templates FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('compliance_admin','admin','superadmin'))
  WITH CHECK (auth.jwt()->>'role' IN ('compliance_admin','admin','superadmin'));

DROP POLICY IF EXISTS decisions_admin_read ON public.appeal_decisions;
CREATE POLICY decisions_admin_read ON public.appeal_decisions FOR SELECT TO authenticated
  USING (auth.jwt()->>'role' IN ('compliance_admin','admin','superadmin'));

DROP POLICY IF EXISTS patterns_admin_rw ON public.appeal_patterns;
CREATE POLICY patterns_admin_rw ON public.appeal_patterns FOR ALL TO authenticated
  USING (auth.jwt()->>'role' IN ('compliance_admin','admin','superadmin'))
  WITH CHECK (auth.jwt()->>'role' IN ('compliance_admin','admin','superadmin'));

DROP POLICY IF EXISTS agreement_admin_read ON public.appeal_agreement_rollups;
CREATE POLICY agreement_admin_read ON public.appeal_agreement_rollups FOR SELECT TO authenticated
  USING (auth.jwt()->>'role' IN ('compliance_admin','admin','superadmin'));
