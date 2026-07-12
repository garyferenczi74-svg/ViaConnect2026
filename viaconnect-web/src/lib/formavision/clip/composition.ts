/**
 * src/lib/formavision/clip/composition.ts
 *
 * Prompt 211a Workstream 1 (shareable transformation video): PURE builder for the
 * caption overlay that is drawn on top of the avatar canvas during a recording.
 *
 * ONE-SOURCE CONTRACT (binding):
 *   Every number shown in the caption is taken verbatim from computeCompositionDeltas
 *   (the SAME pure function the BodyFatReadout card and the timeline readout consume).
 *   This module NEVER recomputes composition, NEVER fabricates a number, and NEVER
 *   re-derives sign meaning: the arrow direction comes straight from the delta's
 *   semantic `direction`. A metric UNKNOWN in the delta result is simply omitted from
 *   the caption, never coerced to 0.
 *
 * NO RAW PHOTO CONTRACT (satisfied by construction):
 *   The caption references only design-token colors (Deep Navy #1A2744 canvas, Teal
 *   #2DA5A0 wireframe) and the avatar canvas. It carries no image URL, no photo, no
 *   data: URI. The avatar itself has no photo texture (baseline item 1+2), so there is
 *   nothing to redact.
 *
 * ESTIMATED MARKER:
 *   Avatar stats are AI-derived estimates. When a scan's confidence resolves to the
 *   'low' tier (numericToConfidenceLevel), the affected headline stat carries an
 *   estimated marker so the caption is honest about uncertainty. It never upgrades
 *   confidence.
 *
 * Tokens: Deep Navy #1A2744 canvas, Teal #2DA5A0 wireframe, Instrument Sans.
 *
 * Standing rules: no em dashes, no en dashes, no emojis, zero any. Pure and
 * deterministic; never throws.
 */

import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';
import type {
  CompositionDeltasResult,
  MetricDelta,
} from '@/lib/formavision/deltas/compositionDeltas';
import { numericToConfidenceLevel } from '@/lib/arnold/scanning/accuracy/confidenceDisplay';

// ---------------------------------------------------------------------------
// Dash guard: the caption strings must never contain an em or en dash. Any code
// that needs one uses String.fromCharCode; this constant proves the ban applies
// to authored copy too (a caption is built from tokens + numbers, not free dashes).
// ---------------------------------------------------------------------------

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

/**
 * True when a string contains no em dash and no en dash. Exported so the test
 * suite can assert every caption field is dash-clean without importing the raw
 * code points itself.
 */
export function isDashClean(value: string): boolean {
  return !value.includes(EM_DASH) && !value.includes(EN_DASH);
}

// ---------------------------------------------------------------------------
// Caption tokens: the ONLY colors the overlay is allowed to paint with. These
// are the FormaVision brand hex values (single source of truth). No other color
// may be introduced into the caption composition.
// ---------------------------------------------------------------------------

export interface CaptionTokens {
  /** Deep Navy #1A2744: the caption backdrop / canvas base. */
  canvas: string;
  /** Teal #2DA5A0: the wireframe + headline accent. */
  wireframe: string;
  /** Card navy #1E3054: caption surface panels. */
  surface: string;
  /** Orange #B75E18: the estimated-stat accent only. */
  estimatedAccent: string;
  /** The typeface family used for all caption text. */
  fontFamily: string;
}

export const CAPTION_TOKENS: CaptionTokens = {
  canvas: FORMA_VISION_HEX.navy,
  wireframe: FORMA_VISION_HEX.teal,
  surface: FORMA_VISION_HEX.card,
  estimatedAccent: FORMA_VISION_HEX.orange,
  fontFamily: 'Instrument Sans',
};

// The Via Cura wordmark shown on every clip caption (brand sign-off).
export const VIA_CURA_WORDMARK = 'Via Cura';

// ---------------------------------------------------------------------------
// Arrow glyphs. The headline arrow is chosen SOLELY from the delta's semantic
// direction (never re-derived from the raw sign here). 'improved' for a body-fat
// reduction points down; 'worsened' points up; steady is a bar.
// ---------------------------------------------------------------------------

export type CaptionArrow = 'down' | 'up' | 'steady';

/**
 * Maps a delta's semantic direction to the caption arrow. This is the ONLY place
 * the caption decides an arrow, and it reads the direction verbatim so the caption
 * can never disagree with the BodyFatReadout card for the same delta.
 */
export function arrowForDirection(direction: MetricDelta['direction']): CaptionArrow {
  if (direction === 'improved') return 'down';
  if (direction === 'worsened') return 'up';
  return 'steady'; // unchanged | neutral
}

// ---------------------------------------------------------------------------
// The headline stat (body fat) shown large on the caption.
// ---------------------------------------------------------------------------

export interface CaptionHeadline {
  /** Human label, e.g. "Body fat". */
  label: string;
  /** The starting value formatted for display, e.g. "28.0%". */
  fromText: string;
  /** The ending value formatted for display, e.g. "24.0%". */
  toText: string;
  /** Absolute change formatted for display, e.g. "4.0%". */
  changeText: string;
  /** The arrow, derived from the delta direction (never re-derived from sign). */
  arrow: CaptionArrow;
  /**
   * True when this headline stat is a low-confidence estimate and must carry the
   * estimated marker. Never upgrades confidence.
   */
  estimated: boolean;
}

// ---------------------------------------------------------------------------
// The full caption overlay data. This is DATA ONLY: the recorder / renderer paints
// it with the tokens. No React, no canvas handle, no image reference.
// ---------------------------------------------------------------------------

export interface ClipCaption {
  /** e.g. "Jan 1, 2026 to Jul 1, 2026". */
  dateSpanText: string;
  /** The body-fat headline change, or null when body fat is UNKNOWN on either side. */
  headline: CaptionHeadline | null;
  /** The estimated-stat marker text, shown only when headline.estimated is true. */
  estimatedMarkerText: string | null;
  /** The Via Cura wordmark (always present). */
  wordmark: string;
  /** The token palette the caption may paint with (tokens only, no image). */
  tokens: CaptionTokens;
}

export interface BuildClipCaptionInput {
  /** The SAME delta result the cards consume. Numbers are read verbatim from here. */
  deltas: CompositionDeltasResult;
  /** ISO date of the first scan in the chosen range (for the date span). */
  firstScanDate: string | null;
  /** ISO date of the latest scan in the chosen range (for the date span). */
  latestScanDate: string | null;
  /**
   * Optional numeric confidence (0-1) of the LATEST scan's body-fat estimate.
   * When it resolves to the 'low' tier the headline carries the estimated marker.
   * null / undefined means confidence is unknown; the marker is not asserted.
   */
  latestBodyFatConfidence?: number | null;
}

// ---------------------------------------------------------------------------
// Formatting: mirrors BodyFatReadout.formatPct exactly (one decimal, percent) so
// the caption text is byte-identical to the card for the same number.
// ---------------------------------------------------------------------------

function formatPct(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
}

// Mirrors the card date line: "Mon D, YYYY". Falls back to the raw ISO on a bad date.
function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/**
 * Builds the caption overlay data for a transformation clip.
 *
 * Pure and deterministic. Every number comes from `deltas` (computeCompositionDeltas),
 * so the caption and the on-page cards can never diverge. Body fat UNKNOWN on either
 * side yields a null headline (honest: no fabricated change, never 0). The estimated
 * marker is asserted only when the supplied latest-scan confidence resolves to 'low'.
 *
 * The word "to" (not a dash) joins the date span, keeping the caption dash-clean.
 */
export function buildClipCaption(input: BuildClipCaptionInput): ClipCaption {
  const { deltas, firstScanDate, latestScanDate, latestBodyFatConfidence } = input;

  const fromDate = formatDate(firstScanDate);
  const toDate = formatDate(latestScanDate);
  const dateSpanText = fromDate && toDate ? `${fromDate} to ${toDate}` : fromDate || toDate;

  // Low-confidence -> estimated marker on the headline stat. numericToConfidenceLevel
  // returns null for unknown confidence (never fabricates a tier), 'low' below 0.45.
  const confidenceLevel =
    latestBodyFatConfidence === undefined
      ? null
      : numericToConfidenceLevel(latestBodyFatConfidence ?? null);
  const estimated = confidenceLevel === 'low';

  let headline: CaptionHeadline | null = null;
  const bodyFat: MetricDelta | null = deltas.bodyFat;
  if (bodyFat) {
    headline = {
      label: 'Body fat',
      fromText: formatPct(bodyFat.from),
      toText: formatPct(bodyFat.to),
      changeText: formatPct(Math.abs(bodyFat.delta)),
      arrow: arrowForDirection(bodyFat.direction),
      estimated,
    };
  }

  const estimatedMarkerText =
    headline && headline.estimated
      ? 'Estimated. This value is a lower confidence estimate.'
      : null;

  return {
    dateSpanText,
    headline,
    estimatedMarkerText,
    wordmark: VIA_CURA_WORDMARK,
    tokens: CAPTION_TOKENS,
  };
}

// ---------------------------------------------------------------------------
// lowConfidenceRangeWarning: warns BEFORE render if the chosen scan range contains
// any low-confidence scan, so the UI can surface an honest heads-up. Pure over a
// list of per-scan confidence values.
// ---------------------------------------------------------------------------

export interface RangeScanConfidence {
  /** ISO date of the scan (for the caller to reference the offending scan). */
  recordedAt: string;
  /** Numeric confidence 0-1, or null when UNKNOWN. */
  confidence: number | null;
}

export interface LowConfidenceWarning {
  /** True when at least one scan in the range is low confidence. */
  hasLowConfidence: boolean;
  /** Count of low-confidence scans in the range. */
  lowConfidenceCount: number;
  /** ISO dates of the low-confidence scans, in input order. */
  lowConfidenceDates: string[];
  /** Human-readable warning message, or null when there is nothing to warn about. */
  message: string | null;
}

/**
 * Scans a chosen range for low-confidence scans and returns an honest warning.
 *
 * A scan is low confidence when its numeric confidence resolves to the 'low' tier
 * (numericToConfidenceLevel, the < 0.45 band). UNKNOWN confidence (null) is NOT
 * counted as low (it is simply unknown, never downgraded). Pure; never throws.
 */
export function lowConfidenceRangeWarning(
  range: ReadonlyArray<RangeScanConfidence>,
): LowConfidenceWarning {
  const lowConfidenceDates: string[] = [];
  for (const scan of range) {
    if (numericToConfidenceLevel(scan.confidence) === 'low') {
      lowConfidenceDates.push(scan.recordedAt);
    }
  }
  const lowConfidenceCount = lowConfidenceDates.length;
  const hasLowConfidence = lowConfidenceCount > 0;
  const message = hasLowConfidence
    ? `${lowConfidenceCount} scan${lowConfidenceCount === 1 ? '' : 's'} in this range ${
        lowConfidenceCount === 1 ? 'is' : 'are'
      } a lower confidence estimate. Your clip will mark those values as estimated.`
    : null;
  return { hasLowConfidence, lowConfidenceCount, lowConfidenceDates, message };
}
