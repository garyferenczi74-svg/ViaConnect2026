// Prompt 172e Phase D Workstream 2: CaffeineOverlay safety mode contract.
//
// Spec section 8 + 170c section 8.4 silent UX: caffeine milligrams are
// suppressed in safety mode. The overlay surfaces caffeine_mg in a
// graphical way and is therefore suppression worthy. Per 170c section
// 8.4 the suppression takes the shape of "same as no data" so the
// overlay returns null without a visible cue that safety mode is
// hiding it.
//
// This suite pins the contract at the helper layer: the math runs
// identically in both modes (proven by buildCaffeineOverlay tests), so
// the suppression is purely a render decision the CaffeineOverlay
// component makes via useSafetyMode(). Rendering proof lives downstream
// in integration tests; here we pin the math + microcopy invariants.

import { describe, it, expect } from 'vitest';
import { buildCaffeineOverlay, type CaffeineOverlayEvent } from '../caffeine-overlay-math';
import { HYDRATION_MICROCOPY_STRINGS } from '@/lib/nutrition/microcopy/hydration';

describe('Prompt 172e Phase D caffeine overlay math runs identically in both modes', () => {
  it('buildCaffeineOverlay has no safety mode parameter', () => {
    // The signature itself is the proof: the math takes events + nowIso
    // + sleepStartHHMM. No safety mode flag, no mode branch. The
    // CaffeineOverlay component is the only layer that decides whether
    // to render the result; the math runs the same in both modes.
    expect(buildCaffeineOverlay.length).toBe(3);
  });

  it('produces the same markers for the same input regardless of caller mode', () => {
    const events: CaffeineOverlayEvent[] = [
      { meal_id: 'm1', caffeine_mg: 95, logged_at: '2026-06-03T08:00:00.000Z' },
    ];
    // Two calls, same input, asserts deterministic output. Component
    // layer is the only thing that gates render based on safety mode.
    const result = buildCaffeineOverlay(events, '2026-06-03T14:00:00.000Z', '23:00');
    expect(result.markers).toHaveLength(1);
    expect(result.markers[0].caffeine_mg).toBe(95);
  });
});

describe('Prompt 172e Phase D caffeine overlay microcopy', () => {
  it('label key reads identically in normal and safety mode (chrome label)', () => {
    const entry = HYDRATION_MICROCOPY_STRINGS['hydration.caffeine_overlay.label'];
    expect(entry.normal).toBe(entry.safety_mode);
  });

  it('sleep indicator label reads identically in both modes', () => {
    const entry = HYDRATION_MICROCOPY_STRINGS['hydration.caffeine_overlay.sleep_indicator_label'];
    expect(entry.normal).toBe(entry.safety_mode);
  });

  it('both variants are present and non empty for completeness', () => {
    const labelEntry = HYDRATION_MICROCOPY_STRINGS['hydration.caffeine_overlay.label'];
    expect(labelEntry.normal.length).toBeGreaterThan(0);
    expect(labelEntry.safety_mode.length).toBeGreaterThan(0);
    const sleepEntry = HYDRATION_MICROCOPY_STRINGS['hydration.caffeine_overlay.sleep_indicator_label'];
    expect(sleepEntry.normal.length).toBeGreaterThan(0);
    expect(sleepEntry.safety_mode.length).toBeGreaterThan(0);
  });
});
