// Prompt #104 Phase 3: Template merge-field resolver tests.

import { describe, it, expect } from 'vitest';
import {
  resolveMergeFields,
  extractRequiredFields,
  validateRequiredFieldsCovered,
} from '@/lib/legal/templates/mergeFieldResolver';

describe('extractRequiredFields', () => {
  it('finds all placeholder names', () => {
    const body = `Dear {{counterparty.display_label}},

Re: {{case_label}} concerning {{product.name}}.

Response by {{response_deadline}}.`;
    expect(extractRequiredFields(body).sort()).toEqual([
      'case_label', 'counterparty.display_label', 'product.name', 'response_deadline',
    ]);
  });

  it('deduplicates repeated placeholders', () => {
    const body = '{{a}} and {{a}} and {{b}}';
    expect(extractRequiredFields(body).sort()).toEqual(['a', 'b']);
  });

  it('returns empty for plain text', () => {
    expect(extractRequiredFields('No placeholders here.')).toEqual([]);
  });
});

describe('resolveMergeFields', () => {
  const body = 'Re: {{case_label}} from {{counterparty.display_label}}. Reply by {{response_deadline}}.';

  it('replaces all placeholders when context is complete', () => {
    const r = resolveMergeFields(body, {
      case_label: 'LEG-2026-000042',
      'counterparty.display_label': 'Acme Supplements LLC',
      response_deadline: '2026-05-04',
    });
    expect(r.missing).toEqual([]);
    expect(r.body).toBe('Re: LEG-2026-000042 from Acme Supplements LLC. Reply by 2026-05-04.');
  });

  it('reports missing fields in non-strict mode and leaves placeholders in body', () => {
    const r = resolveMergeFields(body, { case_label: 'LEG-2026-000042' });
    expect(r.missing.sort()).toEqual(['counterparty.display_label', 'response_deadline']);
    expect(r.body).toContain('{{counterparty.display_label}}');
    expect(r.body).toContain('{{response_deadline}}');
  });

  it('throws in strict mode when fields are missing', () => {
    expect(() => resolveMergeFields(body, { case_label: 'LEG-2026-000042' }, { strict: true }))
      .toThrow(/missing fields/);
  });

  it('treats empty-string and null as missing', () => {
    const r = resolveMergeFields('Hello {{name}}', { name: '' });
    expect(r.missing).toEqual(['name']);
    const r2 = resolveMergeFields('Hello {{name}}', { name: null });
    expect(r2.missing).toEqual(['name']);
  });

  it('coerces numbers to strings', () => {
    const r = resolveMergeFields('Damages: {{amount}}', { amount: 42100 });
    expect(r.body).toBe('Damages: 42100');
  });
});

describe('validateRequiredFieldsCovered', () => {
  const body = 'Re: {{case_label}} from {{counterparty.display_label}}.';

  it('passes when declared and body match', () => {
    const r = validateRequiredFieldsCovered({
      required_merge_fields: ['case_label', 'counterparty.display_label'],
      template_body: body,
    });
    expect(r.ok).toBe(true);
  });

  it('flags declared fields not present in the body', () => {
    const r = validateRequiredFieldsCovered({
      required_merge_fields: ['case_label', 'counterparty.display_label', 'extra_field'],
      template_body: body,
    });
    expect(r.declared_but_missing_in_body).toEqual(['extra_field']);
    expect(r.ok).toBe(false);
  });

  it('flags body placeholders not in the declared set', () => {
    const r = validateRequiredFieldsCovered({
      required_merge_fields: ['case_label'],
      template_body: body,
    });
    expect(r.in_body_but_undeclared).toEqual(['counterparty.display_label']);
    expect(r.ok).toBe(false);
  });
});
