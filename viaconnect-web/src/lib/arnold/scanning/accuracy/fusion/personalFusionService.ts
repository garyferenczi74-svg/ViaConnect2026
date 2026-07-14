// Task 211b-W3b - Personal fusion service.
//
// Assembles a user's scan predictions + consented anchors, calls the W3a
// fitPersonalCorrection (never forked, never modified), and returns a typed,
// per-region result that is honest about whether a band actually tightened.
//
// HONESTY (W3a review handoff #1): a personal band is labeled 'tightened' only
// when it is STRICTLY NARROWER than the global band. A personal band that is
// wider than or equal to global is 'not-tightened' - never presented as a
// tightening. This is the field the future W3c display must read; it must
// never derive tightened/not-tightened itself from raw cm numbers.
//
// SCOPE NOTE: scale (weight) anchors have no Region counterpart in
// fitPersonalCorrection's PersonalPair (region: Region, which excludes
// 'weight' - see anchorTypes.ts / personalCorrection.ts). Scale anchors are
// therefore ingested and counted (scaleAnchorCount, for adoption telemetry)
// but never enter a PersonalPair or influence any region's band. Only tape and
// dexa anchors (which carry a Region) are fit. This is a scope call, not an
// oversight; a future body-composition (weight/body-fat) fusion track would
// need its own math, out of this task's circumference-only fusion.
//
// Anchor timestamp conflicts (W3a review handoff #2): pairing an anchor to the
// nearest-in-time scan reading is intentionally simple. Disagreeing anchors
// are NOT specially detected here; fitPersonalCorrection's own residual-SE
// backstop (personalCorrection.ts) is what catches them and marks the result
// 'unreliable'. This module does not duplicate that detection.
//
// No em or en dashes, no emojis, zero any, TS strict.

import type { Region } from '../../types';
import type { AnchorReading } from './anchorTypes';
import {
  fitPersonalCorrection,
  FUSION_VERSION,
  type PersonalPair,
  type PersonalCorrectionResult,
  type FlaggedAnchor,
} from './personalCorrection';
import { CALIBRATION_VERSION } from '../calibrationConfig';
import { RegionToleranceCm } from '../accuracyTargets';
import {
  buildScaleAnchorsFromWeightRows,
  buildTapeDexaAnchors,
  hasActiveConsent,
  readAnchorsFailOpen,
  type ScaleWeightRow,
  type UserMeasurementAnchorRow,
  type ConsentLedgerRow,
  type AnchorConsentType,
} from './anchorIngestion';

// ---------------------------------------------------------------------------
// Per-region global band (cm), extended from accuracyTargets.ts's documented
// Section 1.1 rule (limb girths +/- 2cm, torso girths +/- 3cm) to the fusion
// Region taxonomy's three extra values that have no GirthRegion analog:
// shoulder (upper-body, treated as limb-adjacent), under_bust and waist_navel
// (torso circumferences, same band as chest / waist_natural). waist maps to
// waist_natural as the primary waist plane, matching fusionHarness.ts's own
// documented convention.
// ---------------------------------------------------------------------------

export const REGION_BAND_CM: Readonly<Record<Region, number>> = Object.freeze({
  neck: RegionToleranceCm.neck,
  shoulder: RegionToleranceCm.upperArm,
  chest: RegionToleranceCm.chest,
  under_bust: RegionToleranceCm.chest,
  waist_natural: RegionToleranceCm.waist,
  waist_navel: RegionToleranceCm.waist,
  hip: RegionToleranceCm.hip,
  bicep: RegionToleranceCm.upperArm,
  forearm: RegionToleranceCm.forearm,
  thigh: RegionToleranceCm.upperLeg,
  calf: RegionToleranceCm.lowerLeg,
});

// ---------------------------------------------------------------------------
// Scan circumference row (body_tracker_circumference, source='scan'), exactly
// as the DB client returns it (post Prompt 85d column names).
// ---------------------------------------------------------------------------

export interface ScanCircumferenceRow {
  created_at: string;
  neck: number | null;
  shoulder_width: number | null;
  chest: number | null;
  waist: number | null;
  right_bicep: number | null;
  left_bicep: number | null;
  right_forearm: number | null;
  left_forearm: number | null;
  right_quadriceps: number | null;
  left_quadriceps: number | null;
  right_calf: number | null;
  left_calf: number | null;
}

function avgNullable(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  if (a === null) return b;
  if (b === null) return a;
  return (a + b) / 2;
}

/** Pure: maps one scan circumference row to the regions it actually measured.
 *  body_tracker_circumference has no hip, under_bust, or waist_navel columns,
 *  so those regions are simply absent (never fabricated). Bilateral sites are
 *  averaged; a single missing side falls back to the other, honestly. */
export function scanRowToRegionValues(row: ScanCircumferenceRow): Partial<Record<Region, number>> {
  const out: Partial<Record<Region, number>> = {};
  if (row.neck !== null) out.neck = row.neck;
  if (row.shoulder_width !== null) out.shoulder = row.shoulder_width;
  if (row.chest !== null) out.chest = row.chest;
  if (row.waist !== null) out.waist_natural = row.waist;

  const bicep = avgNullable(row.right_bicep, row.left_bicep);
  if (bicep !== null) out.bicep = bicep;
  const forearm = avgNullable(row.right_forearm, row.left_forearm);
  if (forearm !== null) out.forearm = forearm;
  const thigh = avgNullable(row.right_quadriceps, row.left_quadriceps);
  if (thigh !== null) out.thigh = thigh;
  const calf = avgNullable(row.right_calf, row.left_calf);
  if (calf !== null) out.calf = calf;

  return out;
}

/**
 * Pure: pairs each circumference anchor (tape/dexa; weight anchors are
 * excluded, see the module header's scope note) with the nearest-in-time scan
 * reading that measured the same region. An anchor with no matching scan
 * reading for its region is dropped (no fabricated pair).
 */
export function buildPersonalPairs(
  scanRows: ScanCircumferenceRow[],
  anchors: AnchorReading[],
): Partial<Record<Region, PersonalPair[]>> {
  const scanByRegion = scanRows.map(row => ({
    takenAtMs: Date.parse(row.created_at),
    values: scanRowToRegionValues(row),
  }));

  const pairsByRegion: Partial<Record<Region, PersonalPair[]>> = {};

  for (const anchor of anchors) {
    if (anchor.region === 'weight') continue;
    const region: Region = anchor.region;
    const anchorMs = Date.parse(anchor.takenAt);

    let bestPredictedCm: number | null = null;
    let bestDeltaMs = Infinity;
    for (const scan of scanByRegion) {
      const value = scan.values[region];
      if (value === undefined) continue;
      const delta = Math.abs(scan.takenAtMs - anchorMs);
      if (delta < bestDeltaMs) {
        bestDeltaMs = delta;
        bestPredictedCm = value;
      }
    }
    if (bestPredictedCm === null) continue;

    const pair: PersonalPair = {
      region,
      predictedCm: bestPredictedCm,
      anchorTruthCm: anchor.value,
      anchorSource: anchor.source,
      statedReliability: anchor.statedReliability,
      takenAt: anchor.takenAt,
    };
    const existing = pairsByRegion[region];
    if (existing) {
      existing.push(pair);
    } else {
      pairsByRegion[region] = [pair];
    }
  }

  return pairsByRegion;
}

// ---------------------------------------------------------------------------
// Public result shape (handoff #1's honest tightened/not-tightened field)
// ---------------------------------------------------------------------------

export type BandStatus = 'tightened' | 'not-tightened' | 'insufficient' | 'unreliable';

export interface PersonalFusionRegionResult {
  region: Region;
  /** 'tightened' only when the personal band is STRICTLY narrower than
   *  globalBandCm (handoff #1). Never derive this from personalBandCm /
   *  globalBandCm at display time - read this field directly. */
  status: BandStatus;
  /** Null unless status is 'tightened' or 'not-tightened' (a fit exists). */
  personalBandCm: number | null;
  globalBandCm: number;
  nPairs: number;
}

export interface PersonalFusionResult {
  calibrationVersion: string;
  /** Null unless the underlying fit succeeded (status 'fitted'). */
  fusionVersion: typeof FUSION_VERSION | null;
  correctionStatus: PersonalCorrectionResult['status'];
  perRegion: PersonalFusionRegionResult[];
  /** Populated only when correctionStatus is 'unreliable'. */
  flaggedAnchors: FlaggedAnchor[];
  /** Count of consented, successfully-ingested scale anchors. Adoption
   *  telemetry only - see the module header's scope note. */
  scaleAnchorCount: number;
}

// ---------------------------------------------------------------------------
// Injected DB readers (real implementation passes a Supabase client wrapper;
// tests pass a mock). Each read is fail-open at the call site via
// readAnchorsFailOpen from anchorIngestion.ts.
// ---------------------------------------------------------------------------

export interface PersonalFusionReaders {
  fetchScaleWeightRows(userId: string): Promise<ScaleWeightRow[]>;
  fetchTapeDexaAnchorRows(userId: string): Promise<UserMeasurementAnchorRow[]>;
  fetchScanCircumferenceRows(userId: string): Promise<ScanCircumferenceRow[]>;
  fetchConsentLedger(userId: string): Promise<ConsentLedgerRow[]>;
}

// ---------------------------------------------------------------------------
// Pure per-region label derivation (handoff #1). Extracted so the honesty
// rule - 'tightened' only when STRICTLY narrower than global - is directly
// unit-testable without constructing OLS fixtures.
// ---------------------------------------------------------------------------

export function deriveRegionResult(
  region: Region,
  nPairs: number,
  globalBand: number,
  correctionResult: PersonalCorrectionResult,
): PersonalFusionRegionResult {
  if (correctionResult.status === 'fitted') {
    const fit = correctionResult.perRegion[region];
    if (fit) {
      // Strictly narrower only - a wider-or-equal band is never "tightening".
      const status: BandStatus = fit.tightenedBandCm < globalBand ? 'tightened' : 'not-tightened';
      return { region, status, personalBandCm: fit.tightenedBandCm, globalBandCm: globalBand, nPairs };
    }
    return { region, status: 'insufficient', personalBandCm: null, globalBandCm: globalBand, nPairs };
  }

  if (correctionResult.status === 'unreliable') {
    return { region, status: 'unreliable', personalBandCm: null, globalBandCm: globalBand, nPairs };
  }

  return { region, status: 'insufficient', personalBandCm: null, globalBandCm: globalBand, nPairs };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function runPersonalFusion(
  userId: string,
  readers: PersonalFusionReaders,
  calibrationVersion: string = CALIBRATION_VERSION,
): Promise<PersonalFusionResult> {
  const [consentLedger, scaleRows, tapeDexaRows, scanRows] = await Promise.all([
    readAnchorsFailOpen('fusion.consentLedger', () => readers.fetchConsentLedger(userId)),
    readAnchorsFailOpen('fusion.scaleWeightRows', () => readers.fetchScaleWeightRows(userId)),
    readAnchorsFailOpen('fusion.tapeDexaAnchorRows', () => readers.fetchTapeDexaAnchorRows(userId)),
    readAnchorsFailOpen('fusion.scanCircumferenceRows', () => readers.fetchScanCircumferenceRows(userId)),
  ]);

  const scaleAnchors = hasActiveConsent(consentLedger, 'scale_anchor')
    ? buildScaleAnchorsFromWeightRows(scaleRows)
    : [];

  const tapeDexaAnchors = buildTapeDexaAnchors(tapeDexaRows).filter(anchor => {
    const consentType: AnchorConsentType = anchor.source === 'dexa' ? 'dexa_anchor' : 'tape_anchor';
    return hasActiveConsent(consentLedger, consentType);
  });

  const pairsByRegion = buildPersonalPairs(scanRows, tapeDexaAnchors);
  const regions = Object.keys(pairsByRegion) as Region[];

  const globalBandCm: Partial<Record<Region, number>> = {};
  for (const region of regions) {
    globalBandCm[region] = REGION_BAND_CM[region];
  }

  const correctionResult = fitPersonalCorrection({ pairsByRegion, globalBandCm, calibrationVersion });

  const perRegion: PersonalFusionRegionResult[] = regions.map(region =>
    deriveRegionResult(region, pairsByRegion[region]!.length, REGION_BAND_CM[region], correctionResult),
  );

  return {
    calibrationVersion,
    fusionVersion: correctionResult.status === 'fitted' ? correctionResult.version : null,
    correctionStatus: correctionResult.status,
    perRegion,
    flaggedAnchors: correctionResult.status === 'unreliable' ? correctionResult.flaggedAnchors : [],
    scaleAnchorCount: scaleAnchors.length,
  };
}
