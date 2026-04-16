import type { HannahTier } from './tiers';

export interface TierDecision {
  tier: HannahTier;
  reason: string;
  autoEscalated: boolean;
}

export interface QueryFeatures {
  wordCount: number;
  hasMedicationMention: boolean;
  hasMultipleConditions: boolean;
  hasGeneticReference: boolean;
  hasProtocolDesignRequest: boolean;
  userRequestedDepth: boolean;
  asksForComparison: boolean;
  involvesUserLabData: boolean;
}

export function routeTier(
  features: QueryFeatures,
  autoEscalateEnabled: boolean,
): TierDecision {
  // Explicit user request always wins
  if (features.userRequestedDepth) {
    return { tier: 'ultrathink', reason: 'user_requested_depth', autoEscalated: false };
  }

  // Auto-escalation rules (only if flag on)
  if (autoEscalateEnabled) {
    const complexityScore =
      (features.hasMedicationMention ? 1 : 0) +
      (features.hasMultipleConditions ? 2 : 0) +
      (features.hasGeneticReference ? 2 : 0) +
      (features.hasProtocolDesignRequest ? 3 : 0) +
      (features.involvesUserLabData ? 2 : 0) +
      (features.asksForComparison ? 1 : 0);

    if (complexityScore >= 4) {
      return { tier: 'ultrathink', reason: `complexity_score_${complexityScore}`, autoEscalated: true };
    }
    if (complexityScore >= 2) {
      return { tier: 'standard', reason: `complexity_score_${complexityScore}`, autoEscalated: false };
    }
  }

  // Default to fast for short, simple queries
  if (features.wordCount < 12) {
    return { tier: 'fast', reason: 'short_query', autoEscalated: false };
  }

  return { tier: 'standard', reason: 'default', autoEscalated: false };
}

export function extractFeatures(query: string): QueryFeatures {
  const lower = query.toLowerCase();
  const words = query.trim().split(/\s+/);

  const medKeywords = [
    'mg', 'metformin', 'statin', 'ssri', 'semaglutide', 'retatrutide',
    'peptide', 'supplement', 'medication', 'drug',
  ];
  const conditionKeywords = [
    'migraine', 'fatigue', 'hormone', 'thyroid', 'diabetes', 'anxiety',
    'depression', 'insomnia', 'autoimmune', 'inflammation',
  ];
  const geneticKeywords = [
    'mthfr', 'comt', 'apoe', 'gene', 'snp', 'variant', 'genex',
    'methylation', 'nutrigenomic', 'heterozygous', 'homozygous',
  ];
  const depthKeywords = [
    'think hard', 'deeply', 'thoroughly', 'explain in detail', 'go deep', 'comprehensive',
  ];
  const protocolKeywords = [
    'protocol', 'design a plan', 'build me a', 'recommend a regimen', 'stack for',
  ];

  return {
    wordCount: words.length,
    hasMedicationMention: medKeywords.some((k) => lower.includes(k)),
    hasMultipleConditions: conditionKeywords.filter((k) => lower.includes(k)).length >= 2,
    hasGeneticReference: geneticKeywords.some((k) => lower.includes(k)),
    hasProtocolDesignRequest: protocolKeywords.some((k) => lower.includes(k)),
    userRequestedDepth: depthKeywords.some((k) => lower.includes(k)),
    asksForComparison: /\bvs\b|\bversus\b|compare|difference between|better than/i.test(query),
    involvesUserLabData: /\bmy (labs?|results?|levels?|panel|caq|score|bio optimization)\b/i.test(query),
  };
}
