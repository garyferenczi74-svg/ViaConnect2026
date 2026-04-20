// Prompt #100 — MAP compliance score + tier derivation tests.

import { describe, it, expect } from 'vitest';
import {
  computeMAPComplianceScore,
  computeMAPCompliance,
  deriveMAPComplianceTier,
} from '@/lib/map/scoring';

const clean = {
  yellowViolations90d: 0,
  orangeViolations90d: 0,
  redViolations90d: 0,
  blackViolations90d: 0,
  daysSinceLastViolation: 365,
  selfReportedRemediations: 0,
};

describe('computeMAPComplianceScore', () => {
  it('returns 100 for a spotless practitioner (capped)', () => {
    // 100 + min(36.5, 10) + 0 = 110, clamped to 100
    expect(computeMAPComplianceScore(clean)).toBe(100);
  });

  it('penalizes each severity at the documented weight', () => {
    expect(computeMAPComplianceScore({ ...clean, yellowViolations90d: 1, daysSinceLastViolation: 0 })).toBe(99);
    expect(computeMAPComplianceScore({ ...clean, orangeViolations90d: 1, daysSinceLastViolation: 0 })).toBe(97);
    expect(computeMAPComplianceScore({ ...clean, redViolations90d: 1, daysSinceLastViolation: 0 })).toBe(92);
    expect(computeMAPComplianceScore({ ...clean, blackViolations90d: 1, daysSinceLastViolation: 0 })).toBe(80);
  });

  it('caps the days-clean bonus at +10', () => {
    const sustained = computeMAPComplianceScore({ ...clean, daysSinceLastViolation: 1000 });
    expect(sustained).toBe(100);
  });

  it('caps the self-remediation bonus at +10', () => {
    const score = computeMAPComplianceScore({
      ...clean,
      daysSinceLastViolation: 0,
      selfReportedRemediations: 20,
    });
    expect(score).toBe(100);
  });

  it('clamps to [0, 100]', () => {
    const floor = computeMAPComplianceScore({
      ...clean,
      blackViolations90d: 20,
      daysSinceLastViolation: 0,
    });
    expect(floor).toBe(0);
  });
});

describe('deriveMAPComplianceTier', () => {
  it('Probation for score < 50', () => {
    expect(deriveMAPComplianceTier(25, { redViolations90d: 1, blackViolations90d: 0 })).toBe('Probation');
  });

  it('Bronze for 50 to 69', () => {
    expect(deriveMAPComplianceTier(60, { redViolations90d: 2, blackViolations90d: 0 })).toBe('Bronze');
  });

  it('Silver for 70 to 84', () => {
    expect(deriveMAPComplianceTier(80, { redViolations90d: 0, blackViolations90d: 0 })).toBe('Silver');
  });

  it('Gold for 85 to 94 OR for any score with red/black presence', () => {
    expect(deriveMAPComplianceTier(90, { redViolations90d: 0, blackViolations90d: 0 })).toBe('Gold');
    expect(deriveMAPComplianceTier(96, { redViolations90d: 1, blackViolations90d: 0 })).toBe('Gold');
    expect(deriveMAPComplianceTier(98, { redViolations90d: 0, blackViolations90d: 1 })).toBe('Gold');
  });

  it('Platinum only for 95+ AND 0 red/black in 90d', () => {
    expect(deriveMAPComplianceTier(95, { redViolations90d: 0, blackViolations90d: 0 })).toBe('Platinum');
    expect(deriveMAPComplianceTier(100, { redViolations90d: 0, blackViolations90d: 0 })).toBe('Platinum');
  });
});

describe('computeMAPCompliance', () => {
  it('combines score + tier in one call', () => {
    const r = computeMAPCompliance(clean);
    expect(r.score).toBe(100);
    expect(r.tier).toBe('Platinum');
  });

  it('surfaces Probation when black violations sink the score', () => {
    const r = computeMAPCompliance({ ...clean, blackViolations90d: 3, daysSinceLastViolation: 0 });
    expect(r.tier).toBe('Probation');
    expect(r.score).toBe(40);
  });
});
