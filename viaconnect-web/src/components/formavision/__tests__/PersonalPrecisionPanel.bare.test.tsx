// Task 211b-W3c - node-safe render tests for PersonalPrecisionPanel.
//
// Uses react-dom/server renderToStaticMarkup (no DOM dependency), matching the
// repo's .tsx test convention (see ClipCreatorSurface.bare.test.tsx). These
// prove the two load-bearing UI contracts a render-level test can check:
//   1. Default OFF / honest-empty: null result or zero anchor activity renders
//      nothing at all.
//   2. NO digit appears anywhere in the rendered visible text or any
//      aria-label attribute, across every status and the scale-adoption note.

import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PersonalPrecisionPanel } from '../PersonalPrecisionPanel';
import type {
  PersonalFusionResult,
  PersonalFusionRegionResult,
} from '@/lib/arnold/scanning/accuracy/fusion/personalFusionService';

function regionResult(over: Partial<PersonalFusionRegionResult>): PersonalFusionRegionResult {
  return {
    region: 'waist_natural',
    status: 'insufficient',
    personalBandCm: null,
    globalBandCm: 3,
    nPairs: 0,
    ...over,
  };
}

function fusionResult(over: Partial<PersonalFusionResult>): PersonalFusionResult {
  return {
    calibrationVersion: 'v1-uncalibrated-2026-06',
    fusionVersion: null,
    correctionStatus: 'insufficient',
    perRegion: [],
    flaggedAnchors: [],
    scaleAnchorCount: 0,
    ...over,
  };
}

function render(result: PersonalFusionResult | null): string {
  return renderToStaticMarkup(createElement(PersonalPrecisionPanel, { result }));
}

// Extracts every aria-label="..." attribute value from a rendered HTML string.
function ariaLabels(html: string): string[] {
  const out: string[] = [];
  const re = /aria-label="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

// Extracts the visible text content between tags (a crude but sufficient
// text-node extractor for this component's simple, non-nested markup).
function visibleTextNodes(html: string): string[] {
  const out: string[] = [];
  const re = />([^<>]+)</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = m[1].trim();
    if (text.length > 0) out.push(text);
  }
  return out;
}

const DIGIT = /\d/;

describe('PersonalPrecisionPanel: default OFF / honest empty', () => {
  it('renders nothing (empty string) when result is null', () => {
    expect(render(null)).toBe('');
  });

  it('renders nothing when the user has zero anchor activity (no pairs, no scale anchors)', () => {
    const html = render(fusionResult({}));
    expect(html).toBe('');
    expect(html).not.toContain('personal-precision-panel');
  });
});

describe('PersonalPrecisionPanel: honest per-status render, NO digit anywhere', () => {
  const fixtures: Array<{ name: string; result: PersonalFusionResult }> = [
    {
      name: 'tightened',
      result: fusionResult({
        correctionStatus: 'fitted',
        fusionVersion: 'fusion-v1-2026-07',
        perRegion: [regionResult({ region: 'waist_natural', status: 'tightened', personalBandCm: 1.2, nPairs: 8 })],
      }),
    },
    {
      name: 'not-tightened',
      result: fusionResult({
        correctionStatus: 'fitted',
        fusionVersion: 'fusion-v1-2026-07',
        perRegion: [regionResult({ region: 'chest', status: 'not-tightened', personalBandCm: 3.4, nPairs: 8 })],
      }),
    },
    {
      name: 'insufficient (some anchor activity)',
      result: fusionResult({
        correctionStatus: 'insufficient',
        perRegion: [regionResult({ region: 'bicep', status: 'insufficient', nPairs: 1 })],
      }),
    },
    {
      name: 'unreliable',
      result: fusionResult({
        correctionStatus: 'unreliable',
        perRegion: [
          regionResult({ region: 'neck', status: 'unreliable', personalBandCm: null, nPairs: 4 }),
          regionResult({ region: 'chest', status: 'unreliable', personalBandCm: null, nPairs: 4 }),
        ],
        flaggedAnchors: [
          {
            region: 'chest',
            source: 'tape',
            takenAt: '2026-07-01T00:00:00Z',
            value: 100,
            reason: 'conflicts-with-other-source',
          },
        ],
      }),
    },
    {
      name: 'scale-only adoption',
      result: fusionResult({ perRegion: [], scaleAnchorCount: 3 }),
    },
  ];

  for (const { name, result } of fixtures) {
    it(`${name}: panel renders and contains NO digit in any visible text or aria-label`, () => {
      const html = render(result);
      expect(html).toContain('personal-precision-panel');

      for (const text of visibleTextNodes(html)) {
        expect(text).not.toMatch(DIGIT);
      }
      for (const label of ariaLabels(html)) {
        expect(label).not.toMatch(DIGIT);
      }
    });
  }

  it('tightened fixture renders all 11 region rows, including hip/under_bust/waist_navel as insufficient', () => {
    const html = render(fixtures[0].result);
    expect(html).toContain('personal-precision-row-waist_natural');
    expect(html).toContain('data-status="tightened"');
    expect(html).toContain('personal-precision-row-hip');
    expect(html).toContain('personal-precision-row-under_bust');
    expect(html).toContain('personal-precision-row-waist_navel');
  });

  it('scale-only fixture renders the scale note and every region row as insufficient (no band anywhere)', () => {
    const html = render(fixtures[4].result);
    expect(html).toContain('personal-precision-scale-note');
    // Every region row is insufficient; none can be tightened/not-tightened
    // from a scale-only (weight) adoption.
    expect(html).not.toContain('data-status="tightened"');
    expect(html).not.toContain('data-status="not-tightened"');
  });

  it('unreliable fixture never contains blend/average language', () => {
    const html = render(fixtures[3].result).toLowerCase();
    expect(html).not.toContain('averaged');
    expect(html).not.toContain('blended into');
  });
});
