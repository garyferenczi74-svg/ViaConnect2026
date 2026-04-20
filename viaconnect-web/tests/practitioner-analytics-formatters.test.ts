// Prompt #99 Phase 1 (Path A): Formatter tests.

import { describe, it, expect } from 'vitest';
import {
  formatBioOptScore,
  formatCompactCount,
  formatEngagementScore,
  formatPercent,
  formatPeriodDelta,
  formatRevenue,
  formatSignedDelta,
  formatTierConfidence,
} from '@/lib/practitioner-analytics/formatters';

describe('formatSignedDelta', () => {
  it('prefixes positive with +', () => {
    expect(formatSignedDelta(3)).toBe('+3');
    expect(formatSignedDelta(3, 1)).toBe('+3.0');
  });
  it('keeps negative sign as-is', () => {
    expect(formatSignedDelta(-2)).toBe('-2');
  });
  it('renders zero with no plus', () => {
    expect(formatSignedDelta(0)).toBe('0');
  });
});

describe('formatPercent', () => {
  it('handles ratio mode', () => {
    expect(formatPercent(0.72, { mode: 'ratio' })).toBe('72%');
    expect(formatPercent(0.725, { mode: 'ratio', fractionDigits: 1 })).toBe('72.5%');
  });
  it('handles percent mode (pass-through)', () => {
    expect(formatPercent(72, { mode: 'percent' })).toBe('72%');
  });
  it('defaults to percent mode with 0 fraction digits', () => {
    expect(formatPercent(47)).toBe('47%');
  });
});

describe('formatBioOptScore and formatEngagementScore', () => {
  it('formats a mid-range score', () => {
    expect(formatBioOptScore(73)).toBe('73');
    expect(formatEngagementScore(73)).toBe('73');
  });
  it('clamps to [0,100]', () => {
    expect(formatBioOptScore(-5)).toBe('0');
    expect(formatBioOptScore(120)).toBe('100');
  });
  it('rounds non-integers', () => {
    expect(formatBioOptScore(73.4)).toBe('73');
    expect(formatBioOptScore(73.6)).toBe('74');
  });
});

describe('formatRevenue', () => {
  it('formats cents without decimal places', () => {
    expect(formatRevenue(1_246_000)).toBe('$12,460');
  });
  it('does NOT render $0 as "Free" on revenue', () => {
    expect(formatRevenue(0)).toBe('$0');
  });
});

describe('formatPeriodDelta', () => {
  it('signed positive delta', () => {
    expect(formatPeriodDelta(120, 100)).toBe('+20%');
  });
  it('signed negative delta', () => {
    expect(formatPeriodDelta(80, 100)).toBe('-20%');
  });
  it('returns em-dash when previous is zero', () => {
    expect(formatPeriodDelta(12, 0)).toBe('—');
  });
});

describe('formatCompactCount', () => {
  it('renders < 1000 as-is', () => {
    expect(formatCompactCount(47)).toBe('47');
    expect(formatCompactCount(999)).toBe('999');
  });
  it('renders 1k to 9.9k with one decimal', () => {
    expect(formatCompactCount(1247)).toBe('1.2k');
  });
  it('renders 10k+ as rounded thousands', () => {
    expect(formatCompactCount(12_473)).toBe('12k');
  });
  it('renders millions with one decimal', () => {
    expect(formatCompactCount(2_500_000)).toBe('2.5M');
  });
});

describe('formatTierConfidence', () => {
  it('formats #19b tier confidence values', () => {
    expect(formatTierConfidence(0.72)).toBe('72%');
    expect(formatTierConfidence(0.86)).toBe('86%');
    expect(formatTierConfidence(0.96)).toBe('96%');
  });
});
