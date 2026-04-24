// Prompt #124 P2: Deterministic determination engine.
//
// Pure function. Takes the structured MarshallVisionOutput from Claude Vision
// plus a small amount of side-channel context (corpus-match result, SKU
// hologram requirement) and returns a stable Determination — verdict,
// confidence, cited references, and human-review flag.
//
// The rule table is the §9.1 precedence list. First matching rule wins.
// Confidence is computed from a deterministic weighted sum (§9.2) so two
// identical MarshallVisionOutput objects produce the same Determination
// regardless of when or where the function runs.

import type {
  Determination,
  MarshallVisionOutput,
  ReasoningTraceEntry,
  Verdict,
} from './types';

/** SKUs that ship with an authentication hologram — a missing hologram on one of these is critical. */
export const HOLOGRAM_REQUIRED_SKUS: ReadonlySet<string> = new Set<string>([
  // Populated at seed time from reference corpus artifact_kind='hologram'.
  // This constant is also populated from DB at runtime; the Set literal is a
  // dev-time fallback so tests can exercise the rule deterministically.
]);

export interface DetermineInput {
  visionOutput: MarshallVisionOutput;
  /** From corpus matcher. If true, the suspect image is byte-identical (or perceptually identical) to an authentic marketing photo. */
  perceptualHashExactMatch: boolean;
  /** Corpus entry IDs cited by the corpus matcher for auditor replay. */
  citedReferenceIds: readonly string[];
  /** Source of the suspect image — affects human-review gating. */
  source: 'hounddog_marketplace' | 'hounddog_social' | 'practitioner_appeal'
        | 'consumer_report' | 'admin_upload' | 'test_buy';
  /** SKUs for which a hologram is required. Overrides the default fallback set. */
  hologramRequiredSkus?: ReadonlySet<string>;
  /** Whether the listing URL is on an unauthorized marketplace for the matched SKU. */
  unauthorizedMarketplaceContext?: boolean;
  /** Whether the photo appears user-taken rather than studio (affects authentic branch confidence). */
  userTakenPhoto?: boolean;
}

/**
 * Pure function: MarshallVisionOutput + context → Determination.
 */
export function determine(input: DetermineInput): Determination {
  const vo = input.visionOutput;
  const flags = vo.summary_flags.slice();
  const trace = buildReasoningTrace(vo);
  const matchedSku = vo.candidate_skus[0] ?? null;

  const hologramRequired = input.hologramRequiredSkus ?? HOLOGRAM_REQUIRED_SKUS;
  const hologramRequiredForMatch = matchedSku ? hologramRequired.has(matchedSku) : false;

  // Component scores for §9.2 confidence.
  const imageQuality = imageQualityScore(vo);
  const referenceMatch = referenceMatchScore(vo, input.perceptualHashExactMatch);
  const featureCount = featureCountScore(flags);
  const ocrConsistency = ocrConsistencyScore(vo);

  const baseConfidence =
      0.30 * imageQuality
    + 0.20 * referenceMatch
    + 0.30 * featureCount
    + 0.20 * ocrConsistency;

  // ─── Rule precedence table (§9.1) ─────────────────────────────────────────

  // 1. Content-safety skip overrides everything.
  if (vo.content_safety.skip) {
    return finalize(input, {
      verdict: 'content_safety_skip',
      confidence: clamp(baseConfidence * 0.5),
      matchedSku: null,
      flags,
      trace,
      humanReviewRequired: true,
    });
  }

  // 2. Not a product photo.
  if (vo.image_characteristics.subject_is_product === false) {
    return finalize(input, {
      verdict: 'unrelated_product',
      confidence: clamp(0.80),
      matchedSku: null,
      flags,
      trace,
      humanReviewRequired: false,
    });
  }

  // 3. Resolution insufficient.
  if (vo.image_characteristics.resolution_adequate === false) {
    return finalize(input, {
      verdict: 'insufficient_image_quality',
      confidence: clamp(0.70),
      matchedSku,
      flags,
      trace,
      humanReviewRequired: true,
    });
  }

  // 4. Candidate SKUs empty AND no corpus reference → unrelated product.
  if (vo.candidate_skus.length === 0 && input.citedReferenceIds.length === 0) {
    return finalize(input, {
      verdict: 'unrelated_product',
      confidence: clamp(0.75),
      matchedSku: null,
      flags,
      trace,
      humanReviewRequired: false,
    });
  }

  // Count mismatches — flags indicating "mismatch" or "absent on required feature".
  const mismatchFlags = flags.filter((f) => isMismatchFlag(f));
  const mismatchCount = mismatchFlags.length;

  // 5. 3+ mismatches → counterfeit_suspected (higher confidence).
  if (mismatchCount >= 3) {
    const hasHologramAbsent = mismatchFlags.includes('hologram_absent');
    const confidence = hasHologramAbsent
      ? clamp(Math.max(baseConfidence, 0.90))
      : clamp(Math.max(baseConfidence, 0.75));
    return finalize(input, {
      verdict: 'counterfeit_suspected',
      confidence,
      matchedSku,
      flags,
      trace,
      humanReviewRequired: true,
    });
  }

  // 6. 2 mismatches → counterfeit_suspected with lower confidence.
  if (mismatchCount === 2) {
    const hasHologramAbsent = mismatchFlags.includes('hologram_absent');
    const confidence = hasHologramAbsent
      ? clamp(Math.max(baseConfidence, 0.75))
      : clamp(Math.max(baseConfidence, 0.60));
    return finalize(input, {
      verdict: 'counterfeit_suspected',
      confidence,
      matchedSku,
      flags,
      trace,
      humanReviewRequired: true,
    });
  }

  // 7. Single mismatch with special-case handling.
  if (mismatchCount === 1) {
    const flag = mismatchFlags[0];
    const isHologramAbsent = flag === 'hologram_absent';
    if (isHologramAbsent && hologramRequiredForMatch) {
      return finalize(input, {
        verdict: 'counterfeit_suspected',
        confidence: clamp(Math.max(baseConfidence, 0.55)),
        matchedSku,
        flags,
        trace,
        humanReviewRequired: true,
      });
    }
    return finalize(input, {
      verdict: 'inconclusive',
      confidence: clamp(Math.min(baseConfidence, 0.55)),
      matchedSku,
      flags,
      trace,
      humanReviewRequired: true,
    });
  }

  // 8. Zero mismatches AND exact phash match → authentic high confidence.
  if (mismatchCount === 0 && input.perceptualHashExactMatch) {
    return finalize(input, {
      verdict: 'authentic',
      confidence: clamp(Math.max(baseConfidence, 0.95)),
      matchedSku,
      flags,
      trace,
      humanReviewRequired: false,
    });
  }

  // 9. Zero mismatches + user-taken photo + SKU identified → authentic.
  if (mismatchCount === 0 && input.userTakenPhoto === true && matchedSku) {
    const adequateLighting = vo.image_characteristics.lighting_quality !== 'poor';
    const confidence = adequateLighting
      ? clamp(Math.max(baseConfidence, 0.85))
      : clamp(Math.max(baseConfidence, 0.70));
    return finalize(input, {
      verdict: 'authentic',
      confidence,
      matchedSku,
      flags,
      trace,
      humanReviewRequired: false,
    });
  }

  // 10. Zero mismatches + unauthorized-marketplace context → unauthorized_channel.
  if (mismatchCount === 0 && input.unauthorizedMarketplaceContext === true) {
    return finalize(input, {
      verdict: 'unauthorized_channel_suspected',
      confidence: clamp(Math.max(baseConfidence, 0.65)),
      matchedSku,
      flags,
      trace,
      humanReviewRequired: true,
    });
  }

  // 11. Default — inconclusive.
  return finalize(input, {
    verdict: 'inconclusive',
    confidence: clamp(Math.min(baseConfidence, 0.60)),
    matchedSku,
    flags,
    trace,
    humanReviewRequired: true,
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

interface InternalResult {
  verdict: Verdict;
  confidence: number;
  matchedSku: string | null;
  flags: readonly string[];
  trace: readonly ReasoningTraceEntry[];
  humanReviewRequired: boolean;
}

function finalize(input: DetermineInput, r: InternalResult): Determination {
  // §9.3 human-review gating: authentic from practitioner appeal under 0.85
  // still requires Steve's review since the appeal hinges on the evidence.
  let humanReviewRequired = r.humanReviewRequired;
  if (
    r.verdict === 'authentic'
    && input.source === 'practitioner_appeal'
    && r.confidence < 0.85
  ) {
    humanReviewRequired = true;
  }
  // Counterfeit-suspected and unauthorized-channel-suspected are always
  // human-review regardless of confidence.
  if (r.verdict === 'counterfeit_suspected' || r.verdict === 'unauthorized_channel_suspected') {
    humanReviewRequired = true;
  }
  // Inconclusive always routes to a human.
  if (r.verdict === 'inconclusive') humanReviewRequired = true;
  // content_safety_skip: human review of raw image in secure channel.
  if (r.verdict === 'content_safety_skip') humanReviewRequired = true;

  return {
    evaluationId: input.visionOutput.evaluation_id,
    verdict: r.verdict,
    confidence: r.confidence,
    matchedSku: r.matchedSku,
    mismatchFlags: r.flags,
    reasoningTrace: r.trace,
    citedReferenceIds: input.citedReferenceIds,
    humanReviewRequired,
  };
}

function buildReasoningTrace(vo: MarshallVisionOutput): ReasoningTraceEntry[] {
  return vo.feature_observations.map((f) => ({
    feature: f.feature,
    reference_image: f.reference_image,
    observation: f.observation,
    match: f.match,
    note: f.note,
  }));
}

function isMismatchFlag(flag: string): boolean {
  // Any flag containing 'mismatch' / 'absent' / 'unexpected' / 'invalid' counts.
  const f = flag.toLowerCase();
  return (
    f.includes('mismatch')
    || f.includes('absent')
    || f.includes('unexpected')
    || f.includes('invalid')
    || f.includes('missing')
  );
}

function imageQualityScore(vo: MarshallVisionOutput): number {
  const ic = vo.image_characteristics;
  let s = 0.5;
  if (ic.resolution_adequate) s += 0.2;
  if (ic.lighting_quality === 'good') s += 0.2;
  else if (ic.lighting_quality === 'fair') s += 0.1;
  if (ic.occlusions.length === 0) s += 0.1;
  return clamp(s);
}

function referenceMatchScore(vo: MarshallVisionOutput, phashExact: boolean): number {
  if (phashExact) return 1.0;
  if (vo.candidate_skus.length >= 1) return 0.8;
  if (vo.feature_observations.length > 0) return 0.5;
  return 0.2;
}

function featureCountScore(flags: readonly string[]): number {
  // More mismatches → higher "counterfeit signal strength". For AUTHENTIC
  // verdicts we want HIGH featureCount (no mismatches). We compute
  // this as 1 - (mismatches / 10) so 0 mismatches → 1.0, 10+ → 0.0.
  const mismatches = flags.filter(isMismatchFlag).length;
  return clamp(1 - mismatches / 10);
}

function ocrConsistencyScore(vo: MarshallVisionOutput): number {
  const occ = vo.ocr_cross_check;
  const present = occ.expected_text_present.length;
  const missing = occ.expected_text_missing.length;
  const unexpected = occ.unexpected_text.length;
  const total = present + missing;
  if (total === 0 && unexpected === 0) return 0.5;
  const base = total > 0 ? present / total : 0.5;
  const penalty = unexpected * 0.15;
  return clamp(base - penalty);
}

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  // Round to 2 decimal places for DB NUMERIC(3,2).
  return Math.round(n * 100) / 100;
}
