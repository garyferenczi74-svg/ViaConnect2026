// =============================================================================
// Prompt 175 Part C (2026-06-04): confidence-based escalation router.
//
// The orchestrator that calls Haiku first, escalates to Sonnet on error /
// timeout / low confidence / zero items, and optionally escalates to Opus
// when the OPUS_ENABLED env flag is on AND Sonnet items still fall below
// the stricter threshold.
//
// The router does NOT know the upstream HTTP shape; it calls a tier
// adapter function and consumes the normalized ExtractionResult contract.
// This keeps the router pure enough to unit-test the escalation rules
// without standing up the model.
// =============================================================================

import {
  HAIKU_MIN_CONFIDENCE,
  SONNET_MIN_CONFIDENCE,
  isOpusEscalationEnabled,
} from './config';
import type {
  ExtractedSupplement,
  ExtractionOutcomeCode,
  ExtractionResult,
  ModelTier,
  TierAttempt,
} from './types';

export interface RouterRunResult {
  result: ExtractionResult;
  attempts: ReadonlyArray<TierAttempt>;
}

// Function the orchestrator calls per tier. Returns the per-tier result.
// Adapter sits in claude-tier.ts; tests use a fake adapter so the router
// logic is verified without the upstream model.
export type TierAdapter = (tier: ModelTier) => Promise<ExtractionResult>;

export interface RouterOptions {
  haikuMinConfidence?: number;
  sonnetMinConfidence?: number;
  opusEnabledOverride?: boolean; // forces opus on/off; null/undefined defers to env
}

/**
 * Decide whether the Haiku result requires Sonnet escalation. Returns the
 * outcomeCode the route should record on the attempt log; null means the
 * Haiku result is acceptable and no escalation is required.
 */
export function shouldEscalateAfterHaiku(
  haiku: ExtractionResult,
  minConfidence: number,
): ExtractionOutcomeCode | null {
  if (haiku.outcomeCode !== 'success') return haiku.outcomeCode; // error/timeout/etc.
  if (haiku.items.length === 0) return 'no_items';
  if (anyItemBelow(haiku.items, minConfidence)) return 'success'; // success-but-low
  return null;
}

/**
 * Decide whether the Sonnet result requires Opus escalation. Only fires
 * when the Opus flag is on. Returns the outcomeCode for the audit log or
 * null when Sonnet is acceptable.
 */
export function shouldEscalateAfterSonnet(
  sonnet: ExtractionResult,
  minConfidence: number,
  opusEnabled: boolean,
): ExtractionOutcomeCode | null {
  if (!opusEnabled) return null;
  if (sonnet.outcomeCode !== 'success') return sonnet.outcomeCode;
  if (sonnet.items.length === 0) return 'no_items';
  if (anyItemBelow(sonnet.items, minConfidence)) return 'success';
  return null;
}

function anyItemBelow(items: ReadonlyArray<ExtractedSupplement>, threshold: number): boolean {
  for (const it of items) {
    if (!Number.isFinite(it.confidence)) return true;
    if (it.confidence < threshold) return true;
  }
  return false;
}

/**
 * Run the full Haiku -> Sonnet -> (optional) Opus pipeline. The returned
 * result is the final tier the router landed on (success or last attempt's
 * failure); attempts is the full audit trail per tier so observability can
 * persist one row that captures the entire run.
 */
export async function runExtraction(
  adapter: TierAdapter,
  options: RouterOptions = {},
): Promise<RouterRunResult> {
  const haikuMin = options.haikuMinConfidence ?? HAIKU_MIN_CONFIDENCE;
  const sonnetMin = options.sonnetMinConfidence ?? SONNET_MIN_CONFIDENCE;
  const opusEnabled =
    typeof options.opusEnabledOverride === 'boolean'
      ? options.opusEnabledOverride
      : isOpusEscalationEnabled();

  const attempts: TierAttempt[] = [];

  // ---- Tier 1: Haiku ------------------------------------------------------
  const haiku = await adapter('haiku');
  attempts.push(toAttempt(haiku));
  const escalateAfterHaiku = shouldEscalateAfterHaiku(haiku, haikuMin);
  if (escalateAfterHaiku === null) {
    return { result: { ...haiku, escalated: false }, attempts };
  }

  // ---- Tier 2: Sonnet -----------------------------------------------------
  const sonnet = await adapter('sonnet');
  attempts.push(toAttempt(sonnet));
  const escalateAfterSonnet = shouldEscalateAfterSonnet(sonnet, sonnetMin, opusEnabled);
  if (escalateAfterSonnet === null) {
    return { result: { ...sonnet, escalated: true }, attempts };
  }

  // ---- Tier 3 (optional): Opus -------------------------------------------
  if (!opusEnabled) {
    return { result: { ...sonnet, escalated: true }, attempts };
  }
  const opus = await adapter('opus');
  attempts.push(toAttempt(opus));
  return { result: { ...opus, escalated: true }, attempts };
}

function toAttempt(r: ExtractionResult): TierAttempt {
  const avg =
    r.items.length === 0
      ? 0
      : r.items.reduce((acc, it) => acc + (Number.isFinite(it.confidence) ? it.confidence : 0), 0) / r.items.length;
  return {
    tier: r.modelTier,
    outcomeCode: r.outcomeCode,
    itemCount: r.items.length,
    avgConfidence: avg,
    latencyMs: r.latencyMs,
  };
}
