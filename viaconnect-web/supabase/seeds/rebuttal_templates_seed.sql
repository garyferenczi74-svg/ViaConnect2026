-- =============================================================================
-- Prompt #123 Rebuttal Templates seed (foundation set).
-- =============================================================================
-- Eight templates covering the most common (disposition, claim_type)
-- combinations for US/generic. Spec section 6.1 calls for 20+ templates;
-- the foundation set is enough for the analyzer + drafter to produce a
-- meaningful draft for every recommendation path. Additional jurisdictional
-- variants (CA/EU/UK) and language variants (fr-CA, es-MX) are deferred.
--
-- Em-dashes from any literal source rewritten to colons or commas per the
-- no-dashes Standing Rule. Slot placeholders use the {{slot_name}} syntax
-- consumed by lib/marshall/appeals/templates.ts:fillTemplate.
-- =============================================================================

INSERT INTO public.rebuttal_templates (id, template_code, disposition, claim_type, jurisdiction, language, version, body, required_slots, active) VALUES

-- 1. Uphold attribution dispute (handle verified)
('a1111111-1111-4111-8111-000000000001', 'uphold-attribution-us', 'uphold', 'dispute_attribution', 'US', 'en-US', 1,
'Dear {{practitioner_display_name}},

Thank you for submitting an appeal regarding notice {{notice_id}}.

We have reviewed your submission and the underlying evidence. The handle and account associated with the cited content match the verified social profile on file for your practitioner account. On that basis, the finding stands.

The cited rule is {{rule_id}} ({{rule_description}}), substantiated under {{citation}}. The evidence record {{evidence_reference}} is attached.

To resolve this notice, please complete the following remediation: {{remediation_action}}.

Sincerely,
{{signed_by}}
{{signed_title}}',
ARRAY['practitioner_display_name','notice_id','rule_id','rule_description','citation','evidence_reference','remediation_action','signed_by','signed_title'], true),

-- 2. Reverse attribution dispute (handle unverified)
('a1111111-1111-4111-8111-000000000002', 'reverse-attribution-us', 'reverse', 'dispute_attribution', 'US', 'en-US', 1,
'Dear {{practitioner_display_name}},

Thank you for submitting an appeal regarding notice {{notice_id}}.

We have reviewed your submission. The handle associated with the cited content cannot be conclusively attributed to your verified practitioner account at this time. On that basis, the finding is reversed.

If you wish to add additional verified handles to your account to prevent future attribution questions, please update your profile or contact compliance.

Sincerely,
{{signed_by}}
{{signed_title}}',
ARRAY['practitioner_display_name','notice_id','signed_by','signed_title'], true),

-- 3. Uphold interpretation dispute (drift none / benign)
('a1111111-1111-4111-8111-000000000003', 'uphold-interpretation-us', 'uphold', 'dispute_interpretation', 'US', 'en-US', 1,
'Dear {{practitioner_display_name}},

Thank you for submitting an appeal regarding notice {{notice_id}}.

We have reviewed the cited content against rule {{rule_id}} ({{rule_description}}) and its substantiation under {{citation}}. The interpretation you submitted does not change how the rule applies in this case. The finding stands.

To resolve this notice, please complete the following remediation: {{remediation_action}}.

Sincerely,
{{signed_by}}
{{signed_title}}',
ARRAY['practitioner_display_name','notice_id','rule_id','rule_description','citation','remediation_action','signed_by','signed_title'], true),

-- 4. Uphold interpretation with substantive drift noted
('a1111111-1111-4111-8111-000000000004', 'uphold-interpretation-drift-us', 'uphold', 'dispute_interpretation', 'US', 'en-US', 1,
'Dear {{practitioner_display_name}},

Thank you for submitting an appeal regarding notice {{notice_id}}.

We compared the published content to the version that received pre-check clearance on {{receipt_issued_at}} (clearance receipt {{receipt_id}}). The published content reflects the following change since clearance: {{drift_description}}. Because the change is substantive, the cleared receipt does not extend to the published version, and the finding stands.

To resolve this notice, please complete the following remediation: {{remediation_action}}.

Sincerely,
{{signed_by}}
{{signed_title}}',
ARRAY['practitioner_display_name','notice_id','receipt_id','receipt_issued_at','drift_description','remediation_action','signed_by','signed_title'], true),

-- 5. Reverse already_remediated (verified)
('a1111111-1111-4111-8111-000000000005', 'reverse-remediated-us', 'reverse', 'already_remediated', 'US', 'en-US', 1,
'Dear {{practitioner_display_name}},

Thank you for submitting an appeal regarding notice {{notice_id}}.

We have independently verified that the cited content has been remediated. On that basis, the finding is reversed and the notice is closed. No further action is required from you.

Sincerely,
{{signed_by}}
{{signed_title}}',
ARRAY['practitioner_display_name','notice_id','signed_by','signed_title'], true),

-- 6. Request more info on already_remediated (not verifiable)
('a1111111-1111-4111-8111-000000000006', 'request-info-remediated-us', 'request_more_info', 'already_remediated', 'US', 'en-US', 1,
'Dear {{practitioner_display_name}},

Thank you for submitting an appeal regarding notice {{notice_id}}.

You indicated that the cited content has been remediated. We were unable to independently verify the remediation. To proceed, please provide one of the following: a direct link to the updated post, a screenshot showing the current state of the content with date and platform visible, or confirmation of removal from the platform.

Your response will pause the appeal SLA clock; the original due date {{sla_original_due}} will be updated to {{sla_new_due}} once we receive your reply.

Sincerely,
{{signed_by}}
{{signed_title}}',
ARRAY['practitioner_display_name','notice_id','sla_original_due','sla_new_due','signed_by','signed_title'], true),

-- 7. Partial uphold on interpretation dispute
('a1111111-1111-4111-8111-000000000007', 'partial-interpretation-us', 'partial', 'dispute_interpretation', 'US', 'en-US', 1,
'Dear {{practitioner_display_name}},

Thank you for submitting an appeal regarding notice {{notice_id}}.

After reviewing your interpretation, we partially agree. The cited rule {{rule_id}} ({{rule_description}}) applies to a portion of the content; the remainder is not covered. The finding is reduced in scope, and the remediation requested is correspondingly scoped: {{remediation_action}}.

Sincerely,
{{signed_by}}
{{signed_title}}',
ARRAY['practitioner_display_name','notice_id','rule_id','rule_description','remediation_action','signed_by','signed_title'], true),

-- 8. Escalation notice (generic)
('a1111111-1111-4111-8111-000000000008', 'escalation-notice-generic', 'escalation_notice', 'other', 'generic', 'en-US', 1,
'Dear {{practitioner_display_name}},

Thank you for submitting an appeal regarding notice {{notice_id}}.

Your appeal has been escalated for additional review. We will follow up with a substantive response within five business days. The appeal SLA clock is paused during escalation; the original due date {{sla_original_due}} will be updated once review concludes.

Sincerely,
{{signed_by}}
{{signed_title}}',
ARRAY['practitioner_display_name','notice_id','sla_original_due','signed_by','signed_title'], true)

ON CONFLICT (template_code, version) DO NOTHING;
