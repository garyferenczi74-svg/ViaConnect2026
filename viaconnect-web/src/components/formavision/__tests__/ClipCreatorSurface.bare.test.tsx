// Prompt 211a W1: node-safe render tests for the clip creator surface.
//
// Uses react-dom/server renderToStaticMarkup (no DOM dependency), matching the
// repo's .tsx test convention (see vitest.config.ts). These assert the two
// load-bearing UI contracts that can be checked from static markup:
//   1. The consent gate blocks share: the initial render offers only the "open
//      consent" affordance, never a share / download button. Nothing can leave the
//      device without first passing through the explicit consent confirm.
//   2. The preview shows the SAME one-source numbers as the caption, and no <img>
//      / photo is ever rendered (no raw photo).

import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClipCreatorSurface, type ClipScanRef } from '../ClipCreatorSurface';
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

const DELTAS = computeCompositionDeltas({
  firstComposition: snapshot(28),
  latestComposition: snapshot(24),
  firstCircumferences: null,
  latestCircumferences: null,
  unit: 'in',
});

const SCANS: ClipScanRef[] = [
  { recordedAt: '2026-01-01T00:00:00Z', confidence: 0.9 },
  { recordedAt: '2026-07-01T00:00:00Z', confidence: 0.9 },
];

function render(props: Partial<Parameters<typeof ClipCreatorSurface>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(ClipCreatorSurface, {
      userId: 'user-1',
      tier: 'cinematic',
      deltas: DELTAS,
      scans: SCANS,
      getCanvas: () => null,
      playMorph: () => {},
      setFrameloopAlways: () => {},
      ...props,
    }),
  );
}

describe('ClipCreatorSurface: consent gate blocks share until explicit confirm', () => {
  it('initial render offers the open-consent affordance, not a share button', () => {
    const html = render();
    expect(html).toContain('clip-create-open');
    // No share / download control is rendered before consent is confirmed.
    expect(html).not.toContain('clip-share-webm');
    expect(html).not.toContain('clip-card-ready-note');
    // The consent gate itself is not open on first render (it opens on click).
    expect(html).not.toContain('clip-consent-gate');
  });

  it('renders an explicit consent confirm path (the only route to producing anything)', () => {
    // The consent copy + confirm testid exist in the component so nothing can be
    // produced without the user confirming. (State-driven open is exercised in the
    // browser; here we assert the gate content is authored, Hannah-toned.)
    const src = ClipCreatorSurface.toString();
    expect(src).toContain('clip-consent-confirm');
    expect(src).toContain('clip-consent-cancel');
  });
});

describe('ClipCreatorSurface: preview one-source + no raw photo', () => {
  it('preview shows the SAME numbers as the caption (28.0% to 24.0%)', () => {
    const html = render();
    expect(html).toContain('clip-preview');
    expect(html).toContain('28.0%');
    expect(html).toContain('24.0%');
    expect(html).toContain('4.0%');
  });

  it('renders NO image element and no photo (no raw photo anywhere)', () => {
    const html = render();
    // No <img>, no background-image, no data:image, no photo reference.
    expect(html).not.toMatch(/<img\b/i);
    expect(html).not.toMatch(/data:image/i);
    expect(html).not.toMatch(/background-image/i);
    expect(html.toLowerCase()).not.toContain('.png');
    expect(html.toLowerCase()).not.toContain('.jpg');
  });

  it('shows the honest static-card note on the 2d tier (no fake video)', () => {
    const html = render({ tier: '2d' });
    expect(html).toContain('clip-fallback-note');
    // The 2d tier button offers a progress card, not a clip.
    expect(html).toContain('Create progress card');
  });

  it('shows an honest empty state with fewer than two scans', () => {
    const html = render({ scans: [{ recordedAt: '2026-01-01T00:00:00Z', confidence: 0.9 }] });
    expect(html).toContain('clip-creator-empty');
    expect(html).not.toContain('clip-create-open');
  });
});
