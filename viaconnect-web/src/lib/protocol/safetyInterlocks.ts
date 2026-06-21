/**
 * src/lib/protocol/safetyInterlocks.ts
 *
 * Ordered safety interlocks - Gate B core.
 * Prompt 208, Phase 4, Task 11 (2026-06-21).
 *
 * Five interlocks run in FIXED ORDER. The first failing interlock DROPS the
 * candidate immediately and returns its reason. Nothing is softened.
 * A clean candidate returns passed:true with the disclaimerVersion stamp.
 *
 * Fail-safe: any unexpected error inside the body causes a DROP (closed),
 * never a pass. The error is logged via safeLog.error.
 *
 * No em/en-dashes. No emojis. No live DB writes (ctx supplies all data).
 * No package.json changes.
 */

import { checkProductInteractions } from '@/lib/ai/interaction-engine';
import { sumAgainstUL, type NutrientAmount } from '@/lib/nutrients/upperLimits';
import type { SnpProtocolRule } from '@/lib/kb/snpProtocolRules';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type DropReason = 'contraindication' | 'upper_limit' | 'interaction' | 'sensitive_consent';

export interface ProtocolCandidate {
  /** Human label, e.g. 'iron', 'L-methylfolate'. */
  label: string;
  /** Canonical UL key (e.g. 'iron') when this is a nutrient/mineral. */
  nutrient?: string;
  /** Proposed amount in the UL unit. */
  amount?: number;
  /** Product name passed to the interaction engine. */
  supplementName?: string;
  /** e.g. 'apoe' when the item concerns a sensitive variant. */
  sensitiveTopic?: string;
}

export interface InterlockContext {
  /** rsids where the user CARRIES the risk genotype. */
  userRiskRsids: string[];
  /** PUBLISHED rules (caller passes getPublishedRules()). */
  rules: SnpProtocolRule[];
  /** Current nutrient intake for UL sum. */
  currentStack: NutrientAmount[];
  /** Current supplement product names for interaction engine. */
  currentSupplements: string[];
  medications: string[];
  cypStatusMap?: Record<string, string>;
  /** Topics the user has explicitly opted into (e.g. ['apoe']). */
  consentedSensitiveTopics: string[];
  disclaimerVersion: string;
}

export type InterlockResult =
  | { passed: true; disclaimerVersion: string }
  | { passed: false; droppedReason: DropReason; detail: string };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Case-insensitive equality. */
function ciEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Returns true when candidate matches the rule's contraindication target:
 *   - candidate.nutrient or candidate.label matches rule.flagged_form (case-insensitive), OR
 *   - candidate.label appears in rule.avoid_list (case-insensitive).
 */
function candidateMatchesContraindicate(
  candidate: ProtocolCandidate,
  rule: SnpProtocolRule,
): boolean {
  const flagged = rule.flagged_form ?? '';
  if (flagged.length > 0) {
    if (candidate.nutrient !== undefined && ciEqual(candidate.nutrient, flagged)) return true;
    if (ciEqual(candidate.label, flagged)) return true;
  }

  const avoidList = rule.avoid_list ?? [];
  for (const entry of avoidList) {
    if (ciEqual(candidate.label, entry)) return true;
    if (candidate.nutrient !== undefined && ciEqual(candidate.nutrient, entry)) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// runInterlocks
// ---------------------------------------------------------------------------

export function runInterlocks(
  candidate: ProtocolCandidate,
  ctx: InterlockContext,
): InterlockResult {
  try {
    // -----------------------------------------------------------------------
    // INTERLOCK 1: CONTRAINDICATION (hard block, never softened)
    //
    // For each contraindicate rule where the user carries the rsid, check
    // whether the candidate matches the rule's flagged_form or avoid_list.
    // Drop immediately on the first match. Amount does not matter here.
    // -----------------------------------------------------------------------
    for (const rule of ctx.rules) {
      if (rule.action_type !== 'contraindicate') continue;
      if (!ctx.userRiskRsids.includes(rule.rsid)) continue;

      if (candidateMatchesContraindicate(candidate, rule)) {
        return {
          passed: false,
          droppedReason: 'contraindication',
          detail: `Candidate "${candidate.label}" is contraindicated by rule for ${rule.gene ?? rule.rsid} (${rule.rsid}). ${rule.effect ?? ''}`.trim(),
        };
      }
    }

    // -----------------------------------------------------------------------
    // INTERLOCK 2: UPPER-INTAKE CEILING
    //
    // Only runs when candidate.nutrient and candidate.amount are provided.
    // sumAgainstUL returns ULCheck entries only for nutrients that have a
    // defined UL. If the candidate nutrient exceeds its UL after summing
    // against the current stack, drop.
    // -----------------------------------------------------------------------
    if (candidate.nutrient !== undefined && candidate.amount !== undefined) {
      const proposed: NutrientAmount[] = [
        { nutrient: candidate.nutrient, amount: candidate.amount },
      ];
      const checks = sumAgainstUL(ctx.currentStack, proposed);
      const exceeded = checks.find(
        (c) => c.nutrient === candidate.nutrient && c.exceeds,
      );
      if (exceeded) {
        return {
          passed: false,
          droppedReason: 'upper_limit',
          detail: `Candidate "${candidate.label}" (${candidate.nutrient}) would reach ${exceeded.total}${exceeded.unit}, exceeding the UL of ${exceeded.ul}${exceeded.unit}.`,
        };
      }
    }

    // -----------------------------------------------------------------------
    // INTERLOCK 3: INTERACTION ENGINE
    //
    // Merge current supplements with the candidate's supplementName (if set),
    // filter out falsy values, then check all against the medication list.
    // Any result with severity 'critical' causes a DROP.
    // -----------------------------------------------------------------------
    const supplementsToCheck = [
      ...ctx.currentSupplements,
      ...(candidate.supplementName ? [candidate.supplementName] : []),
    ].filter(Boolean);

    const interactions = checkProductInteractions(
      supplementsToCheck,
      ctx.medications,
      ctx.cypStatusMap ?? {},
    );

    const criticalHit = interactions.find((i) => i.severity === 'critical');
    if (criticalHit) {
      return {
        passed: false,
        droppedReason: 'interaction',
        detail: `Critical interaction detected: "${criticalHit.supplement}" + "${criticalHit.medication}". ${criticalHit.description}`,
      };
    }

    // -----------------------------------------------------------------------
    // INTERLOCK 4: SENSITIVE-VARIANT GATE
    //
    // If the candidate concerns a sensitive topic (e.g. 'apoe') and the user
    // has NOT explicitly consented to that topic, drop. Never default-surface
    // sensitive-variant content.
    // -----------------------------------------------------------------------
    if (
      candidate.sensitiveTopic !== undefined &&
      !ctx.consentedSensitiveTopics.includes(candidate.sensitiveTopic)
    ) {
      return {
        passed: false,
        droppedReason: 'sensitive_consent',
        detail: `Candidate "${candidate.label}" requires explicit consent for sensitive topic "${candidate.sensitiveTopic}", which has not been granted.`,
      };
    }

    // -----------------------------------------------------------------------
    // INTERLOCK 5: SCOPE + DISCLAIMER STAMP
    //
    // All interlocks passed. Return passed:true stamped with disclaimerVersion.
    // -----------------------------------------------------------------------
    return {
      passed: true,
      disclaimerVersion: ctx.disclaimerVersion,
    };
  } catch (err) {
    // Fail-safe: any unexpected error -> DROP (fail CLOSED).
    safeLog.error('safety-interlocks', 'runInterlocks threw unexpectedly - failing closed', {
      candidateLabel: candidate.label,
      err,
    });
    return {
      passed: false,
      droppedReason: 'contraindication',
      detail: 'interlock error - failed safe',
    };
  }
}
