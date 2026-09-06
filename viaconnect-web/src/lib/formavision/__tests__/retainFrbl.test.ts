import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: vi.fn() }),
}));

import { ScanHistory } from '@/components/scan/ScanHistory';
import { pickReadyFrblSessionId } from '@/lib/formavision/meshy/selectPlateMeshSource';
import { scanHistoryShowsFrblGrid, type ScanSummary } from '@/lib/scan/scanSummary';
import { photoScanToSummary } from '@/lib/scan/scanReadsShared';
import {
  DISCARD_FRBL_SHIELD,
  RETAIN_FRBL_CONSENT_BODY,
  RETAIN_FRBL_CONSENT_LABEL,
  RETAIN_FRBL_DEFAULT,
  RETAIN_FRBL_SHIELD,
  analyzeConsentCopy,
  discardedFrblPoses,
  historyFrblCopy,
  isRetainedFrblScan,
  posesFromSessionFullPaths,
  retainedFrblPoses,
  sessionIdForFrbl,
} from '@/lib/formavision/retainFrbl';
import {
  historyHasDiscardedPhotoScan,
  READY_UNAVAILABLE_VISUAL_FAILED,
  readyUnavailableCopy,
  selectReadyUnavailableReason,
} from '@/lib/formavision/twoProtocolCopy';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function scan(overrides: Partial<ScanSummary> = {}): ScanSummary {
  return {
    id: 'photo-1',
    date: '2026-09-06',
    protocol: 'formavision_photo',
    captureStatus: 'ready',
    poses: discardedFrblPoses(),
    ...overrides,
  };
}

describe('retain FRBL — discard vs retain', () => {
  it('defaults to discard and keeps shared consent copy', () => {
    expect(RETAIN_FRBL_DEFAULT).toBe(false);
    expect(analyzeConsentCopy(false)).toBe(DISCARD_FRBL_SHIELD);
    expect(analyzeConsentCopy(true)).toBe(RETAIN_FRBL_SHIELD);
    expect(RETAIN_FRBL_CONSENT_LABEL).toMatch(/Front, Right, Back, and Left/);
    expect(RETAIN_FRBL_CONSENT_BODY).toMatch(/opt in/i);
    expect(RETAIN_FRBL_CONSENT_BODY).toMatch(/3D/);
  });

  it('discarded photo rows keep poses.any false so pickReadyFrblSessionId is null', () => {
    const discarded = photoScanToSummary({
      id: 'photo-discard',
      scan_date: '2026-09-06',
      photos_retained: false,
      photo_session_id: null,
      retained_views: null,
    });
    expect(discarded.poses).toEqual(discardedFrblPoses());
    expect(discarded.photosRetained).toBe(false);
    expect(Object.values(discarded.poses).some(Boolean)).toBe(false);
    expect(pickReadyFrblSessionId([discarded])).toBeNull();
    expect(scanHistoryShowsFrblGrid(discarded)).toBe(false);
    expect(historyHasDiscardedPhotoScan([discarded])).toBe(true);
    expect(historyFrblCopy(discarded)).toBe('discarded');
  });

  it('retained_views flags without session *_full_path keep poses.any false', () => {
    const flagsOnly = photoScanToSummary({
      id: 'photo-flags',
      scan_date: '2026-09-06',
      photos_retained: true,
      photo_session_id: 'sess-flags-1',
      retained_views: ['front', 'right', 'back', 'left'],
    });
    expect(flagsOnly.poses).toEqual(discardedFrblPoses());
    expect(flagsOnly.photosRetained).toBe(false);
    expect(flagsOnly.frblSessionId).toBeNull();
    expect(Object.values(flagsOnly.poses).some(Boolean)).toBe(false);
    expect(pickReadyFrblSessionId([flagsOnly])).toBeNull();
    expect(scanHistoryShowsFrblGrid(flagsOnly)).toBe(false);
    expect(isRetainedFrblScan(flagsOnly)).toBe(false);
  });

  it('retained photo rows set poses.any only from body_photo_sessions *_full_path', () => {
    const sessionPaths = {
      front_full_path: 'u/sess-retain-1/front.jpg',
      right_full_path: 'u/sess-retain-1/right.jpg',
      back_full_path: 'u/sess-retain-1/back.jpg',
      left_full_path: 'u/sess-retain-1/left.jpg',
    };
    expect(posesFromSessionFullPaths(sessionPaths)).toEqual(
      retainedFrblPoses(['front', 'right', 'back', 'left']),
    );
    const retained = photoScanToSummary(
      {
        id: 'photo-retain',
        scan_date: '2026-09-06',
        photos_retained: true,
        photo_session_id: 'sess-retain-1',
        retained_views: ['front', 'right', 'back', 'left'],
      },
      sessionPaths,
    );
    expect(retained.photosRetained).toBe(true);
    expect(retained.frblSessionId).toBe('sess-retain-1');
    expect(retained.poses).toEqual(retainedFrblPoses(['front', 'right', 'back', 'left']));
    expect(Object.values(retained.poses).some(Boolean)).toBe(true);
    expect(pickReadyFrblSessionId([retained])).toBe('sess-retain-1');
    expect(scanHistoryShowsFrblGrid(retained)).toBe(true);
    expect(historyHasDiscardedPhotoScan([retained])).toBe(false);
    expect(isRetainedFrblScan(retained)).toBe(true);
    expect(sessionIdForFrbl(retained)).toBe('sess-retain-1');
  });

  it('history, Analyze, and Ready share the same retain constants', () => {
    const uploader = src('src/components/body-tracker/BodyScanUploader.tsx');
    const history = src('src/components/scan/ScanHistory.tsx');
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    const analyze = src('src/lib/body-tracker/composition/runFormaVisionAnalyze.ts');
    expect(uploader).toMatch(/RETAIN_FRBL_CONSENT_LABEL/);
    expect(uploader).toMatch(/analyzeConsentCopy/);
    expect(uploader).toMatch(/retainPhotos: retainFrbl/);
    expect(analyze).toMatch(/retainPhotos/);
    expect(analyze).toMatch(/retainFrblFn/);
    expect(history).toMatch(/scanHistoryShowsFrblGrid/);
    expect(page).toMatch(/pickReadyFrblSessionId/);
    expect(page).toMatch(/useTripoVisual/);
    const retainRoute = src('src/app/api/formavision/retain-frbl/route.ts');
    expect(retainRoute).toMatch(/_full_path/);
    expect(retainRoute).toMatch(/startMeshyForReadySession/);
    expect(retainRoute).toMatch(/startTripoForReadySession/);
    expect(retainRoute).not.toMatch(/SnapMeasure/);
  });

  it('ScanHistory shows the FRBL grid for retained photo scans and discard copy otherwise', () => {
    const discardedHtml = renderToStaticMarkup(
      React.createElement(ScanHistory, {
        scans: [scan()],
      }),
    );
    expect(discardedHtml).toContain('scan-history-photos-discarded-photo-1');

    const retainedHtml = renderToStaticMarkup(
      React.createElement(ScanHistory, {
        scans: [
          scan({
            photosRetained: true,
            frblSessionId: 'sess-retain-1',
            poses: { front: true, right: true, back: true, left: true },
          }),
        ],
      }),
    );
    expect(retainedHtml).not.toContain('scan-history-photos-discarded-photo-1');
    expect(retainedHtml).toContain('scan-history-photos-retained-photo-1');
    expect(retainedHtml).toContain('Photos kept for 3D and re-measure.');
    expect(discardedHtml).toContain('Photos are not stored after analysis.');
    expect(discardedHtml).not.toContain('Photos kept for 3D and re-measure.');
  });
});

describe('Ready notice selection — retain fail is honest, never wireframe', () => {
  it('selects visual-failed when a retained session exists but the GLB did not land', () => {
    expect(
      selectReadyUnavailableReason({
        historyResolved: true,
        readyFrblSessionId: 'sess-retain-1',
        hasDiscardedPhotoScan: false,
        visualFailed: true,
      }),
    ).toBe('visual-failed');
    expect(readyUnavailableCopy('visual-failed')).toBe(READY_UNAVAILABLE_VISUAL_FAILED);
    expect(READY_UNAVAILABLE_VISUAL_FAILED).not.toMatch(/wireframe|picasso|cyan/i);
    expect(READY_UNAVAILABLE_VISUAL_FAILED).not.toMatch(/clinical/i);
    expect(READY_UNAVAILABLE_VISUAL_FAILED).toMatch(/Photo estimate is still saved/i);
  });

  it('keeps photo-discarded when history resolved and no FRBL session', () => {
    expect(
      selectReadyUnavailableReason({
        historyResolved: true,
        readyFrblSessionId: null,
        hasDiscardedPhotoScan: true,
        visualFailed: false,
      }),
    ).toBe('photo-discarded');
  });
});
