// Task 211b-W3a - Anchor source model for per-user calibration fusion.
//
// An "anchor" is a ground-truth reading from outside the scan pipeline (scale weight,
// a manually entered tape measurement, or a one-time DEXA/clinic import) used to fit
// a per-user residual correction ON TOP OF the global calibration in calibrationConfig.ts.
// This file defines the shape only; W3b builds the ingestion (scale via Prompt 201,
// tape guided entry, DEXA import) that produces these readings.
//
// Each source carries its OWN stated reliability. Fusion never averages a low-reliability
// anchor silently into a tighter band - see personalCorrection.ts's honesty invariants.

import type { Region } from '../../types';

/** Where an anchor reading came from. */
export type AnchorSource = 'scale' | 'tape' | 'dexa';

/** Caller-stated confidence in the anchor reading's own accuracy, independent of
 *  the scan pipeline's confidence. Never inferred; always supplied by the source. */
export type StatedReliability = 'high' | 'medium' | 'low';

/**
 * Default stated reliability per source, per the 211b baseline (Workstream 3):
 * DEXA is the highest-fidelity anchor, tape is medium (rater-dependent), scale
 * is medium for its one dimension (weight only, no girth information).
 * Ingestion callers may override per-reading when a specific session warrants
 * it (e.g. a poorly calibrated home scale), but this is the honest default.
 */
export const DEFAULT_SOURCE_RELIABILITY: Readonly<Record<AnchorSource, StatedReliability>> =
  Object.freeze({
    dexa: 'high',
    tape: 'medium',
    scale: 'medium',
  });

/**
 * One ground-truth anchor reading.
 *
 * region is a girth Region for tape/dexa circumference anchors, or the literal
 * string 'weight' for scale anchors (body weight has no Region).
 *
 * value is in centimetres when region is a Region, or kilograms when region is
 * 'weight'. The unit is implied by region, matching the value-per-source
 * convention already used across the scanning pipeline (MeasuredValue.cm etc).
 *
 * takenAt is an ISO 8601 timestamp supplied by the caller. This module never
 * reads the system clock (pure, deterministic, re-runnable).
 */
export interface AnchorReading {
  source: AnchorSource;
  region: Region | 'weight';
  value: number;
  takenAt: string;
  statedReliability: StatedReliability;
}
