import { describe, expect, it } from 'vitest';
import {
  BIOLOGICAL_AGE_FRAMING_DRAFT,
  chronologicalAgeFromDob,
  estimateBiologicalAge,
  resolveBiologicalAge,
} from '../biological-age';

describe('biological-age v1', () => {
  it('is deterministic for the same inputs', () => {
    const inputs = { restingHR: 55, bodyFatPct: 18, metabolicAge: 40 };
    expect(estimateBiologicalAge(45, inputs)).toBe(estimateBiologicalAge(45, inputs));
  });

  it('does not move without real input signals (insufficient)', () => {
    const r = resolveBiologicalAge(45, {});
    expect(r.state).toBe('insufficient');
    expect(r.biologicalAge).toBeNull();
    expect(r.displayAge).toBe(45);
    expect(r.deltaYears).toBe(0);
  });

  it('never invents youth when only chronological age is known', () => {
    const r = resolveBiologicalAge(50, {});
    expect(r.displayAge).toBe(50);
    expect(r.state).toBe('insufficient');
  });

  it('blends metabolic age at 50 percent when present', () => {
    // chrono 40, metabolic 50 -> round(0.5*40 + 0.5*50) = 45
    expect(estimateBiologicalAge(40, { metabolicAge: 50 })).toBe(45);
  });

  it('applies resting HR younger adjustment', () => {
    expect(estimateBiologicalAge(40, { restingHR: 55 })).toBe(38);
  });

  it('computes chronological age from DOB', () => {
    const age = chronologicalAgeFromDob('1990-01-01', Date.parse('2026-01-01'));
    expect(age).toBe(36);
  });

  it('framing DRAFT copy never says Bio Optimization', () => {
    const blob = JSON.stringify(BIOLOGICAL_AGE_FRAMING_DRAFT);
    expect(blob).not.toMatch(/Bio Optimization/i);
    expect(blob).toMatch(/Biological Age/);
    expect(blob).toMatch(/DRAFT/);
  });

  it('lists missing contributors with next actions', () => {
    const r = resolveBiologicalAge(40, { restingHR: 58 });
    expect(r.state).toBe('estimated');
    const missing = r.contributors.filter((c) => c.direction === 'missing');
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.every((c) => c.detail === 'Not yet measured')).toBe(true);
  });
});
