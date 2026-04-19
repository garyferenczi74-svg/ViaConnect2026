// Prompt #95 Phase 7: notification template registry (pure).
//
// Maps each notification_type (from the governance_notifications_queue
// CHECK constraint) to its subject template and body template. Templates
// use {{placeholder}} syntax; the queue dispatcher replaces them with
// payload values at delivery time.
//
// This is a pure data module so drift between migration CHECK constraint
// and template coverage is caught at test time (see
// tests/governance-notifications-registry.test.ts).

export type NotificationType =
  | 'proposal_submitted_required'
  | 'proposal_submitted_advisory'
  | 'approval_recorded'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'board_notification'
  | 'board_approval_required'
  | 'proposal_activated'
  | 'proposal_rolled_back'
  | 'emergency_override_activated'
  | 'grandfathering_expiring_soon'
  | 'grandfathering_expired'
  | 'sla_reminder_50'
  | 'sla_reminder_80'
  | 'sla_breach'
  | 'proposal_expiring_soon'
  | 'proposal_expired'
  | 'governance_config_changed';

export interface NotificationTemplate {
  type: NotificationType;
  subject: string;
  body: string;
  requiredPayloadKeys: string[];
}

export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  proposal_submitted_required: {
    type: 'proposal_submitted_required',
    subject: '[ViaCura Governance] Proposal #{{proposal_number}} awaiting your approval: {{title}}',
    body: `Proposal: {{title}}
Tier: {{impact_tier}}
Percent change: {{percent_change}}
Affected customers: {{affected_customers}}
Proposed effective date: {{proposed_effective_date}}

Summary:
{{summary}}

Review and decide: {{proposal_url}}

Decision SLA: {{sla_hours}} hours from now.`,
    requiredPayloadKeys: ['proposal_number', 'title', 'impact_tier', 'proposal_url'],
  },
  proposal_submitted_advisory: {
    type: 'proposal_submitted_advisory',
    subject: '[ViaCura Governance] Advisory review invited on proposal #{{proposal_number}}',
    body: `You are invited to comment on this proposal as an advisory reviewer.

{{title}}

Your comments do not block approval; they inform the required approvers.

Open: {{proposal_url}}`,
    requiredPayloadKeys: ['proposal_number', 'title', 'proposal_url'],
  },
  approval_recorded: {
    type: 'approval_recorded',
    subject: '[ViaCura Governance] {{approver_role}} recorded {{decision}} on #{{proposal_number}}',
    body: `An approver has recorded their decision on your proposal.

{{approver_role}}: {{decision}}
Notes: {{decision_notes}}

{{proposal_url}}`,
    requiredPayloadKeys: ['proposal_number', 'decision', 'proposal_url'],
  },
  proposal_approved: {
    type: 'proposal_approved',
    subject: '[ViaCura Governance] Proposal #{{proposal_number}} approved',
    body: `All required approvers have approved your proposal.

Next: activation will occur on {{proposed_effective_date}}, unless you activate manually.

{{proposal_url}}`,
    requiredPayloadKeys: ['proposal_number', 'proposal_url'],
  },
  proposal_rejected: {
    type: 'proposal_rejected',
    subject: '[ViaCura Governance] Proposal #{{proposal_number}} rejected',
    body: `Your proposal was rejected.

Rejected by: {{approver_role}}
Reason: {{decision_notes}}

You may withdraw and submit a revised proposal.

{{proposal_url}}`,
    requiredPayloadKeys: ['proposal_number', 'proposal_url'],
  },
  board_notification: {
    type: 'board_notification',
    subject: '[ViaCura Governance] Board notification: proposal #{{proposal_number}}',
    body: `This proposal is being submitted for your awareness. Formal approval is not required at this tier.

{{title}}

A PDF summary is attached. Please see: {{proposal_url}}`,
    requiredPayloadKeys: ['proposal_number', 'title', 'proposal_url'],
  },
  board_approval_required: {
    type: 'board_approval_required',
    subject: '[ViaCura Governance] Board approval required: proposal #{{proposal_number}}',
    body: `Your approval is required for this proposal to proceed.

{{title}}

Please review the attached PDF and respond by reply or by email to gary@farmceuticawellness.com with your decision.

{{proposal_url}}`,
    requiredPayloadKeys: ['proposal_number', 'title', 'proposal_url'],
  },
  proposal_activated: {
    type: 'proposal_activated',
    subject: '[ViaCura Governance] Proposal #{{proposal_number}} activated',
    body: `The change has been activated.

{{bindings_created}} customers grandfathered.
{{target_rows_updated}} target rows updated.

{{proposal_url}}`,
    requiredPayloadKeys: ['proposal_number', 'proposal_url'],
  },
  proposal_rolled_back: {
    type: 'proposal_rolled_back',
    subject: '[ViaCura Governance] Proposal #{{proposal_number}} rolled back',
    body: `Proposal #{{proposal_number}} was rolled back.

Reason: {{rollback_justification}}

{{bindings_superseded}} grandfathered bindings superseded.

{{proposal_url}}`,
    requiredPayloadKeys: ['proposal_number', 'rollback_justification', 'proposal_url'],
  },
  emergency_override_activated: {
    type: 'emergency_override_activated',
    subject: '[EMERGENCY] Price change activated without standard approval: {{title}}',
    body: `Gary activated an emergency price change.

Proposal: {{title}}
Domain: {{pricing_domain_id}}
Change: {{change_summary}}
Justification: {{emergency_justification}}

If you object to this change, reply within 24 hours and it will enter retrospective review.

If you agree or do not respond within 24 hours, the change is considered endorsed.

Full proposal: {{proposal_url}}`,
    requiredPayloadKeys: ['proposal_number', 'title', 'emergency_justification', 'proposal_url'],
  },
  grandfathering_expiring_soon: {
    type: 'grandfathering_expiring_soon',
    subject: '[ViaCura] Your subscription price will transition on {{expiration_date}}',
    body: `Your current rate of {{current_price}} will transition to the new rate of {{new_price}} on {{expiration_date}}.

You can review or update your subscription: {{billing_url}}`,
    requiredPayloadKeys: ['expiration_date', 'current_price', 'new_price', 'billing_url'],
  },
  grandfathering_expired: {
    type: 'grandfathering_expired',
    subject: '[ViaCura] Your subscription price has transitioned',
    body: `Your grandfathered rate of {{old_price}} expired on {{expiration_date}} and your subscription has transitioned to {{new_price}}.

{{billing_url}}`,
    requiredPayloadKeys: ['expiration_date', 'old_price', 'new_price', 'billing_url'],
  },
  sla_reminder_50: {
    type: 'sla_reminder_50',
    subject: '[ViaCura Governance] Reminder: decision needed on #{{proposal_number}}',
    body: `50% of the decision SLA has elapsed on proposal #{{proposal_number}}.

{{proposal_url}}`,
    requiredPayloadKeys: ['proposal_number', 'proposal_url'],
  },
  sla_reminder_80: {
    type: 'sla_reminder_80',
    subject: '[ViaCura Governance] Urgent: decision needed on #{{proposal_number}}',
    body: `80% of the decision SLA has elapsed on proposal #{{proposal_number}}. Please decide before the SLA is breached.

{{proposal_url}}`,
    requiredPayloadKeys: ['proposal_number', 'proposal_url'],
  },
  sla_breach: {
    type: 'sla_breach',
    subject: '[ViaCura Governance] SLA breach on proposal #{{proposal_number}}',
    body: `Decision SLA exceeded for proposal #{{proposal_number}}. No decision recorded by {{approver_role}} ({{approver_email}}).

{{proposal_url}}`,
    requiredPayloadKeys: ['proposal_number', 'approver_role', 'proposal_url'],
  },
  proposal_expiring_soon: {
    type: 'proposal_expiring_soon',
    subject: '[ViaCura Governance] Proposal #{{proposal_number}} expires in 5 days',
    body: `Your proposal will auto-expire on {{expires_at}} if not activated.

To extend, edit any field on the proposal; the expiration resets to 30 days.

{{proposal_url}}`,
    requiredPayloadKeys: ['proposal_number', 'expires_at', 'proposal_url'],
  },
  proposal_expired: {
    type: 'proposal_expired',
    subject: '[ViaCura Governance] Proposal #{{proposal_number}} auto-expired',
    body: `Your proposal auto-expired. You may clone it into a new draft.

{{proposal_url}}`,
    requiredPayloadKeys: ['proposal_number', 'proposal_url'],
  },
  governance_config_changed: {
    type: 'governance_config_changed',
    subject: '[ViaCura Governance] Configuration changed: {{change_type}}',
    body: `A governance configuration change was recorded.

Change: {{change_type}}
Target: {{target_table}} / {{target_id}}
Justification: {{change_justification}}
Changed by: {{changed_by_email}}

Full audit: {{audit_url}}`,
    requiredPayloadKeys: ['change_type', 'change_justification', 'audit_url'],
  },
};

/** Pure: render a template with the given payload. Missing placeholders
 *  are left literal so they surface visibly instead of silently dropping. */
export function renderTemplate(
  template: NotificationTemplate,
  payload: Record<string, string | number | null | undefined>,
): { subject: string; body: string } {
  return {
    subject: fill(template.subject, payload),
    body: fill(template.body, payload),
  };
}

function fill(s: string, payload: Record<string, string | number | null | undefined>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const value = payload[key];
    if (value === null || value === undefined) return `{{${key}}}`;
    return String(value);
  });
}

/** Pure: validate that every required placeholder for a template appears
 *  in the provided payload. Returns the missing keys (empty array means ok). */
export function validatePayload(
  template: NotificationTemplate,
  payload: Record<string, unknown>,
): string[] {
  return template.requiredPayloadKeys.filter(
    (k) => payload[k] === null || payload[k] === undefined,
  );
}

export const ALL_NOTIFICATION_TYPES = Object.keys(NOTIFICATION_TEMPLATES) as NotificationType[];
