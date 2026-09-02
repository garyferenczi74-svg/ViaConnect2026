// Arnold tip + Jeffery Gate O/B for the #176 PRIMARY (BF morph after #175).
// Prod www dpl_FB6dGhLL / main d203717: canvas mounts (ReactCurrentBatchConfig
// fixed) but Ready scan BF 31% still paints the lean sex-template silhouette —
// the same class as pre-#171/#172 when girths never reach morphTo.
//
// ## Gate O — Observe (reinforce after picker fix)
// H1: composition-first picker (template-BF 18%) — fixed in the prior revision.
// H4 LOCKED: estimate girths from Ready BF 31% were computed but did not drive
//    the mesh. Mount is keyed on buildOptions only; first Canvas paint is the
//    sex template. First morph effect is a no-op. Later morphTo can cancel on
//    the demand loop. Arnold sees lean cyan + no data-morph attrs →
//    INCONCLUSIVE → lean FAIL.
//
// ## Gate B — Blueprint (micro-fix)
// 1. Remount geometry when girth presence flips template→applied.
// 2. Stamp data-morph / data-morph-bf / data-morph-waist-m on the real canvas.
// 3. Keep Ready-photo picker, #174/#175 contracts, NO-FABRICATION.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { emptyMeasurements } from '@/lib/body-tracker/circumference';
import { estimateCircumferencesFromComposition } from '@/lib/body-tracker/composition/estimateCircumferencesFromComposition';
import {
  historySnapshotCanEstimateGirths,
  pickHistorySnapshotForAvatar,
  pickReadyPhotoSnapshot,
  resolveAvatarCircumferences,
} from '@/lib/body-tracker/composition/resolveAvatarCircumferences';
import { snapshotFromPhotoScanSummary } from '@/lib/body-tracker/composition/snapshotFromScanResult';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import { buildBodyGeometry } from '@/lib/formavision/geometry/buildBodyGeometry';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import { MALE_TEMPLATE } from '@/lib/formavision/geometry/types';
import { shouldHoldScrubMorph } from '@/lib/formavision/motion/shouldHoldScrubMorph';
import { buildAvatarMorphStamp } from '@/lib/formavision/morph/avatarMorphStamp';
import {
  formatScanEstimateBfRange,
  isReadyFormaVisionScan,
  type ScanSummary,
} from '@/lib/scan/scanSummary';
import * as THREE from 'three';

const webRoot = process.cwd();

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

const EMPTY_REGION = {
  right_arm: null,
  left_arm: null,
  trunk: null,
  right_leg: null,
  left_leg: null,
};

function readyPhoto(over: Partial<ScanSummary> = {}): ScanSummary {
  return {
    id: 'photo-ready-31',
    date: '2026-09-01',
    protocol: 'formavision_photo',
    captureStatus: 'ready',
    poses: { front: false, right: false, back: false, left: false },
    estimatedBodyFatMin: 29,
    estimatedBodyFatMax: 33,
    estimatedWhrMin: 0.84,
    estimatedWhrMax: 0.88,
    ...over,
  };
}

function leanCompositionLatest(): CompositionSnapshot {
  return {
    entryId: 'entry-template-bf',
    source: 'scan',
    recordedAt: '2026-08-01T12:00:00.000Z',
    totalBodyFatPct: 18,
    regionFatPct: { ...EMPTY_REGION },
    visceralFatRating: null,
    bodyWaterPct: null,
    regionMuscleLbs: { ...EMPTY_REGION },
    totalMuscleMassLbs: null,
    skeletalMuscleMassLbs: null,
    scanId: 'old-scan',
    estimatedBodyFatMin: 17,
    estimatedBodyFatMax: 19,
    isEstimated: true,
  };
}

function meanRadiusAtY(geometry: THREE.BufferGeometry, targetY: number, bandM: number): number {
  const pos = geometry.getAttribute('position');
  let sum = 0;
  let count = 0;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    if (Math.abs(y - targetY) <= bandM) {
      sum += Math.hypot(pos.getX(i), pos.getZ(i));
      count += 1;
    }
  }
  return count > 0 ? sum / count : 0;
}

function morphFromHistory(history: CompositionSnapshot | null) {
  const circs = resolveAvatarCircumferences({
    overlay: null,
    measured: emptyMeasurements(),
    historySnapshot: history,
    sex: 'male',
    unit: 'in',
  });
  const vector = scanToParamVector({
    snapshot: history,
    circumferences: circs,
    sex: 'male',
    unit: 'in',
  });
  return { circs, vector };
}

describe('Jeffery Gate O: lock Ready BF 31% → lean-template morph', () => {
  it('H1 LOCKED: composition template-BF 18% estimates the male template waist', () => {
    const lean = leanCompositionLatest();
    expect(historySnapshotCanEstimateGirths(lean)).toBe(true);
    const { vector } = morphFromHistory(lean);
    expect(vector.rings.find((r) => r.id === 'waist')?.circumferenceM).toBeCloseTo(0.9, 3);
  });

  it('H1 LOCKED: pre-fix picker would keep the lean composition over Ready 31%', () => {
    const photo = snapshotFromPhotoScanSummary(readyPhoto());
    const lean = leanCompositionLatest();
    // Old page: if composition can estimate, ignore Ready photo.
    const preFix = historySnapshotCanEstimateGirths(lean) ? lean : photo;
    expect(preFix).toBe(lean);
    expect(morphFromHistory(preFix).vector.rings.find((r) => r.id === 'waist')?.circumferenceM).toBeCloseTo(
      0.9,
      3,
    );
  });
});

describe('Arnold #176 PRIMARY: Ready photo BF drives girth morphTo', () => {
  it('Ready BF ~31% with empty composition yields non-template waist circs', () => {
    const photo = pickReadyPhotoSnapshot([readyPhoto()]);
    expect(photo).not.toBeNull();
    expect(photo?.totalBodyFatPct).toBe(31);
    expect(historySnapshotCanEstimateGirths(photo)).toBe(true);

    const history = pickHistorySnapshotForAvatar(null, [], photo);
    const { circs, vector } = morphFromHistory(history);
    expect(anyFiniteGirth(circs)).toBe(true);
    expect(shouldHoldScrubMorph(null, circs)).toBe(false);
    const waist = vector.rings.find((r) => r.id === 'waist')?.circumferenceM;
    expect(waist).toBeTruthy();
    expect(waist).not.toBe(0.9);
    expect(waist).toBeGreaterThan(0.9);

    const template = scanToParamVector({
      snapshot: null,
      circumferences: null,
      sex: 'male',
      unit: 'in',
    });
    const waistY = MALE_TEMPLATE.rings.find((r) => r.id === 'waist')!.levelN * MALE_TEMPLATE.heightM;
    const morphGeo = buildBodyGeometry(vector);
    const templateGeo = buildBodyGeometry(template);
    const morphR = meanRadiusAtY(morphGeo.geometry, waistY, 0.02);
    const templateR = meanRadiusAtY(templateGeo.geometry, waistY, 0.02);
    expect(morphR).toBeGreaterThan(templateR * 1.05);
    morphGeo.dispose();
    templateGeo.dispose();
  });

  it('Ready photo BF 31% wins over a lean composition latest (template 18%)', () => {
    const photo = pickReadyPhotoSnapshot([readyPhoto()]);
    const history = pickHistorySnapshotForAvatar(leanCompositionLatest(), [], photo);
    expect(history).toBe(photo);
    const { vector } = morphFromHistory(history);
    expect(vector.rings.find((r) => r.id === 'waist')?.circumferenceM).not.toBe(0.9);
  });

  it('does not invent girths when Ready has no estimate range (NO-FABRICATION)', () => {
    const emptyReady = readyPhoto({
      estimatedBodyFatMin: null,
      estimatedBodyFatMax: null,
      estimatedWhrMin: null,
      estimatedWhrMax: null,
    });
    expect(isReadyFormaVisionScan(emptyReady)).toBe(true);
    expect(pickReadyPhotoSnapshot([emptyReady])).toBeNull();
    expect(snapshotFromPhotoScanSummary(emptyReady)).toBeNull();
    const circs = resolveAvatarCircumferences({
      overlay: null,
      measured: emptyMeasurements(),
      historySnapshot: null,
      sex: 'male',
      unit: 'in',
    });
    expect(circs).toBeNull();
    const honest = scanToParamVector({
      snapshot: null,
      circumferences: circs,
      sex: 'male',
      unit: 'in',
    });
    expect(honest.rings.find((r) => r.id === 'waist')?.circumferenceM).toBeNull();
  });

  it('coerces string and snake_case estimate fields from the Ready row', () => {
    const fromStrings = snapshotFromPhotoScanSummary({
      id: 'photo-str',
      date: '2026-09-01',
      estimatedBodyFatMin: '29',
      estimatedBodyFatMax: '33',
    });
    expect(fromStrings?.totalBodyFatPct).toBe(31);
    expect(historySnapshotCanEstimateGirths(fromStrings)).toBe(true);

    const fromSnake = snapshotFromPhotoScanSummary({
      id: 'photo-snake',
      date: '2026-09-01',
      estimated_body_fat_min: 29,
      estimated_body_fat_max: 33,
    });
    expect(fromSnake?.totalBodyFatPct).toBe(31);
  });

  it('overlay estimate circs still beat Ready history (live Results)', () => {
    const photo = pickReadyPhotoSnapshot([readyPhoto()]);
    const overlay = estimateCircumferencesFromComposition(photo, 'male', 'in');
    const resolved = resolveAvatarCircumferences({
      overlay,
      measured: emptyMeasurements(),
      historySnapshot: photo,
      sex: 'male',
      unit: 'in',
    });
    expect(resolved).toEqual(overlay);
  });

  it('estimate girths from Ready 31% stamp applied + non-template waist for Arnold', () => {
    const photo = pickReadyPhotoSnapshot([readyPhoto()]);
    const { circs } = morphFromHistory(photo);
    const stamp = buildAvatarMorphStamp({
      scan: photo,
      circumferences: circs,
      sex: 'male',
      unit: 'in',
      source: 'estimate',
    });
    expect(stamp.morph).toBe('applied');
    expect(stamp.source).toBe('estimate');
    expect(stamp.bf).toBe('31.0');
    expect(Number(stamp.waistM)).toBeGreaterThan(0.9);
  });

  it('page + Your scans wire Ready BF into the avatar picker (not composition-first)', () => {
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    const history = src('src/components/scan/ScanHistory.tsx');
    const resolve = src('src/lib/body-tracker/composition/resolveAvatarCircumferences.ts');
    expect(page).toMatch(/pickReadyPhotoSnapshot/);
    expect(page).toMatch(/pickHistorySnapshotForAvatar\(/);
    expect(page).toMatch(/readyPhotoSnapshot/);
    expect(page).toMatch(/resolveAvatarCircumferences/);
    expect(page).toMatch(/circumferences=\{avatarCircumferences\}/);
    expect(page).toMatch(/girthSource=\{avatarGirthSource\}/);
    expect(resolve).toMatch(/if \(historySnapshotCanEstimateGirths\(readyPhoto\)\) return readyPhoto/);
    const canvas = src('src/components/formavision/FormaVisionCanvas.tsx');
    expect(canvas).toMatch(/applyAvatarMorphStamp/);
    expect(canvas).toMatch(/data-morph/);
    expect(canvas).toMatch(/hasGirth/);
    expect(canvas).toMatch(/bodyVectorHasFiniteGirth/);
    expect(history).toMatch(/formatScanEstimateBfRange/);
    expect(history).toMatch(/scan-history-bf-/);
    expect(formatScanEstimateBfRange(readyPhoto())).toBe('29.0–33.0%');
  });

  it('does not regress the #174/#175 honest-fallback + R3F v9 mount contract', () => {
    const avatar = src('src/components/formavision/BodyCompositionAvatar.tsx');
    const page = src('src/app/(app)/(consumer)/body-tracker/formavision/page.tsx');
    const canvas = src('src/components/formavision/FormaVisionCanvas.tsx');
    const threeD = src('src/components/formavision/FormaVision3DAvatar.tsx');
    const pkg = JSON.parse(src('package.json')) as { dependencies: Record<string, string> };
    expect(avatar).toMatch(/shouldLatchFallback2d/);
    expect(avatar).toMatch(/FormaVisionFallbackNotice/);
    expect(page).toMatch(/formavision-fallback-notice-host/);
    expect(page).toMatch(/empty:hidden/);
    expect(canvas).toMatch(/setAttribute\('data-testid', 'formavision-avatar-canvas'\)/);
    expect(canvas).toMatch(/shouldHoldScrubMorph/);
    expect(threeD).toMatch(/FormaVisionCanvas/);
    expect(threeD).not.toMatch(/useMemo\(\(\) => hasWebGL\(\), \[\]\)/);
    expect(pkg.dependencies['@react-three/fiber']).toMatch(/^\^9\./);
    expect(pkg.dependencies['@react-three/drei']).toMatch(/^\^10\./);
  });
});

function anyFiniteGirth(circs: ReturnType<typeof resolveAvatarCircumferences>): boolean {
  if (!circs) return false;
  return Object.values(circs).some((v) => typeof v === 'number' && Number.isFinite(v));
}
