// Prompt 192 Task 2: insight copy compliance gate.
//
// Reuses the shared clinical claim linter (prescriptive, diagnostic,
// curative, FDA phrasing, DSHEA window) and layers the 192 rules on top:
//   1. Causal claim phrases on correlational insight types.
//   2. Any bioavailability fold-number. Locked phrase is
//      "Maximum Bioavailability" (any digits plus x token is dropped).
//   3. Product mention outside micronutrient_gap (the only type allowed a
//      productSuggestion).
//   4. Urgency and discount language.
//   5. Educational framing required whenever a product suggestion exists.
//
// Failing insights are DROPPED with reasons and surfaced in the engine's
// dropped list. They are never displayed and never silently rewritten.

import { lintClinicalClaims } from '@/lib/compliance/clinical-claim-linter';
import type { InsightFact } from './types';

export interface InsightLintResult {
  ok: boolean;
  failures: string[];
}

const CORRELATIONAL_TYPES: ReadonlyArray<InsightFact['type']> = ['hydration_correlation'];

const CAUSAL_PHRASES = ['causes', 'because you drank', 'led to', 'resulted in'];

const APPROVED_BIOAVAILABILITY = 'Maximum Bioavailability';

const URGENCY_RULES: Array<{ label: string; pattern: RegExp }> = [
  { label: 'act now', pattern: /\bact now\b/i },
  { label: 'limited', pattern: /\blimited\b/i },
  { label: 'discount', pattern: /\bdiscount\b/i },
  { label: '% off', pattern: /% ?off\b/i },
  { label: 'dont miss', pattern: /\bdon.?t miss\b/i },
];

const EDUCATIONAL_MARKERS = ['rich in', 'found in', 'food sources', 'sources include', 'learn'];

function bioavailabilityFailures(text: string): string[] {
  const failures: string[] = [];
  // Ranges covered by the approved verbatim string are allowed.
  const allowed: Array<[number, number]> = [];
  let from = 0;
  for (;;) {
    const idx = text.indexOf(APPROVED_BIOAVAILABILITY, from);
    if (idx === -1) break;
    allowed.push([idx, idx + APPROVED_BIOAVAILABILITY.length]);
    from = idx + APPROVED_BIOAVAILABILITY.length;
  }
  const figureRx = /\b\d+(?:\.\d+)?\s*x\b/gi;
  let m: RegExpExecArray | null;
  while ((m = figureRx.exec(text)) !== null) {
    const start = m.index;
    const end = m.index + m[0].length;
    const inside = allowed.some(([lo, hi]) => start >= lo && end <= hi);
    if (!inside) {
      failures.push(
        `bioavailability figure "${m[0]}" is not the approved verbatim "${APPROVED_BIOAVAILABILITY}"`,
      );
    }
  }
  return failures;
}

export function lintInsightCopy(
  title: string,
  body: string,
  fact: InsightFact,
): InsightLintResult {
  const text = `${title}\n${body}`;
  const textLower = text.toLowerCase();
  const failures: string[] = [];

  // 1. Shared clinical claim linter (reused, not duplicated).
  const clinical = lintClinicalClaims(text);
  for (const violation of clinical.violations) {
    failures.push(`clinical claim (${violation.kind}): "${violation.match}"`);
  }

  // 2. Causal phrasing on correlational types.
  if (CORRELATIONAL_TYPES.includes(fact.type)) {
    for (const phrase of CAUSAL_PHRASES) {
      if (textLower.includes(phrase)) {
        failures.push(`causal language on correlational insight: "${phrase}"`);
      }
    }
  }

  // 3. Bioavailability figures.
  failures.push(...bioavailabilityFailures(text));

  // 4. Product mention outside micronutrient_gap. The structural check is
  // authoritative: a suggestion attached to any other type fails; copy
  // naming the suggested product on another type is the same condition.
  if (fact.productSuggestion && fact.type !== 'micronutrient_gap') {
    failures.push(
      `product suggestion "${fact.productSuggestion.slug}" is not allowed on insight type ${fact.type}`,
    );
  }

  // 5. Urgency and discount language.
  for (const rule of URGENCY_RULES) {
    if (rule.pattern.test(text)) {
      failures.push(`urgency or discount language: "${rule.label}"`);
    }
  }

  // 6. Educational framing requirement when a product suggestion exists.
  if (fact.productSuggestion && fact.type === 'micronutrient_gap') {
    const framed = EDUCATIONAL_MARKERS.some((marker) => textLower.includes(marker));
    if (!framed) {
      failures.push('product suggestion without educational framing in the copy');
    }
  }

  return { ok: failures.length === 0, failures };
}
