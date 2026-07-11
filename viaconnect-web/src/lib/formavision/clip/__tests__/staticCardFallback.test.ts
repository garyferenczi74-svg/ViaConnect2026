// Prompt 211a W1: tests for the PURE static-card fallback composition data.
//
// Load-bearing contract: the fallback carries the SAME stats as the video caption
// (one-source), the honest note is "coming to iOS" for iOS and never claims a video,
// and it references only token colors (no raw photo).

import { describe, it, expect } from 'vitest';
import {
  buildStaticCardFallback,
  noteForReason,
  IOS_COMING_SOON_NOTE,
  STATIC_CARD_NOTE,
} from '../staticCardFallback';
import { buildClipCaption, isDashClean, type BuildClipCaptionInput } from '../composition';
import { computeCompositionDeltas } from '@/lib/formavision/deltas/compositionDeltas';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';

function snapshot(fat: number | null): CompositionSnapshot {
  return {
    entryId: 'e',
    source: 'scan',
    recordedAt: '2026-01-01T00:00:00Z',
    totalBodyFatPct: fat,
    regionFatPct: { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null },
    visceralFatRating: null,
    bodyWaterPct: null,
    regionMuscleLbs: { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null },
    totalMuscleMassLbs: null,
    skeletalMuscleMassLbs: null,
  };
}

function caption(over: Partial<BuildClipCaptionInput> = {}) {
  return buildClipCaption({
    deltas: computeCompositionDeltas({
      firstComposition: snapshot(28),
      latestComposition: snapshot(24),
      firstCircumferences: null,
      latestCircumferences: null,
      unit: 'in',
    }),
    firstScanDate: '2026-01-01T00:00:00Z',
    latestScanDate: '2026-07-01T00:00:00Z',
    ...over,
  });
}

describe('buildStaticCardFallback: same stats as the video caption (one-source)', () => {
  it('carries the caption date span, wordmark, and tokens verbatim', () => {
    const cap = caption();
    const card = buildStaticCardFallback(cap, 'ios');
    expect(card.dateSpanText).toBe(cap.dateSpanText);
    expect(card.wordmark).toBe(cap.wordmark);
    expect(card.tokens).toBe(cap.tokens);
  });

  it('renders the same headline numbers as the caption (28.0% to 24.0%)', () => {
    const card = buildStaticCardFallback(caption(), 'tier2d');
    expect(card.headlineLines[0]).toBe('Body fat: 28.0% to 24.0%');
    expect(card.headlineLines[1]).toBe('4.0% down');
  });

  it('shows no fabricated stat when the caption has no headline (body fat UNKNOWN)', () => {
    const noHeadline = buildClipCaption({
      deltas: computeCompositionDeltas({
        firstComposition: snapshot(null),
        latestComposition: snapshot(24),
        firstCircumferences: null,
        latestCircumferences: null,
        unit: 'in',
      }),
      firstScanDate: '2026-01-01T00:00:00Z',
      latestScanDate: '2026-07-01T00:00:00Z',
    });
    const card = buildStaticCardFallback(noHeadline, 'ios');
    expect(card.headlineLines).toEqual([]);
    expect(card.estimated).toBe(false);
  });

  it('carries the estimated marker from a low-confidence caption', () => {
    const card = buildStaticCardFallback(caption({ latestBodyFatConfidence: 0.3 }), 'ios');
    expect(card.estimated).toBe(true);
    expect(card.estimatedMarkerText).not.toBeNull();
  });
});

describe('buildStaticCardFallback: honest note, never a fake video', () => {
  it('uses the "coming to iOS" note for the iOS reason', () => {
    const card = buildStaticCardFallback(caption(), 'ios');
    expect(card.note).toBe(IOS_COMING_SOON_NOTE);
    expect(card.note.toLowerCase()).toContain('coming to ios');
  });

  it('uses the generic note for the 2d-floor and no-encode reasons', () => {
    expect(buildStaticCardFallback(caption(), 'tier2d').note).toBe(STATIC_CARD_NOTE);
    expect(buildStaticCardFallback(caption(), 'no_encode').note).toBe(STATIC_CARD_NOTE);
  });

  it('noteForReason maps reasons to the honest notes', () => {
    expect(noteForReason('ios')).toBe(IOS_COMING_SOON_NOTE);
    expect(noteForReason('tier2d')).toBe(STATIC_CARD_NOTE);
    expect(noteForReason('no_encode')).toBe(STATIC_CARD_NOTE);
  });

  it('never claims a video was produced (no "video was" / "your video")', () => {
    for (const reason of ['ios', 'tier2d', 'no_encode'] as const) {
      const note = noteForReason(reason).toLowerCase();
      expect(note).not.toContain('your video');
      expect(note).not.toContain('video is ready');
      expect(note).not.toContain('video was');
    }
  });
});

describe('buildStaticCardFallback: no raw photo (tokens only)', () => {
  it('references no image / data URI / photo anywhere', () => {
    const card = buildStaticCardFallback(caption({ latestBodyFatConfidence: 0.3 }), 'ios');
    const serialized = JSON.stringify(card);
    expect(serialized).not.toMatch(/data:image/i);
    expect(serialized).not.toMatch(/\.(png|jpe?g|webp|gif|bmp)/i);
    expect(serialized.toLowerCase()).not.toContain('photo');
    expect(serialized.toLowerCase()).not.toContain('blob:');
  });

  it('all card strings are dash-clean', () => {
    const card = buildStaticCardFallback(caption({ latestBodyFatConfidence: 0.3 }), 'ios');
    expect(isDashClean(card.note)).toBe(true);
    expect(isDashClean(card.dateSpanText)).toBe(true);
    expect(isDashClean(card.wordmark)).toBe(true);
    for (const line of card.headlineLines) expect(isDashClean(line)).toBe(true);
    if (card.estimatedMarkerText) expect(isDashClean(card.estimatedMarkerText)).toBe(true);
  });
});
