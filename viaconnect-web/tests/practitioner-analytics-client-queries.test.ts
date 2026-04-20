// Prompt #99 Phase 2 (Path A): pure helper tests for the browser-side
// loader module. The async fetch functions are exercised in e2e; here
// we cover the deterministic helpers that translate MV rows into
// display-ready shapes.

import { describe, it, expect } from 'vitest';
import {
  bucketSharePercent,
  deltaDirection,
  PRACTITIONER_VIEW_NAME,
} from '@/lib/practitioner-analytics/queries-client';

describe('deltaDirection', () => {
  it('returns up for positive', () => {
    expect(deltaDirection(5)).toBe('up');
  });
  it('returns down for negative', () => {
    expect(deltaDirection(-3)).toBe('down');
  });
  it('returns flat for zero', () => {
    expect(deltaDirection(0)).toBe('flat');
  });
});

describe('bucketSharePercent', () => {
  it('computes share for non-zero denominator', () => {
    expect(bucketSharePercent(3, 10)).toBe(30);
    expect(bucketSharePercent(7, 10)).toBe(70);
  });
  it('returns 0 for zero denominator (no divide-by-zero)', () => {
    expect(bucketSharePercent(5, 0)).toBe(0);
  });
  it('returns 0 for negative denominator', () => {
    expect(bucketSharePercent(5, -1)).toBe(0);
  });
  it('clamps above 100', () => {
    expect(bucketSharePercent(15, 10)).toBe(100);
  });
  it('clamps below 0', () => {
    expect(bucketSharePercent(-5, 10)).toBe(0);
  });
  it('rounds to nearest integer', () => {
    expect(bucketSharePercent(1, 3)).toBe(33);
    expect(bucketSharePercent(2, 3)).toBe(67);
  });
});

describe('PRACTITIONER_VIEW_NAME', () => {
  it('only references row-filtered wrapper views, never raw MVs', () => {
    for (const view of Object.values(PRACTITIONER_VIEW_NAME)) {
      expect(view.startsWith('v_practitioner_')).toBe(true);
      expect(view.endsWith('_mv')).toBe(false);
    }
  });
  it('covers all three live surfaces', () => {
    expect(PRACTITIONER_VIEW_NAME.practice_health).toBe('v_practitioner_practice_health');
    expect(PRACTITIONER_VIEW_NAME.protocols).toBe('v_practitioner_protocol_effectiveness');
    expect(PRACTITIONER_VIEW_NAME.engagement).toBe('v_practitioner_engagement_summary');
  });
});
