// Prompt 211a W1: tests for the PURE clip caption builder.
//
// The load-bearing contract: caption numbers == computeCompositionDeltas (one-source),
// the estimated marker is carried onto a low-confidence stat, the arrow comes from the
// delta direction (never re-derived), lowConfidenceRangeWarning fires on a low range,
// and no caption field references an image (no raw photo, tokens only).

import { describe, it, expect } from 'vitest';
import {
  buildClipCaption,
  lowConfidenceRangeWarning,
  arrowForDirection,
  isDashClean,
  CAPTION_TOKENS,
  VIA_CURA_WORDMARK,
  type BuildClipCaptionInput,
} from '../composition';
import { computeCompositionDeltas } from '@/lib/formavision/deltas/compositionDeltas';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';

function snapshot(overrides: Partial<CompositionSnapshot> = {}): CompositionSnapshot {
  return {
    entryId: 'e',
    source: 'scan',
    recordedAt: '2026-01-01T00:00:00Z',
    totalBodyFatPct: null,
    regionFatPct: { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null },
    visceralFatRating: null,
    bodyWaterPct: null,
    regionMuscleLbs: { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null },
    totalMuscleMassLbs: null,
    skeletalMuscleMassLbs: null,
    ...overrides,
  };
}

function deltasFor(firstFat: number | null, latestFat: number | null) {
  return computeCompositionDeltas({
    firstComposition: snapshot({ totalBodyFatPct: firstFat }),
    latestComposition: snapshot({ totalBodyFatPct: latestFat }),
    firstCircumferences: null,
    latestCircumferences: null,
    unit: 'in',
  });
}

function baseInput(over: Partial<BuildClipCaptionInput> = {}): BuildClipCaptionInput {
  return {
    deltas: deltasFor(28, 24),
    firstScanDate: '2026-01-01T00:00:00Z',
    latestScanDate: '2026-07-01T00:00:00Z',
    ...over,
  };
}

describe('buildClipCaption: one-source (numbers == computeCompositionDeltas)', () => {
  it('headline from/to/change are byte-identical to the delta values', () => {
    const deltas = deltasFor(28, 24);
    const caption = buildClipCaption(baseInput({ deltas }));
    expect(caption.headline).not.toBeNull();
    // The delta values are the single source. The caption must mirror them exactly.
    expect(deltas.bodyFat!.from).toBe(28);
    expect(deltas.bodyFat!.to).toBe(24);
    expect(caption.headline!.fromText).toBe('28.0%');
    expect(caption.headline!.toText).toBe('24.0%');
    // |delta| = 4 -> "4.0%" (same formatter as BodyFatReadout).
    expect(caption.headline!.changeText).toBe('4.0%');
  });

  it('does NOT fabricate a headline when body fat is UNKNOWN on a side (no 0)', () => {
    const caption = buildClipCaption(baseInput({ deltas: deltasFor(null, 24) }));
    expect(caption.headline).toBeNull();
    expect(caption.estimatedMarkerText).toBeNull();
  });

  it('arrow is derived from the delta direction, not re-derived from the raw sign', () => {
    // Fat DOWN is "improved" -> down arrow (progress).
    const down = buildClipCaption(baseInput({ deltas: deltasFor(28, 24) }));
    expect(down.headline!.arrow).toBe('down');
    // Fat UP is "worsened" -> up arrow.
    const up = buildClipCaption(baseInput({ deltas: deltasFor(24, 28) }));
    expect(up.headline!.arrow).toBe('up');
  });

  it('arrowForDirection maps improved/worsened/unchanged/neutral correctly', () => {
    expect(arrowForDirection('improved')).toBe('down');
    expect(arrowForDirection('worsened')).toBe('up');
    expect(arrowForDirection('unchanged')).toBe('steady');
    expect(arrowForDirection('neutral')).toBe('steady');
  });
});

describe('buildClipCaption: estimated marker carried onto a low-confidence stat', () => {
  it('carries the estimated marker when latest body-fat confidence is low (< 0.45)', () => {
    const caption = buildClipCaption(baseInput({ latestBodyFatConfidence: 0.35 }));
    expect(caption.headline!.estimated).toBe(true);
    expect(caption.estimatedMarkerText).not.toBeNull();
    expect(caption.estimatedMarkerText!.toLowerCase()).toContain('estimated');
  });

  it('does NOT mark estimated on a high-confidence stat', () => {
    const caption = buildClipCaption(baseInput({ latestBodyFatConfidence: 0.9 }));
    expect(caption.headline!.estimated).toBe(false);
    expect(caption.estimatedMarkerText).toBeNull();
  });

  it('does NOT fabricate confidence when it is unknown (null / undefined)', () => {
    const unknown = buildClipCaption(baseInput({ latestBodyFatConfidence: null }));
    expect(unknown.headline!.estimated).toBe(false);
    const absent = buildClipCaption(baseInput());
    expect(absent.headline!.estimated).toBe(false);
  });
});

describe('buildClipCaption: no raw photo (tokens only, no image reference)', () => {
  it('references only the FormaVision token colors, never an image or data URI', () => {
    const caption = buildClipCaption(baseInput());
    // The token palette is exactly the brand hex values.
    expect(caption.tokens.canvas).toBe(FORMA_VISION_HEX.navy);
    expect(caption.tokens.wireframe).toBe(FORMA_VISION_HEX.teal);
    expect(caption.tokens).toBe(CAPTION_TOKENS);
    // No field anywhere in the caption may look like an image/photo reference.
    const serialized = JSON.stringify(caption);
    expect(serialized).not.toMatch(/data:image/i);
    expect(serialized).not.toMatch(/\.(png|jpe?g|webp|gif|bmp)/i);
    expect(serialized.toLowerCase()).not.toContain('photo');
    expect(serialized.toLowerCase()).not.toContain('blob:');
  });

  it('carries the Via Cura wordmark and Instrument Sans typeface', () => {
    const caption = buildClipCaption(baseInput());
    expect(caption.wordmark).toBe(VIA_CURA_WORDMARK);
    expect(caption.tokens.fontFamily).toBe('Instrument Sans');
  });

  it('every caption string is dash-clean (no em / en dash)', () => {
    const caption = buildClipCaption(baseInput({ latestBodyFatConfidence: 0.3 }));
    expect(isDashClean(caption.dateSpanText)).toBe(true);
    expect(isDashClean(caption.wordmark)).toBe(true);
    expect(isDashClean(caption.headline!.label)).toBe(true);
    expect(isDashClean(caption.estimatedMarkerText!)).toBe(true);
    // The date span joins with the word "to", not a dash.
    expect(caption.dateSpanText).toContain(' to ');
  });
});

describe('lowConfidenceRangeWarning', () => {
  it('fires when the range contains a low-confidence scan', () => {
    const warning = lowConfidenceRangeWarning([
      { recordedAt: '2026-01-01T00:00:00Z', confidence: 0.9 },
      { recordedAt: '2026-03-01T00:00:00Z', confidence: 0.3 }, // low
      { recordedAt: '2026-07-01T00:00:00Z', confidence: 0.8 },
    ]);
    expect(warning.hasLowConfidence).toBe(true);
    expect(warning.lowConfidenceCount).toBe(1);
    expect(warning.lowConfidenceDates).toEqual(['2026-03-01T00:00:00Z']);
    expect(warning.message).not.toBeNull();
  });

  it('does not fire on an all-high-confidence range', () => {
    const warning = lowConfidenceRangeWarning([
      { recordedAt: '2026-01-01T00:00:00Z', confidence: 0.9 },
      { recordedAt: '2026-07-01T00:00:00Z', confidence: 0.75 },
    ]);
    expect(warning.hasLowConfidence).toBe(false);
    expect(warning.lowConfidenceCount).toBe(0);
    expect(warning.message).toBeNull();
  });

  it('treats UNKNOWN confidence as not-low (never downgrades an unknown scan)', () => {
    const warning = lowConfidenceRangeWarning([
      { recordedAt: '2026-01-01T00:00:00Z', confidence: null },
      { recordedAt: '2026-07-01T00:00:00Z', confidence: null },
    ]);
    expect(warning.hasLowConfidence).toBe(false);
    expect(warning.message).toBeNull();
  });

  it('warning message is dash-clean', () => {
    const warning = lowConfidenceRangeWarning([
      { recordedAt: '2026-03-01T00:00:00Z', confidence: 0.2 },
    ]);
    expect(isDashClean(warning.message!)).toBe(true);
  });
});
