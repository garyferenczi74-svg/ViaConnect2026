// Arnold www FAIL after #192 (935a7daf): Ready stayed on
// "Loading 3D avatar" + floor=hidden paint=pending. No Meshy GLB /
// model-viewer after hard refresh. Scan pipeline was OK.
//
// Contract:
//   1. Ready without GLB kicks Meshy and does not stay Loading forever.
//   2. Ready with a GLB URL mounts model-viewer (phone + desktop).
//   3. Meshy fail / timeout → honest notice, never wireframe / R3F.
//   4. R3F is never Ready success.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BodyCompositionAvatar } from '@/components/formavision/BodyCompositionAvatar';
import {
  FORMAVISION_PLATE_LOADING_NOTICE,
  FORMAVISION_PLATE_UNAVAILABLE_NOTICE,
  FormaVisionPlateNotice,
} from '@/components/formavision/FormaVisionPlateNotice';
import { estimateCircumferencesFromComposition } from '@/lib/body-tracker/composition/estimateCircumferencesFromComposition';
import { snapshotFromPhotoScanSummary } from '@/lib/body-tracker/composition/snapshotFromScanResult';
import {
  noSessionMeshyVisual,
  shouldKickMeshyCreate,
  timedOutMeshyVisual,
} from '@/hooks/formavision/useMeshyVisual';
import { emptyMeshyVisual } from '@/lib/formavision/meshy/meshyVisualState';
import { pickReadyFrblSessionId } from '@/lib/formavision/meshy/selectPlateMeshSource';
import {
  decideReadyNoticeKind,
  shouldTreatMeshyAsUnavailable,
} from '@/lib/formavision/viewer/meshyReadyWait';
import { selectReadyViewer } from '@/lib/formavision/viewer/selectReadyViewer';

const webRoot = process.cwd();
const GLB = 'https://storage.example/u/s/meshy/visual.glb?token=1';
const SESSION = '11111111-1111-4111-8111-111111111111';

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

function garyReadyScan() {
  return snapshotFromPhotoScanSummary({
    id: 'prod-ready-sep1',
    date: '2026-09-01',
    estimatedBodyFatMin: 30,
    estimatedBodyFatMax: 36,
    estimatedWhrMin: 0.84,
    estimatedWhrMax: 0.88,
  });
}

function renderReady(overrides: {
  meshyGlbUrl?: string | null;
  meshyStatus?: 'idle' | 'pending' | 'succeeded' | 'failed' | 'skipped_no_key';
  host?: 'phone' | 'desktop';
  meshySessionId?: string | null;
  meshyHistoryResolved?: boolean;
  meshyWaitExpired?: boolean;
} = {}) {
  const scan = garyReadyScan();
  const circumferences = estimateCircumferencesFromComposition(scan, 'male', 'in');
  return renderToStaticMarkup(
    React.createElement(BodyCompositionAvatar, {
      sex: 'male',
      scan,
      circumferences,
      girthSource: 'estimate',
      unit: 'in',
      activeTab: 'bodyFat',
      readyViewerHost: overrides.host ?? 'phone',
      meshyGlbUrl: overrides.meshyGlbUrl ?? null,
      meshyStatus: overrides.meshyStatus ?? 'idle',
      meshySessionId: overrides.meshySessionId ?? null,
      meshyHistoryResolved: overrides.meshyHistoryResolved ?? false,
      meshyWaitExpired: overrides.meshyWaitExpired,
      children: React.createElement(FormaVisionPlateNotice, { kind: 'unavailable' }),
    }),
  );
}

describe('1. Ready without GLB kicks Meshy and does not stay Loading forever', () => {
  it('existing Ready FRBL sessionId still POSTs create', () => {
    expect(shouldKickMeshyCreate(SESSION, null)).toBe(true);
    expect(
      pickReadyFrblSessionId([
        {
          id: 'photo-only',
          protocol: 'formavision_photo',
          captureStatus: 'ready',
          poses: { front: false, right: false, back: false, left: false },
        },
        {
          id: SESSION,
          protocol: '4pose_v1',
          captureStatus: 'ready',
          poses: { front: true, right: true, back: true, left: true },
        },
      ]),
    ).toBe(SESSION);
    const hook = src('src/hooks/formavision/useMeshyVisual.ts');
    expect(hook).toMatch(/shouldKickMeshyCreate\(sessionId, createdForRef\.current\)/);
    expect(hook).toMatch(/method: 'POST'/);
    expect(hook).toMatch(/shouldMarkMeshyCreateAttempted/);
    expect(hook).not.toMatch(/createdForRef\.current = sessionId;\s*await fetchJson/);
  });

  it('history-resolved Ready with no FRBL session is unavailable, not Loading', () => {
    expect(noSessionMeshyVisual().status).toBe('failed');
    expect(noSessionMeshyVisual().errorCode).toBe('no_photos');
    const markup = renderReady({
      meshyStatus: 'idle',
      meshyHistoryResolved: true,
      meshySessionId: null,
      host: 'desktop',
    });
    expect(markup).toContain(FORMAVISION_PLATE_UNAVAILABLE_NOTICE);
    expect(markup).not.toContain(FORMAVISION_PLATE_LOADING_NOTICE);
    expect(markup).toContain('data-ready-viewer="notice"');
    expect(markup).not.toContain('formavision-3d-mount');
    expect(markup).not.toContain('formavision-model-viewer-el');
  });

  it('in-flight Meshy still shows Loading, then flips after the wait bound', () => {
    const pending = renderReady({
      meshyStatus: 'pending',
      meshySessionId: SESSION,
      meshyHistoryResolved: true,
    });
    expect(pending).toContain(FORMAVISION_PLATE_LOADING_NOTICE);
    expect(pending).toContain('floor=hidden paint=pending');

    const expired = renderReady({
      meshyStatus: 'pending',
      meshySessionId: SESSION,
      meshyHistoryResolved: true,
      meshyWaitExpired: true,
    });
    expect(expired).toContain(FORMAVISION_PLATE_UNAVAILABLE_NOTICE);
    expect(expired).not.toContain(FORMAVISION_PLATE_LOADING_NOTICE);
    expect(shouldTreatMeshyAsUnavailable({
      meshyStatus: 'pending',
      meshyGlbUrl: null,
      waitExpired: true,
      historyResolved: true,
      sessionId: SESSION,
    })).toBe(true);
  });
});

describe('2. Ready with GLB URL mounts model-viewer on phone and desktop', () => {
  it('phone Ready + signed GLB is model-viewer, not a notice shroud', () => {
    expect(
      selectReadyViewer({
        host: 'phone',
        hasReadyScanData: true,
        meshyStatus: 'succeeded',
        meshyGlbUrl: GLB,
      }),
    ).toBe('model-viewer');
    const markup = renderReady({
      meshyGlbUrl: GLB,
      meshyStatus: 'succeeded',
      meshySessionId: SESSION,
      meshyHistoryResolved: true,
      host: 'phone',
    });
    expect(markup).toContain('data-ready-viewer="model-viewer"');
    expect(markup).toContain('formavision-model-viewer-el');
    expect(markup).toContain(GLB);
    expect(markup).toContain('data-mesh-look="meshy-glb"');
    expect(markup).not.toContain('formavision-3d-pending');
  });

  it('desktop Ready uses the same in-page model-viewer path', () => {
    const markup = renderReady({
      meshyGlbUrl: GLB,
      meshyStatus: 'succeeded',
      meshySessionId: SESSION,
      meshyHistoryResolved: true,
      host: 'desktop',
    });
    expect(markup).toContain('data-ready-viewer="model-viewer"');
    expect(markup).toContain('data-ready-host="desktop"');
    expect(markup).toContain('formavision-model-viewer-el');
    expect(markup).toContain(GLB);
  });
});

describe('3. Meshy fail/timeout → notice, never wireframe', () => {
  it('failed, timed-out, and skipped Meshy are text-only notices', () => {
    const failed = timedOutMeshyVisual(emptyMeshyVisual('t'));
    expect(failed.status).toBe('failed');
    expect(failed.errorCode).toBe('timeout');

    for (const status of ['failed', 'skipped_no_key'] as const) {
      const markup = renderReady({
        meshyStatus: status,
        meshyHistoryResolved: true,
        meshySessionId: SESSION,
        host: 'desktop',
      });
      expect(markup).toContain(FORMAVISION_PLATE_UNAVAILABLE_NOTICE);
      expect(markup).toContain('data-ready-viewer="notice"');
      expect(markup).toContain('data-mesh-look="notice"');
      expect(markup).not.toContain('formavision-model-viewer-el');
      expect(markup).not.toContain('formavision-3d-mount');
      expect(markup).not.toContain('repeating-linear-gradient');
      expect(markup).not.toContain('formavision-anatomical-floor');
    }
  });

  it('decideReadyNoticeKind never selects a wireframe body', () => {
    expect(
      decideReadyNoticeKind({
        meshyStatus: 'failed',
        meshyGlbUrl: null,
        waitExpired: true,
      }),
    ).toBe('unavailable');
    expect(selectReadyViewer({
      host: 'phone',
      hasReadyScanData: true,
      meshyStatus: 'failed',
      meshyGlbUrl: null,
    })).toBe('notice');
  });
});

describe('4. no R3F as Ready success', () => {
  it('phone and desktop Ready never mount the r3f canvas', () => {
    for (const host of ['phone', 'desktop'] as const) {
      const ok = renderReady({
        host,
        meshyGlbUrl: GLB,
        meshyStatus: 'succeeded',
        meshySessionId: SESSION,
        meshyHistoryResolved: true,
      });
      const miss = renderReady({
        host,
        meshyStatus: 'failed',
        meshySessionId: SESSION,
        meshyHistoryResolved: true,
      });
      expect(ok).toContain('data-r3f-parked="true"');
      expect(ok).not.toContain('data-ready-viewer="r3f"');
      expect(ok).not.toContain('formavision-3d-mount');
      expect(miss).toContain('data-r3f-parked="true"');
      expect(miss).not.toContain('data-ready-viewer="r3f"');
      expect(miss).not.toContain('formavision-3d-mount');
    }
  });

  it('product path still parks R3F and kicks Meshy for already-Ready sessions', () => {
    const avatar = src('src/components/formavision/BodyCompositionAvatar.tsx');
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    const hook = src('src/hooks/formavision/useMeshyVisual.ts');
    const viewer = src('src/components/formavision/FormaVisionModelViewer.tsx');
    expect(avatar).toMatch(/decideReadyNoticeKind/);
    expect(avatar).toMatch(/MESHY_READY_WAIT_MS/);
    expect(avatar).toMatch(/shouldParkR3fReady/);
    expect(page).toMatch(/useMeshyVisual\(readyFrblSessionId/);
    expect(page).toMatch(/historyResolved/);
    expect(page).toMatch(/meshySessionId=\{readyFrblSessionId\}/);
    expect(hook).toMatch(/MESHY_READY_WAIT_MS/);
    expect(hook).toMatch(/signedUrl/);
    expect(viewer).toMatch(/MESHY_PAINT_WAIT_MS/);
    expect(viewer).not.toMatch(/FormaVisionAnatomicalFloor/);
    expect(src('src/app/api/formavision/meshy/route.ts')).toMatch(/signedUrl/);
  });
});
