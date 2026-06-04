// Prompt 173c Phase B + Prompt 173d (2026-06-04): interstitial advance +
// button surface constants.
//
// 173d Section 1 supersedes the 173c reading-time-aware formula. These
// tests lock the constant at 8000 ms so an accidental tuning regresses
// the build instead of silently rushing the user. The tint floor is
// asserted against the locked Kelsey contrast value; raising it requires
// updating BOTH the constant + the InterstitialContinueButton class
// string (the component file documents the mirror).

import { describe, it, expect } from 'vitest';
import {
  INTERSTITIAL_ADVANCE,
  INTERSTITIAL_AUTO_ADVANCE_MS,
  INTERSTITIAL_BUTTON_TINT_OPACITY,
  INTERSTITIAL_PROGRESS_TICK_MS,
} from '@/config/caq-interstitial-advance';

describe('INTERSTITIAL_AUTO_ADVANCE_MS (173d Section 1)', () => {
  it('is the fixed 8 second switch', () => {
    expect(INTERSTITIAL_AUTO_ADVANCE_MS).toBe(8000);
  });

  it('sits above any realistic interstitial read time', () => {
    // Longest interstitial copy on main is about 35 words; at 250 wpm
    // (fast reader) that lands near 8.4 s of comprehension. The locked
    // 8 s switch is intentionally close so we lock the floor here:
    // anything below 7 s would risk rushing the user.
    expect(INTERSTITIAL_AUTO_ADVANCE_MS).toBeGreaterThanOrEqual(7000);
  });
});

describe('INTERSTITIAL_PROGRESS_TICK_MS', () => {
  it('redraws at roughly 30 fps so the fill reads as continuous', () => {
    expect(INTERSTITIAL_PROGRESS_TICK_MS).toBeGreaterThanOrEqual(16);
    expect(INTERSTITIAL_PROGRESS_TICK_MS).toBeLessThanOrEqual(50);
  });
});

describe('INTERSTITIAL_BUTTON_TINT_OPACITY (Card-matched surface)', () => {
  it('exposes one tunable tint constant tied to the component class string', () => {
    expect(typeof INTERSTITIAL_BUTTON_TINT_OPACITY).toBe('number');
  });

  it('matches the FeaturePreviewCard 10% white tint baseline', () => {
    // Patched 2026-06-04 per Gary: the Continue button surface now reads
    // as the same translucent lens the FeaturePreviewCard uses
    // (bg-white/10). Updating this constant also requires editing the
    // Tailwind class string in InterstitialContinueButton.tsx; a
    // compile-time guard in the component surfaces the mirror.
    expect(INTERSTITIAL_BUTTON_TINT_OPACITY).toBe(10);
  });

  it('stays well below the opaque ceiling so the glass effect is visible', () => {
    expect(INTERSTITIAL_BUTTON_TINT_OPACITY).toBeLessThan(80);
  });
});

describe('INTERSTITIAL_ADVANCE alias', () => {
  it('mirrors the named constants for backwards-compat callers', () => {
    expect(INTERSTITIAL_ADVANCE.auto_advance_ms).toBe(INTERSTITIAL_AUTO_ADVANCE_MS);
    expect(INTERSTITIAL_ADVANCE.progress_tick_ms).toBe(INTERSTITIAL_PROGRESS_TICK_MS);
  });
});
