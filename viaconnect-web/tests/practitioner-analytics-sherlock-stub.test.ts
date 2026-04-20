// Prompt #99 Phase 2 audit remediation: coverage for the Sherlock
// narrative stub. Every SherlockPage value must return a pending
// insight with non-empty copy and a documented confidence level.

import { describe, it, expect } from 'vitest';
import {
  getSherlockStubInsight,
  type SherlockPage,
} from '@/lib/practitioner-analytics/sherlock-stub';

const ALL_PAGES: readonly SherlockPage[] = [
  'practice_health',
  'cohorts',
  'protocols',
  'revenue',
  'engagement',
];

describe('getSherlockStubInsight', () => {
  it.each(ALL_PAGES)('returns a pending stub for %s', (page) => {
    const r = getSherlockStubInsight(page);
    expect(r.isPending).toBe(true);
    expect(r.generatedAt).toBeNull();
    expect(r.headline.length).toBeGreaterThan(5);
    expect(r.body.length).toBeGreaterThan(20);
    expect(['high', 'medium', 'low']).toContain(r.confidence);
  });

  it('returns a deterministic value for repeated calls on the same page', () => {
    const a = getSherlockStubInsight('engagement');
    const b = getSherlockStubInsight('engagement');
    expect(a).toEqual(b);
  });

  it('returns distinct headlines per page (no copy leakage)', () => {
    const headlines = ALL_PAGES.map((p) => getSherlockStubInsight(p).headline);
    const unique = new Set(headlines);
    expect(unique.size).toBe(ALL_PAGES.length);
  });

  it('never flags a suggestedAction in Path A stubs (real suggestions land in Path B)', () => {
    for (const page of ALL_PAGES) {
      expect(getSherlockStubInsight(page).suggestedAction).toBeNull();
    }
  });
});
