// Prompt #104 Phase 1: DMCA § 512(c)(3)(A) statutory-element tests.
// Critical hard-stop: missing any element blocks the filing.

import { describe, it, expect } from 'vitest';
import {
  validateDMCAStatutoryElements,
  validateMaterialDifferences,
} from '@/lib/legal/templates/statutoryValidator';

describe('validateDMCAStatutoryElements', () => {
  const fully_compliant = {
    signature: 'Steve Rica, Compliance Officer',
    copyrighted_work_identification: 'https://farmceutica.com/products/methylb-complete',
    infringing_material_identification: 'https://amazon.com/listing/B0XYZ',
    contact_info: { email: 'legal@farmceuticawellness.com', phone: null },
    good_faith_statement_present: true,
    perjury_statement_present: true,
  };

  it('passes when all six elements present', () => {
    const r = validateDMCAStatutoryElements(fully_compliant);
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it('blocks when signature missing (HARD STOP)', () => {
    const r = validateDMCAStatutoryElements({ ...fully_compliant, signature: '' });
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('signature');
  });

  it('blocks when copyrighted-work id missing', () => {
    const r = validateDMCAStatutoryElements({ ...fully_compliant, copyrighted_work_identification: null });
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('copyrighted_work_identification');
  });

  it('blocks when infringing-material id missing', () => {
    const r = validateDMCAStatutoryElements({ ...fully_compliant, infringing_material_identification: '' });
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('infringing_material_identification');
  });

  it('blocks when contact info missing', () => {
    const r = validateDMCAStatutoryElements({ ...fully_compliant, contact_info: null });
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('contact_info');
  });

  it('blocks when contact info has neither email nor phone', () => {
    const r = validateDMCAStatutoryElements({
      ...fully_compliant,
      contact_info: { email: '', phone: '' },
    });
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('contact_info');
  });

  it('passes when contact info has phone only (no email)', () => {
    const r = validateDMCAStatutoryElements({
      ...fully_compliant,
      contact_info: { email: null, phone: '+1-716-555-0100' },
    });
    expect(r.ok).toBe(true);
  });

  it('blocks when good-faith statement absent', () => {
    const r = validateDMCAStatutoryElements({ ...fully_compliant, good_faith_statement_present: false });
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('good_faith_statement');
  });

  it('blocks when perjury statement absent (HARD STOP)', () => {
    const r = validateDMCAStatutoryElements({ ...fully_compliant, perjury_statement_present: false });
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('perjury_statement');
  });

  it('reports all missing elements when several absent', () => {
    const r = validateDMCAStatutoryElements({
      signature: '',
      copyrighted_work_identification: null,
      infringing_material_identification: null,
      contact_info: null,
      good_faith_statement_present: false,
      perjury_statement_present: false,
    });
    expect(r.ok).toBe(false);
    expect(r.missing).toHaveLength(6);
  });
});

describe('validateMaterialDifferences', () => {
  it('blocks when no differences documented', () => {
    expect(validateMaterialDifferences({ documented_differences: [] }))
      .toEqual({ ok: false, reason: 'no_differences_documented' });
  });

  it('blocks when a documented difference lacks description', () => {
    expect(validateMaterialDifferences({
      documented_differences: [
        { category: 'warranty', description: 'Warranty void per US distribution agreement' },
        { category: 'labeling', description: '' },
      ],
    })).toEqual({ ok: false, reason: 'differences_lack_descriptions' });
  });

  it('passes with one well-described difference', () => {
    expect(validateMaterialDifferences({
      documented_differences: [
        { category: 'warranty', description: 'Warranty void per US distribution agreement §3.2' },
      ],
    })).toEqual({ ok: true });
  });

  it('passes with multiple well-described differences', () => {
    expect(validateMaterialDifferences({
      documented_differences: [
        { category: 'warranty', description: 'Warranty void' },
        { category: 'labeling', description: 'Missing bilingual safety labels' },
        { category: 'expiration_handling', description: 'Lot expiration relabeled' },
      ],
    })).toEqual({ ok: true });
  });
});
