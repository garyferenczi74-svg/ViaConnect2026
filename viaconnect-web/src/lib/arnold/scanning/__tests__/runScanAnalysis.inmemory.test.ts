// Task 9 (Prompt 210c) - TDD for the in-memory client-side measurement pipeline.
// Gary decision: pixels never leave the device for geometric measurement; the
// four capture photos are processed in-browser via detectLandmarks + processSilhouette
// before they are discarded, and NO bucket download ever occurs on this path.
//
// RED phase: runInMemoryMeasurement does not exist yet - all tests will fail.
// GREEN phase: add runInMemoryMeasurement to runScanAnalysis.ts.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// vi.mock() calls are hoisted by vitest above all imports.
// Mock every module that runScanAnalysis.ts imports at the top level so the
// module loads cleanly in the node test environment (no browser globals needed).
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    storage: {
      from: vi.fn(() => ({
        // Throws if called - proves the in-memory path never touches the bucket
        download: vi.fn(() => {
          throw new Error('BUG: storage.download must not be called on the in-memory measurement path');
        }),
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

vi.mock('../landmarkDetector');
vi.mock('../silhouetteProcessor');
vi.mock('../measurementEngine');
vi.mock('../scanQualityAssessor');
vi.mock('../asymmetryAnalyzer');
vi.mock('../navyBodyFat');
vi.mock('../cunbaeBodyFat');
vi.mock('../compositionBlender');
vi.mock('../calibrationManager');
vi.mock('@/lib/body-measurements/ingestScanMeasurements', () => ({
  ingestMeasurementsFromScan: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Imports (resolved AFTER hoisted mocks execute)
// ---------------------------------------------------------------------------

import { runInMemoryMeasurement } from '../runScanAnalysis';
import { detectLandmarks, ensureImagePoseLandmarker } from '../landmarkDetector';
import { processSilhouette } from '../silhouetteProcessor';
import { extractMeasurements } from '../measurementEngine';
import type { PoseSilhouette, ExtractedMeasurements, MeasuredValue } from '../types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBlob(label = 'fake-image-data'): Blob {
  return new Blob([label], { type: 'image/jpeg' });
}

function unknownMv(): MeasuredValue {
  return { cm: null, uncertaintyCm: 0, confidence: 'low', source: 'missing' };
}

// Null semi-axes and zero corroboration: required fields added in Tasks 6 and 8.
// The ? was removed from both fields in Task 11 (types cleanup). These minimal
// values satisfy the now-required fields for fixtures not derived from silhouettes.
const _NULL_AXES = { aCm: null, bCm: null, aspectRatio: null } as const;
const _MOCK_SEMI_AXES = {
  neck: _NULL_AXES, shoulder: _NULL_AXES, chest: _NULL_AXES,
  waistNatural: _NULL_AXES, waistNavel: _NULL_AXES, hip: _NULL_AXES,
  bicepR: _NULL_AXES, bicepL: _NULL_AXES, forearmR: _NULL_AXES, forearmL: _NULL_AXES,
  thighR: _NULL_AXES, thighL: _NULL_AXES, calfR: _NULL_AXES, calfL: _NULL_AXES,
} as const;

const MOCK_MEASUREMENTS: ExtractedMeasurements = {
  neckCirc: unknownMv(), shoulderCirc: unknownMv(), chestCirc: unknownMv(),
  waistNaturalCirc: unknownMv(), waistNavelCirc: unknownMv(), hipCirc: unknownMv(),
  rightBicepCirc: unknownMv(), leftBicepCirc: unknownMv(),
  rightForearmCirc: unknownMv(), leftForearmCirc: unknownMv(),
  rightThighCirc: unknownMv(), leftThighCirc: unknownMv(),
  rightCalfCirc: unknownMv(), leftCalfCirc: unknownMv(),
  waistToHipRatio: 0, waistToHeightRatio: 0, shoulderToWaistRatio: 0,
  inseamCm: 0, torsoLengthCm: 0,
  corroborationSignals: { lrCorroboration: 0, fbCorroboration: 0, lrAsymmetry: null },
  semiAxes: _MOCK_SEMI_AXES,
};

function makeSilhouette(poseId: PoseSilhouette['poseId']): PoseSilhouette {
  return {
    poseId,
    imageWidth: 120, imageHeight: 240,
    contour: [],
    landmarks: {},
    scaleCmPerPx: 0.4,
    maskDimensions: { width: 120, height: 240 },
    qualityScore: 0.8,
    qualityIssues: [],
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('runInMemoryMeasurement', () => {
  beforeEach(() => {
    // Happy-path defaults: detectLandmarks returns empty landmarks, processSilhouette
    // returns a minimal silhouette, extractMeasurements returns MOCK_MEASUREMENTS.
    vi.mocked(detectLandmarks).mockResolvedValue({});
    vi.mocked(ensureImagePoseLandmarker).mockResolvedValue(true);
    vi.mocked(processSilhouette).mockImplementation(async ({ poseId }) =>
      makeSilhouette(poseId),
    );
    vi.mocked(extractMeasurements).mockReturnValue(MOCK_MEASUREMENTS);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Test 1: in-memory orchestration - correct blobs used, no bucket download
  // -------------------------------------------------------------------------

  describe('Test 1: in-memory orchestration - in-memory blobs used, no bucket download', () => {
    it('calls detectLandmarks once per provided view with the exact in-memory blob', async () => {
      const frontBlob = makeBlob('front');
      const backBlob  = makeBlob('back');
      const leftBlob  = makeBlob('left');
      const rightBlob = makeBlob('right');

      await runInMemoryMeasurement({
        photos: { front: frontBlob, back: backBlob, left: leftBlob, right: rightBlob },
        heightCm: 180,
        sex: 'male',
      });

      expect(ensureImagePoseLandmarker).toHaveBeenCalled();
      expect(detectLandmarks).toHaveBeenCalledTimes(4);
      expect(detectLandmarks).toHaveBeenCalledWith(frontBlob);
      expect(detectLandmarks).toHaveBeenCalledWith(backBlob);
      expect(detectLandmarks).toHaveBeenCalledWith(leftBlob);
      expect(detectLandmarks).toHaveBeenCalledWith(rightBlob);
    });

    it('calls processSilhouette once per provided view with the exact in-memory blob', async () => {
      const frontBlob = makeBlob('front');
      const backBlob  = makeBlob('back');

      await runInMemoryMeasurement({
        photos: { front: frontBlob, back: backBlob },
        heightCm: 175,
        sex: 'female',
      });

      expect(processSilhouette).toHaveBeenCalledTimes(2);
      expect(processSilhouette).toHaveBeenCalledWith(
        expect.objectContaining({ blob: frontBlob, poseId: 'front', userHeightCm: 175 }),
      );
      expect(processSilhouette).toHaveBeenCalledWith(
        expect.objectContaining({ blob: backBlob, poseId: 'back', userHeightCm: 175 }),
      );
    });

    it('passes collected silhouettes, sex, and heightCm to extractMeasurements', async () => {
      const frontSil = makeSilhouette('front');
      const backSil  = makeSilhouette('back');
      vi.mocked(processSilhouette)
        .mockResolvedValueOnce(frontSil)
        .mockResolvedValueOnce(backSil);

      await runInMemoryMeasurement({
        photos: { front: makeBlob(), back: makeBlob() },
        heightCm: 170,
        sex: 'female',
      });

      expect(extractMeasurements).toHaveBeenCalledTimes(1);
      expect(extractMeasurements).toHaveBeenCalledWith({
        silhouettes: [frontSil, backSil],
        sex: 'female',
        heightCm: 170,
      });
    });

    it('skips views with no blob provided (no call to detectLandmarks for missing views)', async () => {
      await runInMemoryMeasurement({
        photos: { front: makeBlob() }, // only front; back/left/right absent
        heightCm: 180,
        sex: 'male',
      });

      expect(detectLandmarks).toHaveBeenCalledTimes(1);
      expect(processSilhouette).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Test 2: per-view failure is fail-open
  // -------------------------------------------------------------------------

  describe('Test 2: per-view inference failure is fail-open - run always completes', () => {
    it('does not throw when detectLandmarks rejects for one view', async () => {
      vi.mocked(detectLandmarks)
        .mockRejectedValueOnce(new Error('Landmark detection failed for front'))
        .mockResolvedValue({});

      await expect(
        runInMemoryMeasurement({
          photos: { front: makeBlob(), back: makeBlob(), left: makeBlob() },
          heightCm: 180,
          sex: 'male',
        }),
      ).resolves.toBeDefined();
    });

    it('does not throw when processSilhouette rejects for one view', async () => {
      vi.mocked(processSilhouette)
        .mockRejectedValueOnce(new Error('Segmentation failed for front'))
        .mockResolvedValue(makeSilhouette('back'));

      await expect(
        runInMemoryMeasurement({
          photos: { front: makeBlob(), back: makeBlob() },
          heightCm: 180,
          sex: 'male',
        }),
      ).resolves.toBeDefined();
    });

    it('excludes a failed view from the silhouettes passed to extractMeasurements', async () => {
      // front fails; back succeeds
      vi.mocked(detectLandmarks)
        .mockRejectedValueOnce(new Error('front failed'))
        .mockResolvedValue({});
      const backSil = makeSilhouette('back');
      vi.mocked(processSilhouette).mockResolvedValue(backSil);

      await runInMemoryMeasurement({
        photos: { front: makeBlob(), back: makeBlob() },
        heightCm: 180,
        sex: 'male',
      });

      const callArgs = vi.mocked(extractMeasurements).mock.calls[0][0];
      // Only the successful view should appear in silhouettes
      expect(callArgs.silhouettes).toHaveLength(1);
      expect(callArgs.silhouettes[0]).toBe(backSil);
    });

    it('completes with empty silhouettes when ALL views fail', async () => {
      vi.mocked(detectLandmarks).mockRejectedValue(new Error('All views failed'));

      await expect(
        runInMemoryMeasurement({
          photos: { front: makeBlob(), back: makeBlob(), left: makeBlob(), right: makeBlob() },
          heightCm: 180,
          sex: 'male',
        }),
      ).resolves.toBeDefined();

      // extractMeasurements called with empty array - all UNKNOWN, nothing fabricated
      const callArgs = vi.mocked(extractMeasurements).mock.calls[0][0];
      expect(callArgs.silhouettes).toHaveLength(0);
    });

    it('a simulated per-view timeout (rejection) does not hang or throw the whole run', async () => {
      // Simulate a view timing out (Promise.race rejects with timeout error)
      vi.mocked(detectLandmarks)
        .mockRejectedValueOnce(new Error('[T9] front view CV timeout after 4000ms'))
        .mockResolvedValue({});

      const photos = { front: makeBlob(), back: makeBlob() };
      await expect(
        runInMemoryMeasurement({ photos, heightCm: 180, sex: 'male' }),
      ).resolves.toBeDefined();

      // The second view (back) must still have been attempted
      expect(detectLandmarks).toHaveBeenCalledWith(photos.back);
    });
  });

  // -------------------------------------------------------------------------
  // Test 3: result carries ExtractedMeasurements without fabrication
  // -------------------------------------------------------------------------

  describe('Test 3: result carries ExtractedMeasurements without modification or fabrication', () => {
    it('returns the exact object returned by extractMeasurements', async () => {
      const customMeasurements: ExtractedMeasurements = {
        ...MOCK_MEASUREMENTS,
        waistToHipRatio: 0.82,
      };
      vi.mocked(extractMeasurements).mockReturnValue(customMeasurements);

      const result = await runInMemoryMeasurement({
        photos: { front: makeBlob() },
        heightCm: 178,
        sex: 'male',
      });

      expect(result).toBe(customMeasurements);
    });

    it('UNKNOWN circumferences (cm null) are preserved - no fabrication for failed views', async () => {
      vi.mocked(detectLandmarks).mockRejectedValue(new Error('all fail'));

      const allUnknown: ExtractedMeasurements = { ...MOCK_MEASUREMENTS };
      vi.mocked(extractMeasurements).mockReturnValue(allUnknown);

      const result = await runInMemoryMeasurement({
        photos: { front: makeBlob(), back: makeBlob() },
        heightCm: 180,
        sex: 'male',
      });

      // All circumferences must stay null (RULE 9) - no fabricated positive values
      expect(result.chestCirc.cm).toBeNull();
      expect(result.neckCirc.cm).toBeNull();
      expect(result.hipCirc.cm).toBeNull();
      expect(result.rightBicepCirc.cm).toBeNull();
    });

    it('passes sex and heightCm through to extractMeasurements unchanged', async () => {
      await runInMemoryMeasurement({
        photos: { front: makeBlob() },
        heightCm: 162,
        sex: 'female',
      });

      expect(extractMeasurements).toHaveBeenCalledWith(
        expect.objectContaining({ sex: 'female', heightCm: 162 }),
      );
    });
  });
});
