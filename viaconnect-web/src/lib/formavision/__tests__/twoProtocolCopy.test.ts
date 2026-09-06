import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScanHistory } from '@/components/scan/ScanHistory';
import { BodyScanResults } from '@/components/body-tracker/BodyScanResults';
import { FormaVisionPlateNotice } from '@/components/formavision/FormaVisionPlateNotice';
import type { ScanSummary } from '@/lib/scan/scanSummary';
import type { BodyScanResult } from '@/lib/body-tracker/composition/runFormaVisionAnalyze';
import {
  BODY_COMP_SAVE_TOAST,
  BODY_COMP_SCAN_PANEL_DESCRIPTION,
  BODY_SCAN_RESULTS_MUSCLE_IMPRESSION_TITLE,
  BODY_SCAN_RESULTS_NOT_MUSCLE_LBS,
  FORMAVISION_PHOTO_PROTOCOL,
  GUIDED_4POSE_PROTOCOL,
  GUIDED_4POSE_LABEL,
  MUSCLE_ANALYSIS_PHOTO_ONLY_EMPTY,
  PHOTO_ESTIMATE_LABEL,
  PHOTO_WHAT_YOU_DO_NOT_GET,
  PHOTO_WHAT_YOU_GET,
  READY_UNAVAILABLE_GENERIC,
  READY_UNAVAILABLE_PHOTO_DISCARDED,
  SCAN_HISTORY_PHOTOS_DISCARDED,
  UNKNOWN_PROTOCOL_LABEL,
  consumerProtocolLabel,
  formatPhotoSourcedBfChip,
  historyHasDiscardedPhotoScan,
  isPhotoOnlyMuscleEmpty,
  isPhotoSourcedBodyFat,
  readyUnavailableCopy,
  selectReadyUnavailableReason,
} from '../twoProtocolCopy';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const emptyMuscle = {
  right_arm: null as number | null,
  left_arm: null as number | null,
  trunk: null as number | null,
  right_leg: null as number | null,
  left_leg: null as number | null,
};

function scan(overrides: Partial<ScanSummary> = {}): ScanSummary {
  return {
    id: 'session-1',
    date: '2026-08-20',
    protocol: GUIDED_4POSE_PROTOCOL,
    captureStatus: 'ready',
    poses: { front: true, right: true, back: true, left: true },
    ...overrides,
  };
}

const photoResult: BodyScanResult = {
  scanId: 'scan-1',
  scanDate: '2026-09-06T00:00:00.000Z',
  estimates: {
    estimated_body_fat_min: 18,
    estimated_body_fat_max: 22,
    body_type: 'average',
    fat_distribution: 'even',
    estimated_whr_min: 0.8,
    estimated_whr_max: 0.86,
    muscle_development: { arms: 3, chest: 2, back: 2, core: 3, legs: 4 },
    ai_confidence: 'medium',
  },
};

describe('twoProtocolCopy — consumer labels', () => {
  it('names Photo estimate and Guided 4-pose; never prints raw protocol ids', () => {
    expect(consumerProtocolLabel(FORMAVISION_PHOTO_PROTOCOL)).toBe(PHOTO_ESTIMATE_LABEL);
    expect(consumerProtocolLabel(GUIDED_4POSE_PROTOCOL)).toBe(GUIDED_4POSE_LABEL);
    expect(consumerProtocolLabel('journal_v0')).toBe(UNKNOWN_PROTOCOL_LABEL);
    expect(consumerProtocolLabel('unknown')).toBe(UNKNOWN_PROTOCOL_LABEL);
    expect(PHOTO_ESTIMATE_LABEL).not.toMatch(/formavision_photo|4pose_v1/);
    expect(GUIDED_4POSE_LABEL).not.toMatch(/formavision_photo|4pose_v1/);
    expect(UNKNOWN_PROTOCOL_LABEL).not.toMatch(/formavision_photo|4pose_v1/);
  });

  it('photo what-you-get / what-you-do-not stay honest', () => {
    expect(PHOTO_WHAT_YOU_GET).toMatch(/body-fat range/i);
    expect(PHOTO_WHAT_YOU_GET).toMatch(/1–5/);
    expect(PHOTO_WHAT_YOU_DO_NOT_GET).toMatch(/discarded/i);
    expect(PHOTO_WHAT_YOU_DO_NOT_GET).toMatch(/regional fat/i);
    expect(PHOTO_WHAT_YOU_DO_NOT_GET).toMatch(/muscle lbs/i);
    expect(PHOTO_WHAT_YOU_DO_NOT_GET).toMatch(/Navy/i);
    expect(PHOTO_WHAT_YOU_DO_NOT_GET).not.toMatch(/lean mass filled|filled Muscle Analysis/i);
    expect(BODY_COMP_SCAN_PANEL_DESCRIPTION).toMatch(/Photo estimate/);
    expect(BODY_COMP_SAVE_TOAST).toBe('BF estimate saved.');
    expect(BODY_COMP_SAVE_TOAST).not.toMatch(/composition is up to date/i);
  });
});

describe('twoProtocolCopy — Ready unavailable selection', () => {
  it('selects photo-discarded when history resolved and no FRBL session', () => {
    expect(
      selectReadyUnavailableReason({
        historyResolved: true,
        readyFrblSessionId: null,
        hasDiscardedPhotoScan: true,
      }),
    ).toBe('photo-discarded');
    expect(readyUnavailableCopy('photo-discarded')).toBe(READY_UNAVAILABLE_PHOTO_DISCARDED);
    expect(READY_UNAVAILABLE_PHOTO_DISCARDED).toMatch(/discarded/i);
    expect(READY_UNAVAILABLE_PHOTO_DISCARDED).toMatch(/Guided 4-pose/);
    expect(READY_UNAVAILABLE_PHOTO_DISCARDED).not.toMatch(/wireframe/i);
  });

  it('keeps generic unavailable when there is no discarded photo scan', () => {
    expect(
      selectReadyUnavailableReason({
        historyResolved: true,
        readyFrblSessionId: null,
        hasDiscardedPhotoScan: false,
      }),
    ).toBe('generic');
    expect(
      selectReadyUnavailableReason({
        historyResolved: true,
        readyFrblSessionId: 'sess-ready',
        hasDiscardedPhotoScan: true,
      }),
    ).toBe('generic');
    expect(
      selectReadyUnavailableReason({
        historyResolved: false,
        readyFrblSessionId: null,
        hasDiscardedPhotoScan: true,
      }),
    ).toBe('generic');
    expect(readyUnavailableCopy('generic')).toBe(READY_UNAVAILABLE_GENERIC);
  });

  it('detects discarded photo rows in history', () => {
    expect(historyHasDiscardedPhotoScan(null)).toBe(false);
    expect(historyHasDiscardedPhotoScan([scan()])).toBe(false);
    expect(
      historyHasDiscardedPhotoScan([
        scan({ protocol: FORMAVISION_PHOTO_PROTOCOL, poses: { front: false, right: false, back: false, left: false } }),
      ]),
    ).toBe(true);
  });
});

describe('twoProtocolCopy — Muscle Analysis photo-only empty', () => {
  it('is empty when photo BF exists and muscle lbs are zero / missing', () => {
    expect(
      isPhotoOnlyMuscleEmpty({
        isEstimated: true,
        estimatedBodyFatMin: 29,
        estimatedBodyFatMax: 33,
        totalBodyFatPct: 31,
        regionMuscleLbs: emptyMuscle,
        totalMuscleMassLbs: null,
        skeletalMuscleMassLbs: 0,
      }),
    ).toBe(true);
    expect(
      isPhotoOnlyMuscleEmpty({
        isEstimated: true,
        estimatedBodyFatMin: 29,
        estimatedBodyFatMax: 33,
        regionMuscleLbs: { ...emptyMuscle, trunk: 42 },
        totalMuscleMassLbs: null,
      }),
    ).toBe(false);
    expect(
      isPhotoOnlyMuscleEmpty({
        isEstimated: false,
        totalBodyFatPct: 22,
        regionMuscleLbs: emptyMuscle,
      }),
    ).toBe(false);
    expect(isPhotoOnlyMuscleEmpty(null)).toBe(false);
    expect(MUSCLE_ANALYSIS_PHOTO_ONLY_EMPTY).toMatch(/Log Data/);
    expect(MUSCLE_ANALYSIS_PHOTO_ONLY_EMPTY).toMatch(/muscle mass \(lbs\)/);
  });
});

describe('twoProtocolCopy — Body Comp BF chip helper', () => {
  it('shows a labeled range for photo-sourced fat, never a bare clinical %', () => {
    expect(
      formatPhotoSourcedBfChip({
        isEstimated: true,
        estimatedBodyFatMin: 18,
        estimatedBodyFatMax: 22,
        totalBodyFatPct: 20,
      }),
    ).toBe('est. 18.0–22.0%');
    expect(
      formatPhotoSourcedBfChip({
        isEstimated: true,
        totalBodyFatPct: 21.3,
      }),
    ).toBe('est. 21.3%');
    expect(
      formatPhotoSourcedBfChip({
        deviceName: 'FormaVision',
        estimatedBodyFatMin: 29,
        estimatedBodyFatMax: 33,
      }),
    ).toBe('est. 29.0–33.0%');
    expect(
      formatPhotoSourcedBfChip({
        isEstimated: false,
        totalBodyFatPct: 21.3,
      }),
    ).toBeNull();
    expect(isPhotoSourcedBodyFat({ isEstimated: true })).toBe(true);
    expect(isPhotoSourcedBodyFat({})).toBe(false);
  });
});

describe('ScanHistory — two-protocol labels', () => {
  it('renders Photo estimate vs Guided 4-pose and keeps photos-discarded on photo rows', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, {
        scans: [
          scan({
            id: 'photo-1',
            protocol: FORMAVISION_PHOTO_PROTOCOL,
            poses: { front: false, right: false, back: false, left: false },
          }),
          scan({ id: 'guided-1', protocol: GUIDED_4POSE_PROTOCOL }),
        ],
      }),
    );
    expect(html).toContain(PHOTO_ESTIMATE_LABEL);
    expect(html).toContain(GUIDED_4POSE_LABEL);
    expect(html).toContain(SCAN_HISTORY_PHOTOS_DISCARDED);
    expect(html).toContain('scan-history-photos-discarded-photo-1');
    expect(html).not.toContain('formavision_photo');
    expect(html).not.toContain('4pose_v1');
  });
});

describe('FormaVisionPlateNotice — photo-discarded vs generic', () => {
  it('renders the photo-discarded Ready copy when selected', () => {
    const discarded = renderToStaticMarkup(
      React.createElement(FormaVisionPlateNotice, {
        kind: 'unavailable',
        unavailableReason: 'photo-discarded',
      }),
    );
    expect(discarded).toContain(READY_UNAVAILABLE_PHOTO_DISCARDED);
    expect(discarded).toContain('data-unavailable-reason="photo-discarded"');
    expect(discarded).not.toContain('wireframe');

    const generic = renderToStaticMarkup(
      React.createElement(FormaVisionPlateNotice, { kind: 'unavailable' }),
    );
    expect(generic).toContain(READY_UNAVAILABLE_GENERIC);
    expect(generic).toContain('data-unavailable-reason="generic"');
  });
});

describe('BodyScanResults — muscle impression strings', () => {
  it('retitles the 1–5 bars as impression, not Muscle Analysis lbs', () => {
    const html = renderToStaticMarkup(
      React.createElement(BodyScanResults, {
        result: photoResult,
        onRetake: () => undefined,
        onClose: () => undefined,
      }),
    );
    expect(html).toContain(BODY_SCAN_RESULTS_MUSCLE_IMPRESSION_TITLE);
    expect(html).toContain(BODY_SCAN_RESULTS_NOT_MUSCLE_LBS);
    expect(html).toContain('body-scan-results-muscle-impression-title');
    expect(html).toContain('body-scan-results-not-muscle-lbs');
    expect(html).not.toContain('Muscle Development');
    expect(html).toMatch(/For clinical accuracy/);
  });
});

describe('two-protocol surfaces stay wired to shared copy', () => {
  it('ScanHistory, Body Comp, Ready, and Analyze import the module', () => {
    const history = src('src/components/scan/ScanHistory.tsx');
    const results = src('src/components/body-tracker/BodyScanResults.tsx');
    const uploader = src('src/components/body-tracker/BodyScanUploader.tsx');
    const composition = src('src/app/(app)/(consumer)/body-tracker/composition/page.tsx');
    const formavision = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    const notice = src('src/components/formavision/FormaVisionPlateNotice.tsx');
    const cards = src('src/lib/body-tracker/composition/metricCards.ts');

    expect(history).toMatch(/consumerProtocolLabel/);
    expect(history).toMatch(/SCAN_HISTORY_PHOTOS_DISCARDED/);
    expect(results).toMatch(/BODY_SCAN_RESULTS_MUSCLE_IMPRESSION_TITLE/);
    expect(results).toMatch(/BODY_SCAN_RESULTS_NOT_MUSCLE_LBS/);
    expect(uploader).toMatch(/PHOTO_WHAT_YOU_GET/);
    expect(uploader).toMatch(/PHOTO_WHAT_YOU_DO_NOT_GET/);
    expect(composition).toMatch(/BODY_COMP_SCAN_PANEL_DESCRIPTION/);
    expect(composition).toMatch(/BODY_COMP_SAVE_TOAST/);
    expect(composition).toMatch(/muscle-analysis-photo-only-empty/);
    expect(composition).not.toMatch(/composition is up to date/);
    expect(formavision).toMatch(/selectReadyUnavailableReason/);
    expect(notice).toMatch(/readyUnavailableCopy/);
    expect(cards).toMatch(/formatPhotoSourcedBfChip/);
  });
});
