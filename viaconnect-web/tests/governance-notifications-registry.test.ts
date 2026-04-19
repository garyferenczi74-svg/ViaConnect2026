// Prompt #95 Phase 7: pure tests for the notifications registry.

import { describe, it, expect } from 'vitest';
import {
  ALL_NOTIFICATION_TYPES,
  NOTIFICATION_TEMPLATES,
  renderTemplate,
  validatePayload,
  type NotificationType,
} from '@/lib/governance/notifications-registry';

const MIGRATION_CHECK_CONSTRAINT_TYPES: NotificationType[] = [
  'proposal_submitted_required',
  'proposal_submitted_advisory',
  'approval_recorded',
  'proposal_approved',
  'proposal_rejected',
  'board_notification',
  'board_approval_required',
  'proposal_activated',
  'proposal_rolled_back',
  'emergency_override_activated',
  'grandfathering_expiring_soon',
  'grandfathering_expired',
  'sla_reminder_50',
  'sla_reminder_80',
  'sla_breach',
  'proposal_expiring_soon',
  'proposal_expired',
  'governance_config_changed',
];

describe('NOTIFICATION_TEMPLATES — migration sync', () => {
  it('covers every type listed in the migration _410 CHECK constraint', () => {
    for (const t of MIGRATION_CHECK_CONSTRAINT_TYPES) {
      expect(NOTIFICATION_TEMPLATES[t]).toBeDefined();
    }
  });

  it('has 18 templates (one per notification type)', () => {
    expect(ALL_NOTIFICATION_TYPES).toHaveLength(18);
  });

  it.each(MIGRATION_CHECK_CONSTRAINT_TYPES)(
    'template %s has non-empty subject + body',
    (t) => {
      const tpl = NOTIFICATION_TEMPLATES[t];
      expect(tpl.subject.length).toBeGreaterThan(0);
      expect(tpl.body.length).toBeGreaterThan(0);
    },
  );

  it('every template declares at least one required payload key', () => {
    for (const t of ALL_NOTIFICATION_TYPES) {
      expect(NOTIFICATION_TEMPLATES[t].requiredPayloadKeys.length).toBeGreaterThan(0);
    }
  });
});

describe('renderTemplate', () => {
  it('fills placeholders with payload values', () => {
    const tpl = NOTIFICATION_TEMPLATES.proposal_submitted_required;
    const out = renderTemplate(tpl, {
      proposal_number: 42,
      title: 'Raise Gold to $54',
      impact_tier: 'moderate',
      proposal_url: 'https://example.com/p/42',
      percent_change: '10%',
      affected_customers: 247,
      proposed_effective_date: '2026-06-01',
      summary: 'Summary text',
      sla_hours: 24,
    });
    expect(out.subject).toContain('#42');
    expect(out.subject).toContain('Raise Gold to $54');
    expect(out.body).toContain('moderate');
    expect(out.body).toContain('247');
  });

  it('leaves unknown placeholders literal so missing data is visible', () => {
    const tpl = NOTIFICATION_TEMPLATES.proposal_submitted_required;
    const out = renderTemplate(tpl, {
      proposal_number: 42,
      title: 'T',
      impact_tier: 't',
      proposal_url: '/p',
    });
    // Missing keys like {{percent_change}} remain in the output instead of
    // silently dropping.
    expect(out.body).toContain('{{percent_change}}');
  });

  it('numeric payload values render as strings', () => {
    const tpl = NOTIFICATION_TEMPLATES.proposal_activated;
    const out = renderTemplate(tpl, {
      proposal_number: 7,
      proposal_url: '/p/7',
      bindings_created: 123,
      target_rows_updated: 1,
    });
    expect(out.body).toContain('123 customers');
    expect(out.body).toContain('1 target');
  });
});

describe('validatePayload', () => {
  it('returns empty when all required keys present', () => {
    const tpl = NOTIFICATION_TEMPLATES.proposal_submitted_required;
    const missing = validatePayload(tpl, {
      proposal_number: 1,
      title: 't',
      impact_tier: 'moderate',
      proposal_url: '/p',
    });
    expect(missing).toEqual([]);
  });

  it('returns the names of missing keys', () => {
    const tpl = NOTIFICATION_TEMPLATES.proposal_submitted_required;
    const missing = validatePayload(tpl, {
      proposal_number: 1,
      title: 't',
    });
    expect(missing).toContain('impact_tier');
    expect(missing).toContain('proposal_url');
  });

  it('treats null and undefined as missing', () => {
    const tpl = NOTIFICATION_TEMPLATES.proposal_submitted_required;
    const missing = validatePayload(tpl, {
      proposal_number: 1,
      title: 't',
      impact_tier: null,
      proposal_url: undefined,
    });
    expect(missing).toContain('impact_tier');
    expect(missing).toContain('proposal_url');
  });
});
