// Arnold tip + Jeffery Gate O/B for the #175 PRIMARY (3D never mounts after #174).
// Prod www dpl_9G7qh5EU / main cb1b82d8: getContext works, notice is honest, FRBL
// PASS — but canvas.length=0 because the r3f bundle throws
// `Cannot read properties of undefined (reading 'ReactCurrentBatchConfig')`
// before Canvas creates a <canvas>.
//
// ## Gate O — Observe (three hypotheses)
// H1 r3f/reconciler vs React 19: Fiber 8.18 peer is `react: ">=18 <19"` and
//    depends on react-reconciler ^0.27. That reconciler reads
//    `React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentBatchConfig`.
//    React 19.2 exports `__CLIENT_INTERNALS_…` with `{H,A,T,S}` and does NOT
//    export SECRET_INTERNALS or ReactCurrentBatchConfig. That is the exact throw.
// H2 Duplicate React: Next also ships `next/dist/compiled/react`. Two Reacts
//    usually throw "Invalid hook call", not this property-read. A single
//    React 19.2.8 instance already lacks SECRET_INTERNALS, so alias-only
//    cannot restore ReactCurrentBatchConfig.
// H3 WebGL / #174 false-negative: getContext succeeded on the smoke device;
//    notice was already honest. Not this crash.
//
// ## Gate O — Lock
// LOCKED: H1. Reproduced below against live React 19.2.8. H2 is defense-in-depth
// only. H3 already fixed by #174 and must not regress.
//
// ## Gate B — Blueprint (micro-fix)
// Align @react-three/fiber → v9 (bundled reconciler, peer react >=19 <19.3) and
// @react-three/drei → v10 (peer fiber ^9). Keep #174 honest fallback + notice
// above sex-toggles. Do not change WebGL probe / remount / portal host.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import React from 'react';
import { snapshotFromPhotoScanSummary } from '@/lib/body-tracker/composition/snapshotFromScanResult';
import {
  historySnapshotCanEstimateGirths,
  pickHistorySnapshotForAvatar,
} from '@/lib/body-tracker/composition/resolveAvatarCircumferences';
import {
  isReadyFormaVisionScan,
  scanSummaryHasEstimateRange,
  type ScanSummary,
} from '@/lib/scan/scanSummary';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

function pkg(): { dependencies: Record<string, string> } {
  return JSON.parse(src('package.json')) as { dependencies: Record<string, string> };
}

function readyPhoto(over: Partial<ScanSummary> = {}): ScanSummary {
  return {
    id: 'photo-sep1',
    date: '2026-09-01',
    protocol: 'formavision_photo',
    captureStatus: 'ready',
    poses: { front: false, right: false, back: false, left: false },
    estimatedBodyFatMin: 30,
    estimatedBodyFatMax: 36,
    estimatedWhrMin: 0.84,
    estimatedWhrMax: 0.88,
    ...over,
  };
}

type ReactLegacyInternals = {
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: {
    ReactCurrentBatchConfig?: unknown;
  };
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: Record<string, unknown>;
};

// Fiber 8 / react-reconciler 0.27 access pattern (the www crash).
function fiber8ReadReactCurrentBatchConfig(react: ReactLegacyInternals): unknown {
  const internals = react.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  return internals.ReactCurrentBatchConfig;
}

describe('Jeffery Gate O: lock ReactCurrentBatchConfig root cause', () => {
  it('H1 LOCKED: React 19.2 has no SECRET_INTERNALS.ReactCurrentBatchConfig', () => {
    expect(React.version).toMatch(/^19\./);
    const react = React as unknown as ReactLegacyInternals;
    expect(react.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED).toBeUndefined();
    const client = react.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    expect(client).toBeDefined();
    expect(client && 'ReactCurrentBatchConfig' in client).toBe(false);
  });

  it('H1 LOCKED: Fiber 8 access pattern throws the exact www message', () => {
    expect(() => fiber8ReadReactCurrentBatchConfig(React as unknown as ReactLegacyInternals)).toThrow(
      /Cannot read properties of undefined \(reading 'ReactCurrentBatchConfig'\)/,
    );
  });

  it('H2 rejected as primary: alias-only cannot restore the missing React 19 field', () => {
    const reactSrc = src('node_modules/react/cjs/react.production.js');
    expect(reactSrc).toMatch(/__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE/);
    expect(reactSrc).not.toMatch(/__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED/);
    expect(reactSrc).not.toMatch(/ReactCurrentBatchConfig/);
  });
});

describe('Arnold #175 PRIMARY: R3F v9 on React 19 so Canvas can mount', () => {
  it('aligns fiber/drei to React 19-compatible majors (package.json required)', () => {
    const deps = pkg().dependencies;
    expect(deps.react).toMatch(/^19\./);
    expect(deps['react-dom']).toMatch(/^19\./);
    expect(deps['@react-three/fiber']).toMatch(/^\^9\./);
    expect(deps['@react-three/drei']).toMatch(/^\^10\./);
    expect(deps['@react-three/fiber']).not.toMatch(/^\^8\./);
    expect(deps['@react-three/drei']).not.toMatch(/^\^9\./);
    const lock = src('package-lock.json');
    expect(lock).not.toMatch(/"node_modules\/@react-three\/fiber": \{\s*"version": "8\./);
    expect(lock).toMatch(/"node_modules\/@react-three\/fiber": \{\s*"version": "9\./);
    const fiberPkg = JSON.parse(src('node_modules/@react-three/fiber/package.json')) as {
      version: string;
      peerDependencies?: Record<string, string>;
      dependencies?: Record<string, string>;
    };
    expect(fiberPkg.version).toMatch(/^9\./);
    expect(fiberPkg.peerDependencies?.react ?? '').toMatch(/19/);
    expect(fiberPkg.dependencies?.['react-reconciler'] ?? '').not.toMatch(/0\.27/);
  });

  it('loads the fiber 9 Canvas export without a ReactCurrentBatchConfig throw', async () => {
    const fiber = await import('@react-three/fiber');
    expect(typeof fiber.Canvas).toBe('function');
    const fiberEsm = src('node_modules/@react-three/fiber/dist/events-156d8d12.esm.js');
    expect(fiberEsm).not.toMatch(/ReactCurrentBatchConfig/);
    expect(fiberEsm).not.toMatch(/__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED/);
  });

  it('does not regress the #174 honest-fallback + notice-above-toggles contract', () => {
    const avatar = src('src/components/formavision/BodyCompositionAvatar.tsx');
    const notice = src('src/components/formavision/FormaVisionFallbackNotice.tsx');
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    const canvas = src('src/components/formavision/FormaVisionCanvas.tsx');
    expect(avatar).toMatch(/shouldLatchFallback2d/);
    expect(avatar).toMatch(/setMountEpoch/);
    expect(avatar).toMatch(/probeWebGL/);
    expect(avatar).toMatch(/FormaVisionFallbackNotice/);
    expect(avatar).not.toMatch(/if \(!shouldLatchFallback2d\(probe\)\) \{\s*return;\s*\}/);
    expect(notice).toMatch(/formavision-fallback-2d/);
    expect(notice).toMatch(/FORMAVISION_FALLBACK_NOTICE_HOST_TESTID/);
    expect(page).toMatch(/formavision-fallback-notice-host/);
    expect(page).toMatch(/empty:hidden/);
    expect(page).not.toMatch(/className="contents"/);
    expect(canvas).toMatch(/setAttribute\('data-testid', 'formavision-avatar-canvas'\)/);
  });

  it('keeps the 3D mount path (no render-time hasWebGL latch)', () => {
    const threeD = src('src/components/formavision/FormaVision3DAvatar.tsx');
    const avatar = src('src/components/formavision/BodyCompositionAvatar.tsx');
    expect(threeD).toMatch(/formavision-3d-mount/);
    expect(threeD).toMatch(/FormaVisionCanvas/);
    expect(threeD).not.toMatch(/useMemo\(\(\) => hasWebGL\(\), \[\]\)/);
    expect(avatar).toMatch(/FormaVision3DAvatar/);
    expect(avatar).toMatch(/selectAvatarSurface/);
  });
});

describe('Arnold #175 secondary: Ready photo scan feeds Results + morph', () => {
  it('Ready FormaVision history is scan data even when composition history is empty', () => {
    expect(isReadyFormaVisionScan(readyPhoto())).toBe(true);
    expect(scanSummaryHasEstimateRange(readyPhoto())).toBe(true);
    expect(
      isReadyFormaVisionScan(
        readyPhoto({ protocol: '4pose_v1', estimatedBodyFatMin: null, estimatedBodyFatMax: null }),
      ),
    ).toBe(false);
  });

  it('photo-scan BF range becomes a morphable snapshot; missing range stays null', () => {
    const snap = snapshotFromPhotoScanSummary(readyPhoto());
    expect(snap).not.toBeNull();
    expect(snap?.source).toBe('scan');
    expect(snap?.isEstimated).toBe(true);
    expect(snap?.totalBodyFatPct).toBe(33);
    expect(historySnapshotCanEstimateGirths(snap)).toBe(true);
    expect(
      snapshotFromPhotoScanSummary(
        readyPhoto({ estimatedBodyFatMin: null, estimatedBodyFatMax: null }),
      ),
    ).toBeNull();
  });

  it('empty composition history prefers the Ready photo-scan snapshot', () => {
    const photo = snapshotFromPhotoScanSummary(readyPhoto());
    expect(pickHistorySnapshotForAvatar(null, [])).toBeNull();
    expect(photo).not.toBeNull();
    expect(historySnapshotCanEstimateGirths(null)).toBe(false);
    expect(pickHistorySnapshotForAvatar(null, [], photo)).toBe(photo);
  });

  it('page wires Your scans Ready rows into snapshot + empty-state', () => {
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    const history = src('src/lib/scan/scanReadsShared.ts');
    expect(page).toMatch(/pickReadyPhotoSnapshot/);
    expect(page).toMatch(/isReadyFormaVisionScan/);
    expect(page).toMatch(/onScansChange=\{setHistoryScans\}/);
    expect(page).toMatch(/hasReadyFormaVisionScan/);
    expect(page).toMatch(/readyPhotoSnapshot/);
    expect(history).toMatch(/estimated_body_fat_min/);
    expect(history).toMatch(/estimated_body_fat_max/);
  });
});
