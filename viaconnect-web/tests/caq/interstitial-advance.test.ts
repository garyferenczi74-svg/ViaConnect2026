// Prompt 173c Phase B (2026-06-04): interstitial advance delay math.

import { describe, it, expect } from 'vitest';
import {
  INTERSTITIAL_ADVANCE,
  computeAdvanceDelayMs,
  countInterstitialWords,
} from '@/config/caq-interstitial-advance';

describe('countInterstitialWords', () => {
  it('counts words across multiple fragments', () => {
    expect(countInterstitialWords('hello world', 'foo bar baz')).toBe(5);
  });

  it('ignores empty and nullish fragments', () => {
    expect(countInterstitialWords('three little words', null, undefined, '')).toBe(3);
  });

  it('collapses whitespace runs', () => {
    expect(countInterstitialWords('one\n\ntwo   three')).toBe(3);
  });

  it('returns zero when all fragments are empty', () => {
    expect(countInterstitialWords(undefined, null, '   ')).toBe(0);
  });
});

describe('computeAdvanceDelayMs', () => {
  it('returns the floor (min_ms) for a short teaser', () => {
    // 5 words / 3.5 wps = 1428 ms + 1500 base = 2928 -> floor 4000.
    expect(computeAdvanceDelayMs(5)).toBe(INTERSTITIAL_ADVANCE.min_ms);
  });

  it('lands near 7 seconds for a typical 20-word card', () => {
    // 20 / 3.5 = 5714 + 1500 base = 7214 -> in band.
    const delay = computeAdvanceDelayMs(20);
    expect(delay).toBeGreaterThanOrEqual(7000);
    expect(delay).toBeLessThan(7500);
  });

  it('returns the ceiling (max_ms) for a very long card', () => {
    // 100 words / 3.5 wps = 28571 ms + 1500 base = 30071 -> ceiling 9000.
    expect(computeAdvanceDelayMs(100)).toBe(INTERSTITIAL_ADVANCE.max_ms);
  });

  it('treats negative or non-finite word counts as zero', () => {
    expect(computeAdvanceDelayMs(-5)).toBe(INTERSTITIAL_ADVANCE.min_ms);
    expect(computeAdvanceDelayMs(Number.NaN)).toBe(INTERSTITIAL_ADVANCE.min_ms);
    expect(computeAdvanceDelayMs(Number.POSITIVE_INFINITY)).toBe(INTERSTITIAL_ADVANCE.max_ms);
  });

  it('respects the configured constants when caller overrides them', () => {
    const tightConfig = {
      base_ms: 1000,
      words_per_second: 3.5,
      min_ms: 2000,
      max_ms: 5000,
      progress_tick_ms: 33,
    } as const;
    // 50 words / 3.5 = 14285 + 1000 = 15285 -> ceiling 5000.
    expect(computeAdvanceDelayMs(50, tightConfig)).toBe(5000);
    // 0 words / 3.5 = 0 + 1000 = 1000 -> floor 2000.
    expect(computeAdvanceDelayMs(0, tightConfig)).toBe(2000);
  });
});
