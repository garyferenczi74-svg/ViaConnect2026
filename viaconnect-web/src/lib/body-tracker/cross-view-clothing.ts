// Cross-view clothing-tightness decision (Prompt #169d section 2.5, Prompt #169e
// Phase 1 section 3.1).
//
// PURE decision module, no I/O, no DOM, no React. The four-view capture flow
// (front, back, left, right) computes a per-view clothing-tightness ratio (the
// silhouette-mask area over the expected body area, scored by
// scoreClothingTightness in scan-quality.ts). This module makes the WHOLE-SCAN
// decision across all four views at once.
//
// THE RULE (169d section 2.5):
//   If ANY SINGLE view exceeds the clothing-tightness ceiling (1.18), the whole
//   scan is rejected with a retake prompt that explains all four views need
//   consistent form-fitting clothing. One baggy view fails the set.
//
// BOUNDARY (locked + tested in cross-view-clothing.test.ts):
//   The ceiling is a CLOSED upper bound, matching scoreClothingTightness exactly.
//   A view AT 1.18 is acceptable (it does NOT exceed the ceiling). A view STRICTLY
//   ABOVE 1.18 (e.g. 1.1801) fails. "Exceeds" is therefore strict `> 1.18`.
//
// This is a quality GATE, never a diagnosis. The copy that renders the rejection
// is non-alarming and lives below as a single exported constant so the UI and the
// tests share one source of truth.

import { CLOTHING_TIGHTNESS_RANGE } from '@/lib/body-tracker/scan-constants';

/** The four capture views, in canonical capture order. */
export type CaptureViewId = 'front' | 'back' | 'left' | 'right';

/** The clothing-tightness ceiling above which a view is considered too baggy. */
export const CLOTHING_TIGHTNESS_MAX_RATIO = CLOTHING_TIGHTNESS_RANGE.max; // 1.18

/**
 * Non-alarming retake copy shown when the cross-view check rejects a scan. ASCII
 * only, no dashes; the UI and tests both read this exact string.
 */
export const CROSS_VIEW_CLOTHING_RETAKE_MESSAGE =
  'For accurate measurements, every view needs the same form fitting clothing. ' +
  'One or more of your photos looks loose or baggy. Please put on snug, ' +
  'close fitting clothing and retake all four photos.';

/** A single view's measured clothing-tightness ratio. */
export interface CrossViewClothingInput {
  view: CaptureViewId;
  /** silhouette-mask area over expected body area; the same ratio scoreClothingTightness uses. */
  ratio: number;
}

export interface CrossViewClothingDecision {
  /** True when EVERY view is at or below the ceiling (the scan may proceed). */
  pass: boolean;
  /** The views whose ratio strictly EXCEEDS the ceiling (empty when pass is true). */
  failingViews: CaptureViewId[];
  /** The largest ratio observed across all views (for telemetry / phrasing). */
  maxRatio: number;
  /** Retake copy when pass is false; null when the scan passes. */
  retakeMessage: string | null;
}

/**
 * Decide whether the four-view set passes the cross-view clothing-tightness gate.
 *
 * Rejects the WHOLE scan if ANY single view's ratio strictly exceeds the ceiling
 * (1.18). A view exactly at 1.18 is acceptable (closed upper bound, matching
 * scoreClothingTightness). Views are reported in the order they were supplied.
 *
 * Defensive on input: a non-finite ratio is treated as a failing view (we cannot
 * confirm it is within range, so we do not silently pass it). An empty input is
 * treated as a pass (there is nothing out of range to reject); callers gate the
 * check on having captured the views.
 */
export function evaluateCrossViewClothing(
  views: ReadonlyArray<CrossViewClothingInput>,
  opts: { maxRatio?: number } = {},
): CrossViewClothingDecision {
  const ceiling = opts.maxRatio ?? CLOTHING_TIGHTNESS_MAX_RATIO;

  const failingViews: CaptureViewId[] = [];
  let maxRatio = 0;

  for (const v of views) {
    const ratio = v.ratio;
    if (Number.isFinite(ratio) && ratio > maxRatio) maxRatio = ratio;
    // A view fails if its ratio is not a finite number we can trust, or if it
    // strictly exceeds the ceiling. Exactly-at-ceiling does NOT fail.
    if (!Number.isFinite(ratio) || ratio > ceiling) {
      failingViews.push(v.view);
    }
  }

  const pass = failingViews.length === 0;
  return {
    pass,
    failingViews,
    maxRatio: Math.round(maxRatio * 1000) / 1000,
    retakeMessage: pass ? null : CROSS_VIEW_CLOTHING_RETAKE_MESSAGE,
  };
}
