/**
 * Prompt 225: schema-level dose prohibition key set for kb_peptides.practitioner_depth.
 * Mirrors the CHECK constraint in 20260820130000_prompt_225_kb_peptides.sql.
 */

import { describe, expect, it } from 'vitest';

export const PEPTIDE_PRACTITIONER_DEPTH_FORBIDDEN_KEYS = [
  'dose',
  'dosage',
  'dosing',
  'amount',
  'frequency',
  'cycle',
  'titration',
  'reconstitution',
] as const;

function practitionerDepthViolatesDoseBan(
  depth: Record<string, unknown> | null | undefined,
): boolean {
  if (depth == null) return false;
  return PEPTIDE_PRACTITIONER_DEPTH_FORBIDDEN_KEYS.some((k) =>
    Object.prototype.hasOwnProperty.call(depth, k),
  );
}

describe('Prompt 225 practitioner_depth dose prohibition', () => {
  it('allows null / empty clinical context', () => {
    expect(practitionerDepthViolatesDoseBan(null)).toBe(false);
    expect(practitionerDepthViolatesDoseBan({})).toBe(false);
    expect(
      practitionerDepthViolatesDoseBan({
        monitoring_considerations: 'Baseline labs per clinician judgment',
        contraindication_classes: ['pregnancy'],
      }),
    ).toBe(false);
  });

  it('rejects every forbidden dose key', () => {
    for (const key of PEPTIDE_PRACTITIONER_DEPTH_FORBIDDEN_KEYS) {
      expect(
        practitionerDepthViolatesDoseBan({ [key]: 'anything' }),
        `expected ban for key ${key}`,
      ).toBe(true);
    }
  });
});
