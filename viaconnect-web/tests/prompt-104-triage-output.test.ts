// Prompt #104 Phase 5: Triage output validator + medical claim tests.

import { describe, it, expect } from 'vitest';
import { parseTriageOutput, extractFirstJsonObject } from '@/lib/legal/ai/triageOutputSchema';
import { scanForMedicalClaims } from '@/lib/legal/ai/medicalClaimDetector';

const valid = {
  bucket: 'gray_market_material_differences',
  confidence: 0.87,
  rationale: 'Material differences documented (warranty void, repackaged).',
  evidence_citations: ['screenshot 2026-04-12', 'wholesale agreement §3.2'],
  has_medical_claim: false,
  medical_claim_quotes: [],
  suggested_template_family: 'cd_material_differences',
  suggested_priority: 'p2_high',
  blocking_concerns: [],
};

describe('parseTriageOutput', () => {
  it('accepts a well-formed response', () => {
    const r = parseTriageOutput(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.output.bucket).toBe('gray_market_material_differences');
  });

  it('rejects unknown bucket value', () => {
    const r = parseTriageOutput({ ...valid, bucket: 'unknown_bucket' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes('bucket invalid'))).toBe(true);
  });

  it('rejects out-of-range confidence', () => {
    expect(parseTriageOutput({ ...valid, confidence: 1.5 }).ok).toBe(false);
    expect(parseTriageOutput({ ...valid, confidence: -0.1 }).ok).toBe(false);
  });

  it('rejects non-string rationale', () => {
    expect(parseTriageOutput({ ...valid, rationale: 42 }).ok).toBe(false);
  });

  it('rejects when has_medical_claim missing', () => {
    expect(parseTriageOutput({ ...valid, has_medical_claim: undefined }).ok).toBe(false);
  });

  it('rejects unknown suggested_template_family', () => {
    expect(parseTriageOutput({ ...valid, suggested_template_family: 'cd_imaginary' }).ok).toBe(false);
  });

  it('accepts null suggested_template_family', () => {
    expect(parseTriageOutput({ ...valid, suggested_template_family: null }).ok).toBe(true);
  });

  it('rejects unknown priority', () => {
    expect(parseTriageOutput({ ...valid, suggested_priority: 'urgent' }).ok).toBe(false);
  });
});

describe('extractFirstJsonObject', () => {
  it('extracts the JSON block from prose surrounding it', () => {
    const text = `Here is my classification:\n\n${JSON.stringify(valid)}\n\nI hope this helps.`;
    const obj = extractFirstJsonObject(text);
    expect((obj as Record<string, unknown> | null)?.bucket).toBe('gray_market_material_differences');
  });

  it('returns null when no JSON object present', () => {
    expect(extractFirstJsonObject('No JSON here.')).toBe(null);
  });

  it('returns null when JSON is malformed', () => {
    expect(extractFirstJsonObject('{not actually json')).toBe(null);
  });
});

describe('scanForMedicalClaims', () => {
  it('flags explicit cure claims', () => {
    expect(scanForMedicalClaims('Cures cancer in 30 days').flagged).toBe(true);
  });
  it('flags treats X claims', () => {
    expect(scanForMedicalClaims('Treats diabetes naturally').flagged).toBe(true);
  });
  it('flags FDA-approved-for X', () => {
    expect(scanForMedicalClaims('FDA-approved for hypertension').flagged).toBe(true);
  });
  it('does NOT flag generic wellness language', () => {
    expect(scanForMedicalClaims('Supports immune health and energy').flagged).toBe(false);
    expect(scanForMedicalClaims('Helps with focus and clarity').flagged).toBe(false);
  });
  it('returns flagged=false for empty input', () => {
    expect(scanForMedicalClaims(null).flagged).toBe(false);
    expect(scanForMedicalClaims('').flagged).toBe(false);
  });
});
