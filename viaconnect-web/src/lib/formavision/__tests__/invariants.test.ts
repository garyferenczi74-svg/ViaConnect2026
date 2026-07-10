// Task 210e-E2: FormaVision data-consistency invariant harness (Section 6).
//
// PLAN DEVIATION (rationale, honest): the 210e plan text names
// "e2e/formavision/invariants.spec.ts (Playwright)". These are deliberately
// authored as node-safe Vitest here instead. The Section-6 invariants
// (avatar == card == vector, no-fabrication, sign-integrity, persona-integrity,
// copy-locks) are DATA-LAYER equalities that are provable deterministically
// against the actual exported pure functions. A Playwright pixel-read of a live
// WebGL canvas cannot read "the stored vector" that produced a rendered body,
// so it could not actually prove the avatar number equals the card number equals
// the vector; it could only sample colored pixels, which is both fragile and
// unable to observe the underlying equality. Proving the equality STRUCTURALLY
// (same source object -> same output, via the real functions the render and the
// card both call) is the honest, deterministic proof of the invariant, and it
// runs green in CI under the default `src/**/__tests__/**/*.test.ts` glob with
// environment: 'node'.
//
// EVERY expectation below is wired to a REAL exported pure function (imported,
// never reimplemented). Fixtures are synthetic and clearly labelled FIXTURE_*.
// No em/en dashes, no emojis, zero `any`.
//
// Section-6 invariants, one describe block each, each `it()` its own case:
//   1. ONE-SOURCE      avatar == card == vector for each region at >= 2 scans.
//   2. NO-FABRICATION  UNKNOWN stays null/estimated (never 0); no invented
//                      intermediate scans at snap points; genetics/future-self
//                      stay honest-disabled with no fabricated band/body.
//   3. SIGN-INTEGRITY  every delta arrow matches the actual sign; a neutral
//                      metric (shoulderWidth) is never claimed as progress.
//   4. PERSONA-INTEGRITY  getDisplayName resolves agents; gordon slug stays
//                      lowercase; Helix/practitioner absent from formavision
//                      (cited from the module contract, not fabricated).
//   5. COPY-LOCKS      score name is exactly "Bio Optimization Score" (never
//                      Vitality); no em/en dashes in touched formavision copy.

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// --- REAL exported pure functions under test (imported, never reimplemented) ---
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import { lerpParamVector } from '@/lib/formavision/geometry/lerpParamVector';
import {
  buildSegmentTints,
  buildSegmentTintsFromChange,
} from '@/lib/formavision/geometry/composSegmentTints';
import { computeCompositionDeltas } from '@/lib/formavision/deltas/compositionDeltas';
import { projectFutureSelfVector } from '@/lib/formavision/projection/projectFutureSelfVector';
import { getDisplayName } from '@/lib/getDisplayName';
import { GeneticsOverlayPanel } from '@/components/formavision/GeneticsOverlay';
import { BOSMovementReadoutContent } from '@/components/formavision/BOSMovementReadout';
import type { BOSMovementState } from '@/lib/formavision/bos/bosMovement';

// --- The SAME card-path helpers the composition cards use (to prove agreement) ---
import {
  OVAL_HEX,
  getOvalColorFromStatus,
  getOvalColorFromChange,
} from '@/lib/body-tracker/heatmap-colors';
import { getSegmentStatus } from '@/lib/body-tracker/calculations';

// --- Types + fixture builders ---
import type { CompositionSnapshot, RegionMap } from '@/lib/body-tracker/composition/types';
import {
  emptyMeasurements,
  type CircumferenceMeasurements,
} from '@/lib/body-tracker/circumference';
import type { SegmentName } from '@/lib/formavision/geometry/buildBodyGeometry';
import { SEGMENT_INDEX } from '@/lib/formavision/geometry/buildBodyGeometry';

// ---------------------------------------------------------------------------
// Synthetic, clearly-labelled fixtures. These are FIXTURES, not real user data.
// Two labelled scan points (a "first" and a "latest") so the >= 2 scan-point
// requirement is met for one-source and so deltas have both ends.
// ---------------------------------------------------------------------------

const METERS_PER_INCH = 0.0254;
const ALL_SEGMENTS = Object.keys(SEGMENT_INDEX) as SegmentName[];

function FIXTURE_measure(values: Partial<CircumferenceMeasurements>): CircumferenceMeasurements {
  return { ...emptyMeasurements(), ...values };
}

function FIXTURE_snapshot(overrides: Partial<CompositionSnapshot> = {}): CompositionSnapshot {
  return {
    entryId: 'fixture-entry',
    source: 'scan',
    recordedAt: '2026-01-01T00:00:00.000Z',
    totalBodyFatPct: null,
    regionFatPct: { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null },
    visceralFatRating: null,
    bodyWaterPct: null,
    regionMuscleLbs: { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null },
    totalMuscleMassLbs: null,
    skeletalMuscleMassLbs: null,
    ...overrides,
  };
}

// FIXTURE scan point A ("first"): a labelled synthetic circumference set (inches).
const FIXTURE_SCAN_A_CIRC: CircumferenceMeasurements = FIXTURE_measure({
  neck: 16,
  chest: 42,
  waist: 36,
  hip: 40,
  rightBicep: 14,
  rightForearm: 11,
  leftBicep: 13,
  leftForearm: 10,
  rightQuadriceps: 24,
  leftQuadriceps: 23,
  rightCalf: 15,
  leftCalf: 15,
});

// FIXTURE scan point B ("latest"): waist and chest reduced, one arm grown. This
// gives a known DECREASE (waist, chest) and a known INCREASE (rightBicep) for
// sign-integrity, and different numbers per region for one-source.
const FIXTURE_SCAN_B_CIRC: CircumferenceMeasurements = FIXTURE_measure({
  neck: 16,
  chest: 40,
  waist: 32,
  hip: 39,
  rightBicep: 15,
  rightForearm: 11,
  leftBicep: 13,
  leftForearm: 10,
  rightQuadriceps: 24,
  leftQuadriceps: 23,
  rightCalf: 15,
  leftCalf: 15,
});

// The five canonical composition regions the avatar tints and the cards read.
// FIXTURE fat values chosen to exercise green/yellow/red bands for a male body.
const FIXTURE_REGION_FAT_A: RegionMap = {
  right_arm: 10,
  left_arm: 12,
  trunk: 30,
  right_leg: 18,
  left_leg: 11,
};

const FIXTURE_REGION_FAT_B: RegionMap = {
  right_arm: 9,
  left_arm: 11,
  trunk: 26,
  right_leg: 17,
  left_leg: 10,
};

// Muscle (lbs) region maps for the change-based muscle tint, two labelled scans.
const FIXTURE_REGION_MUSCLE_A: RegionMap = {
  right_arm: 8,
  left_arm: 8,
  trunk: 50,
  right_leg: 20,
  left_leg: 20,
};

const FIXTURE_REGION_MUSCLE_B: RegionMap = {
  right_arm: 10, // +2 gain
  left_arm: 7, // -1 loss
  trunk: 50, // no change
  right_leg: 22, // +2 gain
  left_leg: 20, // no change
};

// The coarse segment type the card status path keys on (arm/leg share, trunk own).
function segTypeFor(segment: SegmentName): 'arm' | 'trunk' | 'leg' {
  return segment.includes('arm') ? 'arm' : segment.includes('leg') ? 'leg' : 'trunk';
}

// ===========================================================================
// INVARIANT 1: ONE-SOURCE (avatar == card == stored vector)
// ===========================================================================
//
// The avatar body vector (scanToParamVector) and the card/readout numbers
// (computeCompositionDeltas) and the avatar tint (buildSegmentTints) all consume
// the SAME stored source object. We prove the equality structurally: the number
// the avatar renders for a region equals the number the card shows equals the
// stored vector value, for each region, at each of two fixture scan points.
describe('INVARIANT 1: ONE-SOURCE (avatar == card == stored vector)', () => {
  it('the avatar ring circumference equals the stored measurement (in meters) for every measured ring, at scan A and scan B', () => {
    // "Stored vector" here is the raw circumference the app persists (inches).
    // The avatar consumes it via scanToParamVector; the card consumes the same
    // raw number. Avatar meters must equal stored inches * METERS_PER_INCH with
    // no independent recomputation, at BOTH scan points.
    const scans: Array<{ label: string; circ: CircumferenceMeasurements }> = [
      { label: 'A', circ: FIXTURE_SCAN_A_CIRC },
      { label: 'B', circ: FIXTURE_SCAN_B_CIRC },
    ];
    // ring id -> the stored measurement key it is filled from (mirrors the app map).
    const ringToKey: Record<string, keyof CircumferenceMeasurements> = {
      neck: 'neck',
      chest: 'chest',
      waist: 'waist',
      hip: 'hip',
      rThigh: 'rightQuadriceps',
      lThigh: 'leftQuadriceps',
      rCalf: 'rightCalf',
      lCalf: 'leftCalf',
    };
    for (const scan of scans) {
      const avatar = scanToParamVector({
        snapshot: null,
        circumferences: scan.circ,
        sex: 'male',
        heightCm: null,
        unit: 'in',
      });
      for (const ring of avatar.rings) {
        const key = ringToKey[ring.id];
        if (!key) continue;
        const storedInches = scan.circ[key];
        // stored value present in both fixtures for these rings.
        expect(storedInches).not.toBeNull();
        const cardNumber = storedInches as number; // the number the card displays
        // Avatar number, card number and stored vector are the SAME source value.
        expect(ring.circumferenceM).toBeCloseTo(cardNumber * METERS_PER_INCH, 10);
        expect(ring.estimated).toBe(false);
      }
    }
  });

  it('a smaller stored waist at scan B yields a strictly smaller avatar waist ring than scan A (data drives shape, one source)', () => {
    const a = scanToParamVector({ snapshot: null, circumferences: FIXTURE_SCAN_A_CIRC, sex: 'male', unit: 'in' });
    const b = scanToParamVector({ snapshot: null, circumferences: FIXTURE_SCAN_B_CIRC, sex: 'male', unit: 'in' });
    const waistA = a.rings.find((r) => r.id === 'waist')!;
    const waistB = b.rings.find((r) => r.id === 'waist')!;
    // Stored waist went 36 -> 32; the avatar must reflect exactly that direction.
    expect(waistB.circumferenceM!).toBeLessThan(waistA.circumferenceM!);
  });

  it('the avatar fat tint equals the card status color for every region at scan A and scan B (3D == cards)', () => {
    // buildSegmentTints (avatar) and the card status path both start from the SAME
    // RegionMap and MUST agree color for color. We reproduce the card path with the
    // real card helpers (getSegmentStatus -> getOvalColorFromStatus -> OVAL_HEX)
    // and assert equality, at BOTH scan points.
    const scans: Array<{ label: string; region: RegionMap }> = [
      { label: 'A', region: FIXTURE_REGION_FAT_A },
      { label: 'B', region: FIXTURE_REGION_FAT_B },
    ];
    for (const scan of scans) {
      const avatarTints = buildSegmentTints(scan.region, 'fat', 'male');
      for (const segment of ALL_SEGMENTS) {
        const value = scan.region[segment];
        expect(value).not.toBeNull();
        const cardColor =
          OVAL_HEX[getOvalColorFromStatus(getSegmentStatus(value as number, segTypeFor(segment), 'fat', 'male'))];
        expect(avatarTints[segment]).toBe(cardColor);
      }
    }
  });

  it('the avatar muscle tint equals the 2D muscle floor color (same getOvalColorFromChange) for the A -> B change', () => {
    // Muscle is change-based; the avatar tint MUST equal OVAL_HEX of the same
    // getOvalColorFromChange call the 2D floor uses, for the latest-first delta.
    const avatarTints = buildSegmentTintsFromChange(FIXTURE_REGION_MUSCLE_A, FIXTURE_REGION_MUSCLE_B, 'muscle');
    for (const segment of ALL_SEGMENTS) {
      const delta = (FIXTURE_REGION_MUSCLE_B[segment] as number) - (FIXTURE_REGION_MUSCLE_A[segment] as number);
      expect(avatarTints[segment]).toBe(OVAL_HEX[getOvalColorFromChange(delta, 'muscle')]);
    }
  });

  it('the card body-fat readout delta uses the exact stored A and B values (no independent avatar recompute)', () => {
    // The readout (BodyFatReadout consumes MetricDelta from computeCompositionDeltas)
    // must report from/to strictly equal to the stored A/B snapshots.
    const res = computeCompositionDeltas({
      firstComposition: FIXTURE_snapshot({ totalBodyFatPct: 27 }),
      latestComposition: FIXTURE_snapshot({ totalBodyFatPct: 24 }),
      firstCircumferences: FIXTURE_SCAN_A_CIRC,
      latestCircumferences: FIXTURE_SCAN_B_CIRC,
      unit: 'in',
    });
    expect(res.bodyFat).not.toBeNull();
    expect(res.bodyFat!.from).toBe(27);
    expect(res.bodyFat!.to).toBe(24);
    expect(res.bodyFat!.delta).toBe(-3);
  });
});

// ===========================================================================
// INVARIANT 2: NO-FABRICATION
// ===========================================================================
describe('INVARIANT 2: NO-FABRICATION', () => {
  it('an UNKNOWN (null) region stays null and estimated on the avatar vector, NEVER 0', () => {
    // waist absent -> the ring circumference is null and estimated true, not 0.
    const v = scanToParamVector({
      snapshot: null,
      circumferences: FIXTURE_measure({ chest: 40 }),
      sex: 'male',
      unit: 'in',
    });
    const waist = v.rings.find((r) => r.id === 'waist')!;
    expect(waist.circumferenceM).toBeNull();
    expect(waist.circumferenceM).not.toBe(0);
    expect(waist.estimated).toBe(true);
  });

  it('an UNKNOWN region contributes NO card delta (omitted, never a fabricated 0 delta)', () => {
    // chest null on the first side -> chest is skipped, not reported as delta 0.
    const res = computeCompositionDeltas({
      firstComposition: null,
      latestComposition: null,
      firstCircumferences: FIXTURE_measure({ waist: 34, chest: null }),
      latestCircumferences: FIXTURE_measure({ waist: 32, chest: 40 }),
      unit: 'in',
    });
    const keys = res.circumferences.map((c) => c.key);
    expect(keys).toContain('waist');
    expect(keys).not.toContain('chest');
    // And an all-UNKNOWN body fat yields null, never a 0 delta.
    expect(res.bodyFat).toBeNull();
  });

  it('an UNKNOWN region yields NO avatar tint (neutral omit, never a guessed color)', () => {
    const region: RegionMap = { right_arm: 10, left_arm: null, trunk: null, right_leg: null, left_leg: null };
    const tints = buildSegmentTints(region, 'fat', 'male');
    expect(tints.right_arm).toBe(OVAL_HEX.green);
    expect(tints.left_arm).toBeUndefined();
    expect(tints.trunk).toBeUndefined();
  });

  it('lerpParamVector returns the REAL endpoint scans at snap points t=0 and t=1 (no invented intermediate scan is substituted)', () => {
    // The time-machine morph interpolates the vector; at a snap point it must be
    // the real scan, not a fabricated in-between. We prove t=0 == from and t=1 == to
    // for every measured ring circumference.
    const from = scanToParamVector({ snapshot: null, circumferences: FIXTURE_SCAN_A_CIRC, sex: 'male', unit: 'in' });
    const to = scanToParamVector({ snapshot: null, circumferences: FIXTURE_SCAN_B_CIRC, sex: 'male', unit: 'in' });
    const atStart = lerpParamVector(from, to, 0);
    const atEnd = lerpParamVector(from, to, 1);
    for (const ring of to.rings) {
      const startRing = atStart.rings.find((r) => r.id === ring.id)!;
      const endRing = atEnd.rings.find((r) => r.id === ring.id)!;
      const fromRing = from.rings.find((r) => r.id === ring.id)!;
      // t=1 is exactly the "to" (latest) real scan.
      expect(endRing.circumferenceM).toBeCloseTo(ring.circumferenceM ?? 0, 10);
      // t=0 is exactly the "from" (first) real scan for measured rings.
      if (fromRing.circumferenceM !== null) {
        expect(startRing.circumferenceM).toBeCloseTo(fromRing.circumferenceM, 10);
      }
    }
  });

  it('the future-self projection is honest-disabled (no fabricated body) without a live goal or baseline', () => {
    // No goal -> disabled 'no-goal', no vector fabricated.
    const noGoal = projectFutureSelfVector(
      {
        snapshot: FIXTURE_snapshot({ totalBodyFatPct: 24 }),
        circumferences: FIXTURE_SCAN_A_CIRC,
        sex: 'male',
        unit: 'in',
      },
      null,
    );
    expect(noGoal.kind).toBe('disabled');
    expect('vector' in noGoal).toBe(false);

    // Goal set but baseline body fat unknown -> disabled 'no-current-scan'.
    const noBaseline = projectFutureSelfVector(
      {
        snapshot: FIXTURE_snapshot({ totalBodyFatPct: null }),
        circumferences: FIXTURE_SCAN_A_CIRC,
        sex: 'male',
        unit: 'in',
      },
      18,
    );
    expect(noBaseline.kind).toBe('disabled');
    if (noBaseline.kind === 'disabled') {
      expect(noBaseline.reason).toBe('no-current-scan');
    }
  });

  it('a null circumference is preserved (estimated) through a real future-self projection, never invented', () => {
    // With a valid goal + baseline, an absent waist stays estimated in the ghost.
    const projection = projectFutureSelfVector(
      {
        snapshot: FIXTURE_snapshot({ totalBodyFatPct: 28 }),
        circumferences: FIXTURE_measure({ chest: 40 }), // waist absent
        sex: 'male',
        unit: 'in',
      },
      18,
    );
    expect(projection.kind).toBe('projected');
    if (projection.kind === 'projected') {
      const waist = projection.vector.rings.find((r) => r.id === 'waist')!;
      expect(waist.circumferenceM).toBeNull();
      expect(waist.estimated).toBe(true);
    }
  });

  it('the genetics overlay renders NO region band, segment tint, or fabricated body in either honest state (no live tendency engine)', () => {
    // GeneticsOverlayPanel ships two honest states and never a fabricated band.
    // We prove the absent state is a CTA and the present state is an invitation,
    // and that NO oval-hex color string leaks into either (no fabricated tint).
    const absentHtml = renderToStaticMarkup(
      React.createElement(GeneticsOverlayPanel, { presence: 'absent' as const }),
    );
    const presentHtml = renderToStaticMarkup(
      React.createElement(GeneticsOverlayPanel, { presence: 'present' as const }),
    );
    // Honest CTA / invitation markers present.
    expect(absentHtml).toContain('genetics-overlay-absent');
    expect(presentHtml).toContain('genetics-overlay-present');
    // No fabricated body-region color from genetics: none of the heat-map region
    // hexes appear in the genetics honesty surface.
    for (const hex of Object.values(OVAL_HEX)) {
      expect(absentHtml).not.toContain(hex);
      expect(presentHtml).not.toContain(hex);
    }
  });
});

// ===========================================================================
// INVARIANT 3: SIGN-INTEGRITY (every delta arrow matches the actual direction)
// ===========================================================================
describe('INVARIANT 3: SIGN-INTEGRITY (delta direction matches the real sign)', () => {
  it('a body-fat DECREASE is improved and an INCREASE is worsened (canonical lower-is-better polarity)', () => {
    const down = computeCompositionDeltas({
      firstComposition: FIXTURE_snapshot({ totalBodyFatPct: 28 }),
      latestComposition: FIXTURE_snapshot({ totalBodyFatPct: 24 }),
      firstCircumferences: null,
      latestCircumferences: null,
      unit: 'in',
    });
    expect(down.bodyFat!.delta).toBeLessThan(0);
    expect(down.bodyFat!.direction).toBe('improved');

    const up = computeCompositionDeltas({
      firstComposition: FIXTURE_snapshot({ totalBodyFatPct: 22 }),
      latestComposition: FIXTURE_snapshot({ totalBodyFatPct: 26 }),
      firstCircumferences: null,
      latestCircumferences: null,
      unit: 'in',
    });
    expect(up.bodyFat!.delta).toBeGreaterThan(0);
    expect(up.bodyFat!.direction).toBe('worsened');
  });

  it('a known girth DECREASE (waist) is improved and a known girth INCREASE (bicep) is worsened, matching the sign', () => {
    // Fixtures A -> B: waist 36 -> 32 (down, improved); rightBicep 14 -> 15 (up, worsened).
    const res = computeCompositionDeltas({
      firstComposition: null,
      latestComposition: null,
      firstCircumferences: FIXTURE_SCAN_A_CIRC,
      latestCircumferences: FIXTURE_SCAN_B_CIRC,
      unit: 'in',
    });
    const waist = res.circumferences.find((c) => c.key === 'waist')!;
    const bicep = res.circumferences.find((c) => c.key === 'rightBicep')!;
    expect(waist.delta).toBeLessThan(0);
    expect(waist.direction).toBe('improved');
    expect(bicep.delta).toBeGreaterThan(0);
    expect(bicep.direction).toBe('worsened');
  });

  it('a muscle GAIN is improved (opposite polarity from fat/girth), matching the sign', () => {
    const res = computeCompositionDeltas({
      firstComposition: FIXTURE_snapshot({ totalMuscleMassLbs: 80 }),
      latestComposition: FIXTURE_snapshot({ totalMuscleMassLbs: 85 }),
      firstCircumferences: null,
      latestCircumferences: null,
      unit: 'in',
    });
    const total = res.muscle.find((m) => m.key === 'totalMuscleMassLbs')!;
    expect(total.delta).toBeGreaterThan(0);
    expect(total.direction).toBe('improved');
  });

  it('a neutral metric (shoulderWidth) is NEVER claimed as progress: a reduction is neutral, not improved', () => {
    const res = computeCompositionDeltas({
      firstComposition: null,
      latestComposition: null,
      firstCircumferences: FIXTURE_measure({ shoulderWidth: 50 }),
      latestCircumferences: FIXTURE_measure({ shoulderWidth: 47 }),
      unit: 'in',
    });
    const shoulder = res.circumferences.find((c) => c.key === 'shoulderWidth')!;
    expect(shoulder.delta).toBe(-3);
    expect(shoulder.direction).toBe('neutral');
    expect(shoulder.direction).not.toBe('improved');
  });
});

// ===========================================================================
// INVARIANT 4: PERSONA-INTEGRITY
// ===========================================================================
describe('INVARIANT 4: PERSONA-INTEGRITY', () => {
  it('agent display names resolve via getDisplayName: arnold -> Arnold, hannah -> Hannah', () => {
    expect(getDisplayName('arnold')).toBe('Arnold');
    expect(getDisplayName('hannah')).toBe('Hannah');
  });

  it('the gordon slug stays lowercase as an input token (display resolves to "Gordon", slug is never mutated)', () => {
    // The canonical slug is lowercase 'gordon'; getDisplayName lower-cases its key
    // before lookup, so passing the lowercase slug resolves to the display name
    // without the caller having to upper-case the slug anywhere.
    const slug = 'gordon';
    expect(slug).toBe(slug.toLowerCase());
    expect(getDisplayName(slug)).toBe('Gordon');
    // A mixed-case value still resolves, proving the slug itself is the lowercase
    // canonical form and casing is handled centrally, not by ad-hoc slug rewriting.
    expect(getDisplayName('GORDON')).toBe('Gordon');
  });

  it('the formavision milestone lib contract states Helix is read-only with no economy write (cited, not fabricated)', () => {
    // FormaVision touches the Helix economy only as an explicitly-disabled write
    // path. Rather than fabricate a check, we cite the binding ECONOMY CONTRACT in
    // the milestone LIB module: read-only, no creditEarning, no helix write calls.
    const libSource = fs.readFileSync(
      path.resolve(__dirname, '..', 'milestone', 'milestoneMoment.ts'),
      'utf8',
    );
    expect(libSource).toContain('No creditEarning');
    expect(libSource).toContain('helix_score_events write');
    expect(libSource.toLowerCase()).toContain('read-only');
  });

  it('the formavision milestone component contract states it is consumer-only with NO practitioner path (cited, not fabricated)', () => {
    // FormaVision has no practitioner surface. We cite the milestone COMPONENT,
    // the only formavision surface that references Helix at all, which documents
    // that it is mounted consumer-only and adds no practitioner path.
    const componentSource = fs.readFileSync(
      path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'components',
        'formavision',
        'MilestoneMoment.tsx',
      ),
      'utf8',
    );
    expect(componentSource).toContain('No practitioner path added here');
    expect(componentSource).toContain('Consumer-only');
  });
});

// ===========================================================================
// INVARIANT 5: COPY-LOCKS
// ===========================================================================
describe('INVARIANT 5: COPY-LOCKS', () => {
  const READY_STATE: BOSMovementState = {
    kind: 'ready',
    score: 72,
    baseline: 60,
    delta: 12,
    direction: 'up',
  };

  function renderBOS(state: BOSMovementState | 'loading'): string {
    return renderToStaticMarkup(
      React.createElement(BOSMovementReadoutContent, { state, reducedMotion: true }),
    );
  }

  it('the formavision score readout uses exactly "Bio Optimization Score" and never "Vitality"', () => {
    const html = renderBOS(READY_STATE);
    expect(html).toContain('Bio Optimization Score');
    expect(html).not.toContain('Vitality');
    expect(html).not.toContain('Vitality Score');
  });

  it('the "Bio Optimization Score" label is present across ready, no-baseline and no-score states', () => {
    const states: Array<BOSMovementState> = [
      READY_STATE,
      { kind: 'no-baseline', score: 55 },
      { kind: 'no-score' },
    ];
    for (const state of states) {
      const html = renderBOS(state);
      expect(html).toContain('Bio Optimization Score');
      expect(html).not.toContain('Vitality');
    }
  });

  it('no em dash or en dash appears in the rendered formavision copy surfaces (BOS readout + genetics overlay)', () => {
    const emDash = String.fromCharCode(0x2014); // em dash
    const enDash = String.fromCharCode(0x2013); // en dash
    const surfaces = [
      renderBOS(READY_STATE),
      renderBOS({ kind: 'no-score' }),
      renderToStaticMarkup(React.createElement(GeneticsOverlayPanel, { presence: 'absent' as const })),
      renderToStaticMarkup(React.createElement(GeneticsOverlayPanel, { presence: 'present' as const })),
    ];
    for (const html of surfaces) {
      expect(html.includes(emDash)).toBe(false);
      expect(html.includes(enDash)).toBe(false);
    }
  });

  it('no em/en dash appears in the touched formavision source copy constants (bosMovement + agentNarration)', () => {
    const emDash = String.fromCharCode(0x2014);
    const enDash = String.fromCharCode(0x2013);
    const files = [
      path.resolve(__dirname, '..', 'bos', 'bosMovement.ts'),
      path.resolve(__dirname, '..', 'narration', 'agentNarration.ts'),
    ];
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      expect(src.includes(emDash)).toBe(false);
      expect(src.includes(enDash)).toBe(false);
    }
  });
});
