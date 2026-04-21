// Prompt #104 Phase 4: cd-letter draft builder tests.

import { describe, it, expect } from 'vitest';
import {
  buildEnforcementDraft,
  buildMergeContext,
  type DraftBuilderInput,
} from '@/lib/legal/enforcement/cdLetterBuilder';

const baseInput = (): DraftBuilderInput => ({
  case: { case_label: 'LEG-2026-000042', bucket: 'gray_market_material_differences', notes: null },
  counterparty: { display_label: 'Acme Supplements LLC', contact_address: '123 Main St, Wilmington DE 19801', primary_jurisdiction: 'US-DE' },
  product: { name: 'Replenish NAD+' },
  template: {
    template_id: 't-1',
    template_family: 'cd_material_differences',
    version: 'v2026.04.23',
    markdown_body: 'Re: {{case_label}} from {{counterparty.display_label}} concerning {{product.name}}. Reply by {{response_deadline}}. - {{signing_officer}}',
    required_merge_fields: ['case_label','counterparty.display_label','product.name','response_deadline','signing_officer'],
  },
  signing_officer: 'Steve Rica',
  response_deadline_iso: '2026-05-08',
  evidence_summary: null,
});

describe('buildMergeContext', () => {
  it('flattens counterparty and product into dotted keys', () => {
    const ctx = buildMergeContext(baseInput());
    expect(ctx['counterparty.display_label']).toBe('Acme Supplements LLC');
    expect(ctx['product.name']).toBe('Replenish NAD+');
    expect(ctx.case_label).toBe('LEG-2026-000042');
  });

  it('passes through nullable optional fields as null', () => {
    const ctx = buildMergeContext(baseInput());
    expect(ctx.material_differences_summary).toBe(null);
    expect(ctx.copyright_registration).toBe(null);
  });
});

describe('buildEnforcementDraft', () => {
  it('renders the body, computes a 64-char hex hash, reports no missing fields when context complete', async () => {
    const draft = await buildEnforcementDraft(baseInput());
    expect(draft.missing_fields).toEqual([]);
    expect(draft.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(draft.body).toContain('LEG-2026-000042');
    expect(draft.body).toContain('Acme Supplements LLC');
    expect(draft.body).toContain('Replenish NAD+');
    expect(draft.body).toContain('Steve Rica');
  });

  it('reports missing fields when counterparty has no contact address (still renders other fields)', async () => {
    const i = baseInput();
    // Add a placeholder that the body uses but context lacks
    i.template.markdown_body += ' Address: {{counterparty.contact_address}}';
    if (i.counterparty) i.counterparty.contact_address = null;
    const draft = await buildEnforcementDraft(i);
    expect(draft.missing_fields).toContain('counterparty.contact_address');
    expect(draft.body).toContain('{{counterparty.contact_address}}');
  });

  it('produces deterministic hash for identical inputs', async () => {
    const a = await buildEnforcementDraft(baseInput());
    const b = await buildEnforcementDraft(baseInput());
    expect(a.sha256).toBe(b.sha256);
    expect(a.body).toBe(b.body);
  });
});
