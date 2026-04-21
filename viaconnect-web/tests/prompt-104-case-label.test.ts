// Prompt #104 Phase 2: Case label tests.

import { describe, it, expect } from 'vitest';
import { formatCaseLabel, parseCaseLabel, nextCaseLabel } from '@/lib/legal/caseLabel';

describe('formatCaseLabel', () => {
  it('formats a sequence with zero-padding', () => {
    expect(formatCaseLabel({ year: 2026, sequence_within_year: 42 })).toBe('LEG-2026-000042');
  });
  it('formats max sequence', () => {
    expect(formatCaseLabel({ year: 2026, sequence_within_year: 999_999 })).toBe('LEG-2026-999999');
  });
  it('rejects out-of-range year', () => {
    expect(() => formatCaseLabel({ year: 1999, sequence_within_year: 1 })).toThrow();
  });
  it('rejects sequence below 1', () => {
    expect(() => formatCaseLabel({ year: 2026, sequence_within_year: 0 })).toThrow();
  });
  it('rejects sequence above 999999', () => {
    expect(() => formatCaseLabel({ year: 2026, sequence_within_year: 1_000_000 })).toThrow();
  });
});

describe('parseCaseLabel', () => {
  it('parses a well-formed label', () => {
    expect(parseCaseLabel('LEG-2026-000042')).toEqual({ year: 2026, sequence_within_year: 42 });
  });
  it('returns null for malformed labels', () => {
    expect(parseCaseLabel('LEG-2026-42')).toBe(null);
    expect(parseCaseLabel('CASE-2026-000042')).toBe(null);
    expect(parseCaseLabel('')).toBe(null);
  });
});

describe('nextCaseLabel', () => {
  it('returns LEG-YYYY-000001 when no prior labels', () => {
    expect(nextCaseLabel({ year: 2026, existing_labels_for_year: [] })).toBe('LEG-2026-000001');
  });
  it('increments past the highest existing sequence', () => {
    expect(nextCaseLabel({
      year: 2026,
      existing_labels_for_year: ['LEG-2026-000001', 'LEG-2026-000005', 'LEG-2026-000003'],
    })).toBe('LEG-2026-000006');
  });
  it('ignores labels from other years', () => {
    expect(nextCaseLabel({
      year: 2026,
      existing_labels_for_year: ['LEG-2025-000099', 'LEG-2026-000002'],
    })).toBe('LEG-2026-000003');
  });
  it('ignores malformed labels', () => {
    expect(nextCaseLabel({
      year: 2026,
      existing_labels_for_year: ['LEG-2026-42', 'LEG-2026-000010'],
    })).toBe('LEG-2026-000011');
  });
});
