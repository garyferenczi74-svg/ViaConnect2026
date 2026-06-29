// Task 3 (Prompt 210c) - TDD tests for honest UNKNOWN measurements.
// RULE 9 / Section 17.1: a measurement that cannot be determined MUST be null,
// never cm:0.  Write tests first (RED against old cm:0 code), then fix
// missing() to return cm:null (GREEN).

import { describe, it, expect } from 'vitest';
import { extractMeasurements } from '../measurementEngine';
import { buildAvatarParameters, AVATAR_TEMPLATE_CM } from '../runScanAnalysis';
import type { ExtractedMeasurements, MeasuredValue, PoseSilhouette } from '../types';

// ---------------------------------------------------------------------------
// Helpers: build minimal PoseSilhouette fixtures
// ---------------------------------------------------------------------------

/** Build a dense rectangular contour (left edge x=40, right edge x=140,
 *  rows every 2px from y=startY to y=endY).  widthAtY with tolerance=5
 *  will find ~5 points per side at any y in [startY+5 .. endY-5].        */
function rectContour(
  startY: number,
  endY: number,
  leftX = 40,
  rightX = 140,
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let y = startY; y <= endY; y += 2) {
    pts.push({ x: leftX, y });
    pts.push({ x: rightX, y });
  }
  return pts;
}

/** A front silhouette with NO shoulder landmarks so chest (which depends on
 *  shoulder Y for its vertical position) cannot be placed => UNKNOWN.     */
function frontNoShoulders(): PoseSilhouette {
  return {
    poseId: 'front',
    imageWidth: 200,
    imageHeight: 400,
    contour: rectContour(50, 380),
    landmarks: {
      // Hips present (so hipCirc can be estimated) but NO shoulders
      left_hip:  { x: 60, y: 280 },
      right_hip: { x: 140, y: 280 },
      // Ankle / knee for limb measurements
      left_knee:   { x: 65, y: 330 },
      right_knee:  { x: 135, y: 330 },
      left_ankle:  { x: 65, y: 370 },
      right_ankle: { x: 135, y: 370 },
    },
    scaleCmPerPx: 0.4,   // 40cm body width at 100px => reasonable
    maskDimensions: { width: 200, height: 400 },
    qualityScore: 0.8,
    qualityIssues: [],
  };
}

/** A front silhouette with BOTH shoulder and hip landmarks plus a full
 *  rectangular contour.  chest Y can be derived => measured value.       */
function frontFullLandmarks(): PoseSilhouette {
  return {
    poseId: 'front',
    imageWidth: 200,
    imageHeight: 400,
    contour: rectContour(50, 380),
    landmarks: {
      nose:           { x: 100, y: 60 },
      left_shoulder:  { x: 55,  y: 110 },
      right_shoulder: { x: 145, y: 110 },
      left_hip:       { x: 60,  y: 280 },
      right_hip:      { x: 140, y: 280 },
      left_elbow:     { x: 40,  y: 200 },
      right_elbow:    { x: 160, y: 200 },
      left_wrist:     { x: 38,  y: 260 },
      right_wrist:    { x: 162, y: 260 },
      left_knee:      { x: 65,  y: 330 },
      right_knee:     { x: 135, y: 330 },
      left_ankle:     { x: 65,  y: 370 },
      right_ankle:    { x: 135, y: 370 },
    },
    scaleCmPerPx: 0.4,
    maskDimensions: { width: 200, height: 400 },
    qualityScore: 0.9,
    qualityIssues: [],
  };
}

// ---------------------------------------------------------------------------
// Test 1: missing chest landmark => chestCirc.cm === null  (RULE 9)
// ---------------------------------------------------------------------------

describe('RULE 9: missing measurement is UNKNOWN (cm null), never cm:0', () => {
  it('front silhouette without shoulder landmarks yields chestCirc.cm === null (not 0)', () => {
    const result = extractMeasurements({
      silhouettes: [frontNoShoulders()],
      sex: 'male',
      heightCm: 180,
    });

    // RULE 9: an undeterminable circumference MUST be null, never fabricated as 0
    expect(result.chestCirc.cm).toBeNull();
    expect(result.chestCirc.source).toBe('missing');
    expect(result.chestCirc.confidence).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// Test 2: ratio that depends on a null circumference is the "unavailable"
// sentinel (0), NOT a fabricated number derived from cm:0.
// ---------------------------------------------------------------------------

describe('ratio with null circumference inputs returns the unavailable sentinel (0)', () => {
  it('waistToHipRatio is 0 (unavailable) when waistNaturalCirc.cm is null', () => {
    // No shoulder => waistNatural is also null (waist Y depends on shoulder Y)
    const result = extractMeasurements({
      silhouettes: [frontNoShoulders()],
      sex: 'male',
      heightCm: 180,
    });

    // waistNatural.cm should be null because it depends on shoulderY
    expect(result.waistNaturalCirc.cm).toBeNull();

    // The ratio must NOT be a fabricated numeric estimate; it must be 0 (unavailable)
    expect(result.waistToHipRatio).toBe(0);
    // Document the convention: 0 is the sentinel for "ratio unavailable" in
    // ExtractedMeasurements (waistToHipRatio: number).  A null input must
    // produce exactly this sentinel, not a non-zero fabricated value.
  });
});

// ---------------------------------------------------------------------------
// Test 3: present (measured) value is still a positive number (no regression)
// ---------------------------------------------------------------------------

describe('present measurement retains its numeric cm (no regression)', () => {
  it('chestCirc.cm is a positive number when both shoulder and hip landmarks are present', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks()],
      sex: 'male',
      heightCm: 180,
    });

    expect(result.chestCirc.cm).not.toBeNull();
    expect(typeof result.chestCirc.cm).toBe('number');
    expect(result.chestCirc.cm).toBeGreaterThan(0);
  });

  it('hipCirc.cm is a positive number when hip landmarks are present', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks()],
      sex: 'male',
      heightCm: 180,
    });

    expect(result.hipCirc.cm).not.toBeNull();
    expect(typeof result.hipCirc.cm).toBe('number');
    expect(result.hipCirc.cm).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Section 9.2: avatar BodyModelParameters use the per-sex TEMPLATE DEFAULT for
// an UNKNOWN region, never 0 (a zero radius collapses the rendered mesh).
// The health row value for the same region stays null (honest UNKNOWN).
// ---------------------------------------------------------------------------

function mv(cm: number | null): MeasuredValue {
  return cm === null
    ? { cm: null, uncertaintyCm: 0, confidence: 'low', source: 'missing' }
    : { cm, uncertaintyCm: 1, confidence: 'moderate', source: 'ellipse_frontOnly' };
}

// Minimal values for required fields added in Task 8 (semiAxes) and Task 6
// (corroborationSignals). All axes are null (UNKNOWN) because these fixtures
// are not derived from real silhouettes. The ? was removed from both fields
// in Task 11 (types cleanup); these values satisfy the now-required fields.
const NULL_AXES = { aCm: null, bCm: null, aspectRatio: null } as const;
const EMPTY_SEMI_AXES = {
  neck: NULL_AXES, shoulder: NULL_AXES, chest: NULL_AXES,
  waistNatural: NULL_AXES, waistNavel: NULL_AXES, hip: NULL_AXES,
  bicepR: NULL_AXES, bicepL: NULL_AXES, forearmR: NULL_AXES, forearmL: NULL_AXES,
  thighR: NULL_AXES, thighL: NULL_AXES, calfR: NULL_AXES, calfL: NULL_AXES,
} as const;
const EMPTY_CORROBORATION = { lrCorroboration: 0, fbCorroboration: 0, lrAsymmetry: null } as const;

/** Measurements with a known neck but an UNKNOWN chest and UNKNOWN bicep. */
function measurementsChestAndBicepUnknown(): ExtractedMeasurements {
  return {
    neckCirc:          mv(38),
    shoulderCirc:      mv(115),
    chestCirc:         mv(null),  // UNKNOWN
    waistNaturalCirc:  mv(85),
    waistNavelCirc:    mv(88),
    hipCirc:           mv(99),
    rightBicepCirc:    mv(null),  // UNKNOWN (both sides)
    leftBicepCirc:     mv(null),
    rightForearmCirc:  mv(28),
    leftForearmCirc:   mv(28),
    rightThighCirc:    mv(56),
    leftThighCirc:     mv(56),
    rightCalfCirc:     mv(38),
    leftCalfCirc:      mv(38),
    waistToHipRatio:    0.86,
    waistToHeightRatio: 0.47,
    shoulderToWaistRatio: 1.35,
    inseamCm: 80,
    torsoLengthCm: 50,
    corroborationSignals: EMPTY_CORROBORATION,
    semiAxes: EMPTY_SEMI_AXES,
  };
}

/** All circumferences UNKNOWN (worst case for avatar collapse). */
function measurementsAllUnknown(): ExtractedMeasurements {
  return {
    neckCirc: mv(null), shoulderCirc: mv(null), chestCirc: mv(null),
    waistNaturalCirc: mv(null), waistNavelCirc: mv(null), hipCirc: mv(null),
    rightBicepCirc: mv(null), leftBicepCirc: mv(null),
    rightForearmCirc: mv(null), leftForearmCirc: mv(null),
    rightThighCirc: mv(null), leftThighCirc: mv(null),
    rightCalfCirc: mv(null), leftCalfCirc: mv(null),
    waistToHipRatio: 0, waistToHeightRatio: 0, shoulderToWaistRatio: 0,
    inseamCm: 0, torsoLengthCm: 0,
    corroborationSignals: EMPTY_CORROBORATION,
    semiAxes: EMPTY_SEMI_AXES,
  };
}

describe('Section 9.2: avatar uses template default for UNKNOWN regions, never 0', () => {
  it('UNKNOWN chest -> avatar chestCircCm equals the male template default (not 0), health row stays null', () => {
    const measurements = measurementsChestAndBicepUnknown();
    const params = buildAvatarParameters({ measurements, sex: 'male', heightCm: 180, bodyFatPct: 18 });

    expect(params.chestCircCm).toBe(AVATAR_TEMPLATE_CM.male.chest);
    expect(params.chestCircCm).toBeGreaterThan(0);
    // The health measurement that flows to body_scan_measurements stays null (RULE 9)
    expect(measurements.chestCirc.cm).toBeNull();
  });

  it('UNKNOWN bicep (both sides null) -> avatar bicepCircCm equals the male template default (not 0)', () => {
    const measurements = measurementsChestAndBicepUnknown();
    const params = buildAvatarParameters({ measurements, sex: 'male', heightCm: 180, bodyFatPct: 18 });

    expect(params.bicepCircCm).toBe(AVATAR_TEMPLATE_CM.male.bicep);
    expect(params.bicepCircCm).toBeGreaterThan(0);
  });

  it('present measurements are preserved, not overridden by the template', () => {
    const measurements = measurementsChestAndBicepUnknown();
    const params = buildAvatarParameters({ measurements, sex: 'male', heightCm: 180, bodyFatPct: 18 });

    expect(params.neckCircCm).toBe(38);
    expect(params.shoulderCircCm).toBe(115);
    expect(params.hipCircCm).toBe(99);
  });

  it('NO avatar circumference field is 0 even when every region is UNKNOWN (female template)', () => {
    const params = buildAvatarParameters({
      measurements: measurementsAllUnknown(),
      sex: 'female',
      heightCm: 165,
      bodyFatPct: 25,
    });

    const t = AVATAR_TEMPLATE_CM.female;
    expect(params.neckCircCm).toBe(t.neck);
    expect(params.shoulderCircCm).toBe(t.shoulder);
    expect(params.chestCircCm).toBe(t.chest);
    expect(params.waistCircCm).toBe(t.waist);
    expect(params.hipCircCm).toBe(t.hip);
    expect(params.bicepCircCm).toBe(t.bicep);
    expect(params.thighCircCm).toBe(t.thigh);
    expect(params.calfCircCm).toBe(t.calf);

    for (const v of [
      params.neckCircCm, params.shoulderCircCm, params.chestCircCm, params.waistCircCm,
      params.hipCircCm, params.bicepCircCm, params.thighCircCm, params.calfCircCm,
    ]) {
      expect(v).toBeGreaterThan(0);
    }
  });

  it('template defaults are all positive for both sexes', () => {
    for (const sex of ['male', 'female'] as const) {
      for (const v of Object.values(AVATAR_TEMPLATE_CM[sex])) {
        expect(v).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Task 6: L/R depth averaging + back-view corroboration in extractMeasurements
// ---------------------------------------------------------------------------

/** Side-view silhouette with a rectangular contour of given depth.
 *  A depth of 70px at 0.4cm/px = 28cm body depth. */
function makeSideSilhouette(poseId: 'left' | 'right', depthPx = 70): PoseSilhouette {
  return {
    poseId,
    imageWidth: 200,
    imageHeight: 400,
    contour: rectContour(50, 380, 65, 65 + depthPx),
    landmarks: {
      nose:           { x: 90, y: 60 },
      left_shoulder:  { x: 75, y: 110 },
      right_shoulder: { x: 115, y: 110 },
      left_hip:       { x: 78, y: 280 },
      right_hip:      { x: 112, y: 280 },
    },
    scaleCmPerPx: 0.4,
    maskDimensions: { width: 200, height: 400 },
    qualityScore: 0.8,
    qualityIssues: [],
  };
}

/** Back-view silhouette with the same rectangular contour as frontFullLandmarks
 *  (40-140px, 100px wide = 40cm), so front-back widths agree at all levels. */
function makeBackSilhouette(widthOffsetPx = 0): PoseSilhouette {
  return {
    poseId: 'back',
    imageWidth: 200,
    imageHeight: 400,
    contour: rectContour(50, 380, 40, 140 + widthOffsetPx),
    landmarks: {
      nose:           { x: 100, y: 60 },
      left_shoulder:  { x: 55,  y: 110 },
      right_shoulder: { x: 145, y: 110 },
      left_hip:       { x: 60,  y: 280 },
      right_hip:      { x: 140, y: 280 },
    },
    scaleCmPerPx: 0.4,
    maskDimensions: { width: 200, height: 400 },
    qualityScore: 0.9,
    qualityIssues: [],
  };
}

describe('Task 6: corroborationSignals is always populated by extractMeasurements', () => {
  it('is defined even with only a front silhouette', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks()],
      sex: 'male',
      heightCm: 180,
    });
    expect(result.corroborationSignals).toBeDefined();
  });

  it('lrCorroboration is 0 with no side views (no L/R data)', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks()],
      sex: 'male',
      heightCm: 180,
    });
    expect(result.corroborationSignals!.lrCorroboration).toBe(0);
  });

  it('fbCorroboration is 0.5 (SINGLE_SOURCE_CREDIT) with no back view - all 4 fb levels are single-source', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks()],
      sex: 'male',
      heightCm: 180,
    });
    // Each fb level: front width present, back null -> SINGLE_SOURCE_CREDIT = 0.5
    expect(result.corroborationSignals!.fbCorroboration).toBeCloseTo(0.5, 5);
  });

  it('lrAsymmetry is null with no side views (cannot assess bilateral symmetry)', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks()],
      sex: 'male',
      heightCm: 180,
    });
    expect(result.corroborationSignals!.lrAsymmetry).toBeNull();
  });
});

describe('Task 6: identical L/R side views produce max lrCorroboration and zero asymmetry', () => {
  it('lrCorroboration is 1.0 when left and right have the same body depth', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeSideSilhouette('left', 70), makeSideSilhouette('right', 70)],
      sex: 'male',
      heightCm: 180,
    });
    // Identical depths at every level -> lrCorroborationScore = 1.0 per level -> mean = 1.0
    expect(result.corroborationSignals!.lrCorroboration).toBeCloseTo(1.0, 5);
  });

  it('lrAsymmetry is 0 when left and right have the same body depth', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeSideSilhouette('left', 70), makeSideSilhouette('right', 70)],
      sex: 'male',
      heightCm: 180,
    });
    expect(result.corroborationSignals!.lrAsymmetry).toBeCloseTo(0, 5);
  });

  it('chest circumference is a positive number with both side views (no regression)', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeSideSilhouette('left', 70), makeSideSilhouette('right', 70)],
      sex: 'male',
      heightCm: 180,
    });
    expect(result.chestCirc.cm).not.toBeNull();
    expect(result.chestCirc.cm).toBeGreaterThan(0);
  });
});

describe('Task 6: divergent L/R side views produce lowered corroboration and positive asymmetry', () => {
  it('lrCorroboration < 1 when left and right depths differ', () => {
    // left: 70px = 28cm depth, right: 80px = 32cm depth, diff = 4cm
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeSideSilhouette('left', 70), makeSideSilhouette('right', 80)],
      sex: 'male',
      heightCm: 180,
    });
    expect(result.corroborationSignals!.lrCorroboration).toBeLessThan(1);
    expect(result.corroborationSignals!.lrCorroboration).toBeGreaterThanOrEqual(0);
  });

  it('lrAsymmetry > 0 when left and right depths differ', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeSideSilhouette('left', 70), makeSideSilhouette('right', 80)],
      sex: 'male',
      heightCm: 180,
    });
    expect(result.corroborationSignals!.lrAsymmetry).not.toBeNull();
    expect(result.corroborationSignals!.lrAsymmetry).toBeGreaterThan(0);
  });

  it('chest circumference uses averaged depth (still a positive number)', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeSideSilhouette('left', 70), makeSideSilhouette('right', 80)],
      sex: 'male',
      heightCm: 180,
    });
    expect(result.chestCirc.cm).not.toBeNull();
    expect(result.chestCirc.cm).toBeGreaterThan(0);
  });
});

describe('Task 6: single side view still produces a measurement (RULE 9 - no fabrication)', () => {
  it('with only a left view, sideDepths use left depth, lrCorroboration = SINGLE_SOURCE_CREDIT', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeSideSilhouette('left', 70)],
      sex: 'male',
      heightCm: 180,
    });
    // Every L/R level: right = null -> SINGLE_SOURCE_CREDIT = 0.5 per level
    expect(result.corroborationSignals!.lrCorroboration).toBeCloseTo(0.5, 5);
    expect(result.corroborationSignals!.lrAsymmetry).toBeNull(); // single source
    expect(result.chestCirc.cm).not.toBeNull();
    expect(result.chestCirc.cm).toBeGreaterThan(0);
  });
});

describe('Task 6: back view provides fb corroboration and hip refinement', () => {
  it('fbCorroboration is 1.0 when back silhouette widths match front widths exactly', () => {
    // makeBackSilhouette(0) uses same contour (40-140px) as frontFullLandmarks
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeBackSilhouette(0)],
      sex: 'male',
      heightCm: 180,
    });
    expect(result.corroborationSignals!.fbCorroboration).toBeCloseTo(1.0, 5);
  });

  it('fbCorroboration < 1 when back silhouette widths differ from front', () => {
    // widthOffsetPx = 20 -> back is 20px wider -> 8cm wider -> disagrees with front
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeBackSilhouette(20)],
      sex: 'male',
      heightCm: 180,
    });
    expect(result.corroborationSignals!.fbCorroboration).toBeLessThan(1.0);
  });

  it('hipCirc.cm is still a positive number with a back view (no regression)', () => {
    const result = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeBackSilhouette(0)],
      sex: 'male',
      heightCm: 180,
    });
    expect(result.hipCirc.cm).not.toBeNull();
    expect(result.hipCirc.cm).toBeGreaterThan(0);
  });

  it('hip refinement uses max(front, back) when back hip is wider (glute boost)', () => {
    // Wider back silhouette means back hip width > front hip width -> refined hip >= original
    const withoutBack = extractMeasurements({
      silhouettes: [frontFullLandmarks()],
      sex: 'male',
      heightCm: 180,
    });
    const withWiderBack = extractMeasurements({
      silhouettes: [frontFullLandmarks(), makeBackSilhouette(20)],
      sex: 'male',
      heightCm: 180,
    });
    // With a wider back view, hip circumference should be >= without back
    expect(withWiderBack.hipCirc.cm).toBeGreaterThanOrEqual(withoutBack.hipCirc.cm ?? 0);
  });
});
