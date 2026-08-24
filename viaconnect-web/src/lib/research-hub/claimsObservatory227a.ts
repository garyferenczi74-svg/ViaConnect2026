/**
 * Prompt 227a claims observatory helpers.
 * Signal lane only. Never store dose values, body text, or person identifiers.
 */

import { createHash } from 'node:crypto';
import { redactDoseInstructionText } from '@/lib/thanos/doseRedaction';

export type ClaimType =
  | 'efficacy'
  | 'safety'
  | 'dosing'
  | 'sourcing'
  | 'mechanism'
  | 'other';

const DOSE_HINT =
  /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|g|iu|u|ng)\b|\bdose\b|\bdosing\b|\bmg\/kg\b/i;
const EFFICACY_HINT =
  /\b(cure|treat|improve|boost|increase|reduce|benefit|effective|works)\b/i;
const SAFETY_HINT = /\b(safe|side effect|adverse|toxicity|harm|risk)\b/i;
const MECHANISM_HINT = /\b(pathway|mechanism|receptor|mitochondri|epigenet)\b/i;
const SOURCING_HINT = /\b(buy|price|\$|vendor|supplier|discount|coupon)\b/i;

export function classifyClaimType(headline: string): ClaimType {
  if (DOSE_HINT.test(headline)) return 'dosing';
  if (SOURCING_HINT.test(headline)) return 'sourcing';
  if (SAFETY_HINT.test(headline)) return 'safety';
  if (MECHANISM_HINT.test(headline)) return 'mechanism';
  if (EFFICACY_HINT.test(headline)) return 'efficacy';
  return 'other';
}

export function headlineHash(sourceDomain: string, headline: string): string {
  return createHash('sha256')
    .update(`${sourceDomain}|${headline.toLowerCase().trim()}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Build a stored claim paraphrase. For dosing/sourcing we record existence only.
 */
export function buildClaimParaphrase(opts: {
  headline: string;
  sourceLabel: string;
  claimType: ClaimType;
  topicHint?: string | null;
}): { claimText: string; storesDose: boolean } {
  const clean = redactDoseInstructionText(opts.headline).text.replace(
    /[\u2013\u2014]/g,
    '-',
  );
  if (opts.claimType === 'dosing') {
    const topic = opts.topicHint || 'a compound';
    return {
      claimText: `A dosing claim is circulating about ${topic} via ${opts.sourceLabel}. Dose values are not stored.`,
      storesDose: false,
    };
  }
  if (opts.claimType === 'sourcing') {
    return {
      claimText: `A sourcing or commercial claim is circulating via ${opts.sourceLabel}. Vendor and price details are not stored.`,
      storesDose: false,
    };
  }
  // Never store source body/headline verbatim. Topic-level paraphrase only.
  const topic = opts.topicHint || extractTopicHint(opts.headline) || 'a wellness topic';
  return {
    claimText: `Observed ${opts.claimType} claim circulating via ${opts.sourceLabel} about ${topic}. Original wording is not stored.`,
    storesDose: false,
  };
}

export function extractTopicHint(headline: string): string | null {
  const tokens = headline
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|g|iu|u|ng)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 3 && !/^\d/.test(t))
    .slice(0, 4);
  return tokens.length ? tokens.join(' ').toLowerCase() : null;
}

/** Static isolation: evidence modules must not import observed_claims. */
export const OBSERVED_CLAIMS_FORBIDDEN_IMPORTERS = [
  'src/lib/kb/grades',
  'src/lib/kb/promote',
  'src/lib/peptides/gradeCap226h',
  'src/lib/peptides/suggestions',
  'src/lib/hannah/honesty',
  'src/lib/kb/unifiedEvidence',
] as const;
