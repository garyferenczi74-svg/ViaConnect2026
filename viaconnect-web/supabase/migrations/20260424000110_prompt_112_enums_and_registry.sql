-- =============================================================================
-- Prompt #112 Phase 1.1: Notification priority + channel ENUMs and the
-- canonical event registry. 28 initial event types seeded; foreshadowed
-- stubs (FDA/HC #113, customs #114, trademark #115, litigation #116) start
-- with default_enabled = FALSE.
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.notification_priority AS ENUM ('urgent','high','normal','low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_channel AS ENUM ('sms','slack','push','email','in_app');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TYPE public.notification_priority IS 'Prompt #112 dispatch priority. urgent bypasses quiet hours + rate limits (never opt-in + PHI).';
COMMENT ON TYPE public.notification_channel IS 'Prompt #112 external + internal notification channels.';

-- ---------------------------------------------------------------------------
-- notification_event_registry: the catalog.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_event_registry (
  event_code                        TEXT PRIMARY KEY,
  display_name                      TEXT NOT NULL,
  description                       TEXT NOT NULL,
  source_prompt                     TEXT,
  default_priority                  public.notification_priority NOT NULL DEFAULT 'normal',
  default_channels                  public.notification_channel[] NOT NULL DEFAULT ARRAY['in_app']::public.notification_channel[],
  external_body_template            TEXT NOT NULL,
  in_app_body_template              TEXT,
  sms_body_template                 TEXT,
  push_title_template               TEXT,
  push_body_template                TEXT,
  slack_blocks_template             JSONB,
  deep_link_path_template           TEXT,
  legal_ops_scope                   BOOLEAN NOT NULL DEFAULT FALSE,
  attorney_work_product             BOOLEAN NOT NULL DEFAULT FALSE,
  organizational_compliance_required BOOLEAN NOT NULL DEFAULT FALSE,
  default_enabled                   BOOLEAN NOT NULL DEFAULT TRUE,
  phi_redaction_rules               JSONB NOT NULL DEFAULT '{}'::JSONB,
  rate_limit_override               INTEGER,
  emission_source                   TEXT,
  reemission_allowed                BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (length(external_body_template) >= 10),
  CHECK (push_title_template IS NULL OR length(push_title_template) <= 50),
  CHECK (push_body_template IS NULL OR length(push_body_template) <= 120)
);

COMMENT ON TABLE public.notification_event_registry IS
  'Prompt #112 canonical event catalog. external_body_template is PHI-free static text; in_app_body_template may contain PHI because it renders only inside authenticated session with HIPAA audit.';

CREATE INDEX IF NOT EXISTS idx_nevreg_source   ON public.notification_event_registry (source_prompt);
CREATE INDEX IF NOT EXISTS idx_nevreg_legalops ON public.notification_event_registry (legal_ops_scope) WHERE legal_ops_scope = TRUE;
CREATE INDEX IF NOT EXISTS idx_nevreg_enabled  ON public.notification_event_registry (default_enabled);

ALTER TABLE public.notification_event_registry ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_event_registry' AND policyname='nevreg_read_authenticated') THEN
    CREATE POLICY "nevreg_read_authenticated" ON public.notification_event_registry FOR SELECT TO authenticated USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_event_registry' AND policyname='nevreg_write_admin') THEN
    CREATE POLICY "nevreg_write_admin" ON public.notification_event_registry FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Seed the 28 initial events + foreshadowed stubs.
-- external_body_template values are intentionally static + PHI-free.
-- ---------------------------------------------------------------------------
INSERT INTO public.notification_event_registry (
  event_code, display_name, description, source_prompt,
  default_priority, default_channels,
  external_body_template, in_app_body_template, sms_body_template,
  push_title_template, push_body_template, deep_link_path_template,
  legal_ops_scope, attorney_work_product, organizational_compliance_required,
  default_enabled
) VALUES
-- Patient workflow
('new_patient_enrolled', 'New patient enrolled',
 'A new patient started onboarding with the practitioner.', '#99',
 'normal', ARRAY['push','in_app']::public.notification_channel[],
 'A new patient has started onboarding with you. View in ViaConnect.',
 'New patient enrolled. Open their profile to review CAQ progress.',
 'A new patient is onboarding with you. View at viaconnectapp.com/inbox',
 'New patient', 'A new patient started onboarding.',
 '/practitioner/inbox/view?ref={ref}', FALSE, FALSE, FALSE, TRUE),

('new_patient_caq_completed', 'CAQ completed',
 'A patient finished the Comprehensive Assessment.', '#99',
 'high', ARRAY['push','in_app']::public.notification_channel[],
 'A patient of yours completed their Comprehensive Assessment. View in ViaConnect.',
 'Patient CAQ complete. Review responses in their profile.',
 'A patient completed their assessment. View at viaconnectapp.com/inbox',
 'CAQ complete', 'A patient completed their assessment.',
 '/practitioner/inbox/view?ref={ref}', FALSE, FALSE, FALSE, TRUE),

('patient_lab_results_delivered', 'Lab results delivered',
 'Functional lab results arrived for review.', '#99',
 'high', ARRAY['push','in_app']::public.notification_channel[],
 'Lab results have arrived for a patient. View in ViaConnect.',
 'Lab panel delivered. Review in patient profile.',
 'Lab results delivered. View at viaconnectapp.com/inbox',
 'Lab results', 'Lab results delivered for a patient.',
 '/practitioner/inbox/view?ref={ref}', FALSE, FALSE, FALSE, TRUE),

('patient_genex360_report_ready', 'GeneX360 report ready',
 'Genetic interpretation report delivered.', '#108',
 'high', ARRAY['push','in_app']::public.notification_channel[],
 'A GeneX360 interpretation report is ready for a patient. View in ViaConnect.',
 'GeneX360 report ready. Open the patient profile.',
 'A GeneX360 report is ready. View at viaconnectapp.com/inbox',
 'GeneX360 ready', 'Report ready for a patient.',
 '/practitioner/inbox/view?ref={ref}', FALSE, FALSE, FALSE, TRUE),

('patient_protocol_change_requested', 'Protocol change requested',
 'Patient asked practitioner to review protocol.', '#99',
 'normal', ARRAY['in_app','push']::public.notification_channel[],
 'A patient has requested a protocol review. View in ViaConnect.',
 'Patient requested a protocol review.',
 'Patient requested a protocol review. View at viaconnectapp.com/inbox',
 'Protocol review', 'Patient requested a protocol review.',
 '/practitioner/inbox/view?ref={ref}', FALSE, FALSE, FALSE, TRUE),

('patient_subscription_paused', 'Subscription paused',
 'Patient paused auto-ship.', '#99',
 'low', ARRAY['in_app']::public.notification_channel[],
 'A patient paused their subscription. View in ViaConnect.',
 'Patient paused their subscription.',
 NULL, NULL, NULL, '/practitioner/inbox/view?ref={ref}',
 FALSE, FALSE, FALSE, TRUE),

('patient_subscription_cancelled', 'Subscription cancelled',
 'Patient cancelled their subscription.', '#99',
 'normal', ARRAY['in_app','email']::public.notification_channel[],
 'A patient cancelled their subscription. View in ViaConnect.',
 'Patient cancelled subscription.',
 NULL, NULL, NULL, '/practitioner/inbox/view?ref={ref}',
 FALSE, FALSE, FALSE, TRUE),

('patient_sharing_granted', 'Patient granted access',
 'Patient granted practitioner access to their genetic data.', '#108',
 'normal', ARRAY['in_app']::public.notification_channel[],
 'A patient has granted you access to their data. View in ViaConnect.',
 'Patient granted data-sharing access.',
 NULL, NULL, NULL, '/practitioner/inbox/view?ref={ref}',
 FALSE, FALSE, FALSE, TRUE),

('patient_sharing_revoked', 'Patient revoked access',
 'Patient revoked practitioner access.', '#108',
 'normal', ARRAY['in_app','email']::public.notification_channel[],
 'A patient has revoked your access to their data. View in ViaConnect.',
 'Patient revoked data-sharing access.',
 NULL, NULL, NULL, '/practitioner/inbox/view?ref={ref}',
 FALSE, FALSE, FALSE, TRUE),

-- Physician-order events
('physician_order_request_received', 'Physician order request',
 'Urgent: state DTC gating requires practitioner approval.', '#108',
 'urgent', ARRAY['sms','push','slack','email','in_app']::public.notification_channel[],
 'Urgent: a patient is awaiting your order approval. View in ViaConnect.',
 'URGENT: patient order approval required.',
 'Urgent: A patient is awaiting your order approval. View at viaconnectapp.com/orders',
 'URGENT order approval', 'A patient is awaiting your order approval.',
 '/practitioner/orders/view?ref={ref}', FALSE, FALSE, FALSE, TRUE),

('physician_order_14_day_reminder', 'Order expiring in 3 days',
 '14-day auto-refund approaching.', '#108',
 'high', ARRAY['sms','push','email','in_app']::public.notification_channel[],
 'A patient order is approaching its 14-day auto-refund. View in ViaConnect.',
 'Order approaching 14-day timeout.',
 'Order expiring soon: view at viaconnectapp.com/orders',
 'Order expiring soon', 'Order nearing 14-day auto-refund.',
 '/practitioner/orders/view?ref={ref}', FALSE, FALSE, FALSE, TRUE),

('physician_order_auto_refunded', 'Order auto-refunded',
 '14-day timeout fired; patient auto-refunded.', '#108',
 'normal', ARRAY['email','in_app']::public.notification_channel[],
 'A pending patient order has been auto-refunded after 14 days. View in ViaConnect.',
 'Order auto-refunded at 14-day timeout.',
 NULL, NULL, NULL, '/practitioner/orders/view?ref={ref}',
 FALSE, FALSE, FALSE, TRUE),

-- Commission + finance
('commission_statement_ready', 'Commission statement ready',
 'Monthly commission statement available.', '#102',
 'normal', ARRAY['email','in_app','push']::public.notification_channel[],
 'Your ViaConnect commission statement is ready. View in ViaConnect.',
 'Commission statement ready for the period.',
 'Your ViaConnect commission statement is ready. View at viaconnectapp.com/commissions',
 'Statement ready', 'Your commission statement is ready.',
 '/practitioner/commissions/view?ref={ref}', FALSE, FALSE, FALSE, TRUE),

('commission_payout_initiated', 'Payout initiated',
 'Commission payout has been initiated.', '#102',
 'normal', ARRAY['sms','email','push','in_app']::public.notification_channel[],
 'Your ViaConnect commission payout has been initiated. View in ViaConnect.',
 'Payout initiated; funds in transit.',
 'Your ViaConnect payout was initiated. View at viaconnectapp.com/commissions',
 'Payout initiated', 'Your payout is in transit.',
 '/practitioner/commissions/view?ref={ref}', FALSE, FALSE, FALSE, TRUE),

('commission_payout_completed', 'Payout completed',
 'Commission payout completed.', '#102',
 'normal', ARRAY['sms','email','push','in_app']::public.notification_channel[],
 'Your ViaConnect commission payout has completed. View in ViaConnect.',
 'Payout completed; funds deposited.',
 'Your ViaConnect payout completed. View at viaconnectapp.com/commissions',
 'Payout completed', 'Your payout has completed.',
 '/practitioner/commissions/view?ref={ref}', FALSE, FALSE, FALSE, TRUE),

('commission_dispute_filed', 'Dispute filed',
 'Practitioner commission dispute escalated.', '#102',
 'high', ARRAY['email','in_app']::public.notification_channel[],
 'Your commission dispute has been filed and is under review. View in ViaConnect.',
 'Commission dispute filed; status updating.',
 NULL, NULL, NULL, '/practitioner/commissions/view?ref={ref}',
 FALSE, FALSE, FALSE, TRUE),

-- MAP compliance
('map_probation_warning_issued', 'MAP probation warning',
 'Practitioner placed on MAP probation.', '#101',
 'high', ARRAY['sms','email','in_app']::public.notification_channel[],
 'ViaConnect MAP compliance notice. Log in to review.',
 'MAP probation warning issued. Review terms in your account.',
 'ViaConnect MAP compliance notice. Log in to review.',
 'MAP notice', 'Compliance action required.',
 '/practitioner/compliance/map?ref={ref}', FALSE, FALSE, FALSE, TRUE),

('map_probation_status_changed', 'MAP status changed',
 'Tier transition (e.g., Gold to Silver).', '#101',
 'normal', ARRAY['email','in_app']::public.notification_channel[],
 'Your ViaConnect MAP status has changed. Log in to review.',
 'MAP tier transition recorded.',
 NULL, NULL, NULL, '/practitioner/compliance/map?ref={ref}',
 FALSE, FALSE, FALSE, TRUE),

-- Product + protocol
('new_product_launched', 'New product launched',
 'A new category-level product is live in the catalog.', '#95',
 'low', ARRAY['in_app','email']::public.notification_channel[],
 'A new product has launched in ViaConnect. Browse the catalog for details.',
 'New product available in the catalog.',
 NULL, NULL, NULL, '/practitioner/catalog?ref={ref}',
 FALSE, FALSE, FALSE, TRUE),

('existing_protocol_ingredient_recall', 'Ingredient recall',
 'Safety recall on an ingredient you prescribe.', '#107',
 'urgent', ARRAY['sms','push','email','in_app','slack']::public.notification_channel[],
 'Urgent: an ingredient recall affects protocols you have prescribed. Log in to review.',
 'Ingredient recall: review affected protocols.',
 'URGENT recall. Log in at viaconnectapp.com/recalls',
 'URGENT recall', 'Ingredient recall in your protocols.',
 '/practitioner/recalls/view?ref={ref}', FALSE, FALSE, FALSE, TRUE),

-- Training + platform
('new_training_module_available', 'Training available',
 'New CE/CME module published.', 'platform',
 'low', ARRAY['in_app','email']::public.notification_channel[],
 'A new training module is available on ViaConnect. Log in to view.',
 'New training module.',
 NULL, NULL, NULL, '/practitioner/training?ref={ref}',
 FALSE, FALSE, FALSE, TRUE),

('platform_scheduled_maintenance', 'Scheduled maintenance',
 'Planned downtime notice.', 'platform',
 'high', ARRAY['email','in_app']::public.notification_channel[],
 'ViaConnect scheduled maintenance is upcoming. Log in to view details.',
 'Scheduled maintenance upcoming.',
 NULL, NULL, NULL, '/practitioner/status?ref={ref}',
 FALSE, FALSE, FALSE, TRUE),

('platform_policy_update', 'Policy update',
 'Terms / HIPAA BAA / platform policy update.', 'platform',
 'normal', ARRAY['email','in_app']::public.notification_channel[],
 'ViaConnect platform policies have been updated. Log in to review.',
 'Policy update available to review.',
 NULL, NULL, NULL, '/practitioner/policies?ref={ref}',
 FALSE, FALSE, FALSE, TRUE),

-- Legal-ops events
('cap_waiver_review_requested', 'CAP waiver review requested',
 'Lab CAP accreditation waiver pending dual-approval (Steve Rica + medical director).', '#108',
 'high', ARRAY['email','in_app','push']::public.notification_channel[],
 'A CAP waiver requires your review in ViaConnect. Log in to review.',
 'CAP waiver requires legal-ops review.',
 NULL, NULL, NULL, '/admin/genex360/cap-waivers?ref={ref}',
 TRUE, FALSE, FALSE, TRUE),

('vat_tax_registration_expiring', 'Tax registration expiring',
 'VAT/GST registration approaching expiration (T-90/60/30/15/0).', '#111',
 'high', ARRAY['email','in_app','slack']::public.notification_channel[],
 'A tax registration is approaching expiration. Log in to review.',
 'Tax registration expiring; renewal action required.',
 NULL, NULL, NULL, '/admin/international/tax/registrations?ref={ref}',
 TRUE, FALSE, TRUE, TRUE),

('dshea_claim_rejected_by_validator', 'DSHEA claim rejected',
 'Claim rejected by automated DSHEA validator.', '#107',
 'normal', ARRAY['email','in_app']::public.notification_channel[],
 'A DSHEA claim was rejected by the validator. Log in to review.',
 'DSHEA claim rejected; revise wording.',
 NULL, NULL, NULL, '/admin/compliance/dshea?ref={ref}',
 TRUE, FALSE, FALSE, TRUE),

('gray_market_escalation_raised', 'Gray-market escalation',
 'Counterfeit / unauthorized-reseller escalation (privileged).', '#104',
 'high', ARRAY['email','in_app']::public.notification_channel[],
 'Urgent privileged matter. Please log in.',
 'Gray-market escalation requires legal review.',
 'Urgent privileged matter. Please log in.',
 'Urgent privileged matter', 'Please log in.',
 '/admin/legal/gray-market?ref={ref}', TRUE, TRUE, FALSE, TRUE),

('international_availability_approval_requested', 'Availability approval requested',
 'Non-US market SKU activation requires legal-ops sign-off.', '#111',
 'normal', ARRAY['email','in_app','slack']::public.notification_channel[],
 'An international availability approval is pending your review. Log in to review.',
 'Availability approval pending legal-ops review.',
 NULL, NULL, NULL, '/admin/international/availability-matrix?ref={ref}',
 TRUE, FALSE, FALSE, TRUE),

-- Foreshadowed stubs (default_enabled = FALSE until source prompts ship)
('fda_hc_regulatory_trigger', 'FDA / Health Canada compliance trigger',
 'Regulatory compliance event (foreshadows #113).', '#113',
 'urgent', ARRAY['email','in_app','sms']::public.notification_channel[],
 'Urgent regulatory compliance matter. Please log in.',
 'FDA/HC compliance action required.',
 'Urgent regulatory matter. Log in at viaconnectapp.com',
 'Regulatory action', 'Compliance response required.',
 '/admin/regulatory/compliance?ref={ref}', TRUE, FALSE, TRUE, FALSE),

('counterfeit_customs_event', 'Counterfeit customs event',
 'CBP / customs counterfeit seizure or recordation event (foreshadows #114).', '#114',
 'high', ARRAY['email','in_app']::public.notification_channel[],
 'A counterfeit customs event has been recorded. Please log in.',
 'Customs event requires legal-ops review.',
 NULL, NULL, NULL, '/admin/legal/customs?ref={ref}',
 TRUE, TRUE, FALSE, FALSE),

('trademark_renewal_reminder', 'Trademark renewal reminder',
 'Trademark approaching renewal (foreshadows #115).', '#115',
 'normal', ARRAY['email','in_app']::public.notification_channel[],
 'A trademark is approaching its renewal window. Please log in.',
 'Trademark renewal reminder.',
 NULL, NULL, NULL, '/admin/legal/trademarks?ref={ref}',
 TRUE, FALSE, TRUE, FALSE),

('litigation_docket_update', 'Litigation docket update',
 'Court filing, docket entry, or hearing reminder (foreshadows #116).', '#116',
 'high', ARRAY['email','in_app']::public.notification_channel[],
 'Urgent privileged matter. Please log in.',
 'Litigation docket update posted.',
 'Urgent privileged matter. Log in.',
 'Urgent privileged matter', 'Docket update posted.',
 '/admin/legal/litigation?ref={ref}', TRUE, TRUE, TRUE, FALSE)
ON CONFLICT (event_code) DO NOTHING;
