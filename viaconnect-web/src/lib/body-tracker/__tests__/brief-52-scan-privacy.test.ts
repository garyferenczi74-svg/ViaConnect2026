// Brief 52: one Hannah-locked privacy sentence on 4-view capture + both compare surfaces.
// Source-as-text for the capture modal (Radix portal). renderToStaticMarkup for compare.

import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PHOTO_POSES } from '@/components/body-tracker/photos/poseConstants';
import { ComparisonPanel } from '@/components/body-tracker/photos/ComparisonPanel';
import { AbComparePanelContent } from '@/components/formavision/AbComparePanel';
import { SCAN_PRIVACY_LINE } from '@/lib/body-tracker/scanPrivacyCopy';

const ROOT = join(process.cwd(), 'src');
const HANNAH_LINE =
  'Four photos for this scan. Compare shows measurement change, not a public gallery.';

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

const CAPTURE = src('components/body-tracker/photos/PhotoSessionCapture.tsx');
const PHOTOS_COMPARE = src('components/body-tracker/photos/ComparisonPanel.tsx');
const AB_COMPARE = src('components/formavision/AbComparePanel.tsx');
const POSES = src('components/body-tracker/photos/poseConstants.ts');
const COPY = src('lib/body-tracker/scanPrivacyCopy.ts');

const SURFACES = [CAPTURE, PHOTOS_COMPARE, AB_COMPARE] as const;

function rendersPrivacyLine(source: string): boolean {
  return (
    source.includes("from '@/lib/body-tracker/scanPrivacyCopy'") &&
    source.includes('{SCAN_PRIVACY_LINE}')
  );
}

describe('Brief 52: one privacy line on 4-view capture and compare', () => {
  it('locks the exact Hannah sentence on SCAN_PRIVACY_LINE', () => {
    expect(SCAN_PRIVACY_LINE).toBe(HANNAH_LINE);
    expect(COPY).toContain(`'${HANNAH_LINE}'`);
  });

  it('renders the shared constant on capture and both compare surfaces', () => {
    expect(rendersPrivacyLine(CAPTURE)).toBe(true);
    expect(rendersPrivacyLine(PHOTOS_COMPARE)).toBe(true);
    expect(rendersPrivacyLine(AB_COMPARE)).toBe(true);
  });

  it('shows the exact sentence on photos compare markup', () => {
    const html = renderToStaticMarkup(createElement(ComparisonPanel));
    expect(html).toContain(HANNAH_LINE);
    expect(html).toContain('scan-privacy-line');
    expect(html).toContain('Compare sessions');
    expect(html).toContain('Tap two thumbnails below to pick a before and after.');
  });

  it('shows the exact sentence on FormaVision compare markup', () => {
    const html = renderToStaticMarkup(
      createElement(AbComparePanelContent, {
        comparable: true,
        compareOn: true,
        onToggle: () => undefined,
        baselineMode: 'last_scan',
        onBaselineModeChange: () => undefined,
        baselineKind: 'last_scan',
        wipeT: 0.5,
        onWipeTChange: () => undefined,
        deltas: [],
        placement: 'controls',
      }),
    );
    expect(html).toContain(HANNAH_LINE);
    expect(html).toContain('scan-privacy-line');
    expect(html).toContain('ab-compare-controls');
    expect(html).toContain('Last scan');
    expect(html).toContain('Protocol start');
    expect(html).toContain('ab-wipe-slider');
  });

  it('keeps the four A-pose IDs and no 2-pose path', () => {
    expect(PHOTO_POSES.map((p) => p.id)).toEqual(['front', 'back', 'left', 'right']);
    expect(PHOTO_POSES).toHaveLength(4);
    expect(POSES).not.toMatch(/2-pose|twoPose|two_pose|front_side_only|front\/side-only/i);
    expect(CAPTURE).not.toMatch(/2-pose|twoPose|two_pose|front_side_only/i);
    expect(AB_COMPARE).not.toContain('poseConstants');
  });

  it('adds no share-to-social CTA and does not rewrite photos compare IA', () => {
    for (const surface of SURFACES) {
      expect(surface).not.toMatch(/Share to |Share on |share-to-social|shareToSocial/i);
    }
    expect(PHOTOS_COMPARE).toContain('TimelineGallery');
    expect(PHOTOS_COMPARE).toContain('SideBySideComparison');
    expect(PHOTOS_COMPARE).toContain('OverlaySlider');
    expect(PHOTOS_COMPARE).toContain('Tap two thumbnails below to pick a before and after.');
    expect(PHOTOS_COMPARE).not.toContain('last-scan');
    expect(PHOTOS_COMPARE).not.toContain('protocol-start');
  });
});
