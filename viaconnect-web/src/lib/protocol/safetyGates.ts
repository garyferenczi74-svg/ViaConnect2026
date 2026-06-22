/**
 * src/lib/protocol/safetyGates.ts
 *
 * Expanded safety gates that COMPOSE around runInterlocks.
 * Prompt 208a, Module I, Task I2 (2026-06-21).
 *
 * runSafetyGates(candidate, ctx) runs three new gates IN ORDER (pediatric,
 * pregnancy, polypharmacy) and THEN delegates to the existing runInterlocks.
 * The five existing interlocks (HFE/UL/interaction/APOE/disclaimer) are
 * UNCHANGED and run for every candidate that passes the new gates.
 *
 * This file DOES NOT edit runInterlocks or safetyInterlocks.ts. It imports
 * them read-only and wraps them.
 *
 * Gate order (FIXED):
 *   1. PEDIATRIC  - ctx.age != null AND ctx.age < 18 -> drop
 *   2. PREGNANCY  - ctx.pregnant === true AND label is contraindicated -> drop
 *   3. POLYPHARMACY - (ctx.proposedCount ?? 0) >= POLYPHARMACY_CAP -> drop
 *   4. Delegate to runInterlocks (the real 5-gate chain)
 *
 * Fail-CLOSED: any unexpected error inside runSafetyGates returns passed:false
 * and NEVER passes a candidate through on error.
 *
 * No em/en-dashes. No emojis. No new dependencies. No package.json changes.
 */

import {
  runInterlocks,
  type InterlockContext,
  type InterlockResult,
  type ProtocolCandidate,
} from '@/lib/protocol/safetyInterlocks';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * SafetyGateContext extends InterlockContext with the three new gate fields.
 * All three are optional so callers can pass a plain InterlockContext when the
 * extra fields are not yet populated (fail-open semantics apply).
 */
export type SafetyGateContext = InterlockContext & {
  /** true when the user is pregnant or lactating */
  pregnant?: boolean;
  /** user age in years; null or undefined = unknown (fail-open, no pediatric block) */
  age?: number | null;
  /** number of items already in the recommended list (polypharmacy cap) */
  proposedCount?: number;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of protocol items before the polypharmacy gate fires. */
export const POLYPHARMACY_CAP = 12;

/**
 * Canonical teratogen keyword list (lowercased).
 * A candidate label matching any of these as a substring is contraindicated
 * in pregnancy. The clinical team may expand this list; the code gate is the
 * enforcement point.
 */
export const PREGNANCY_CONTRAINDICATED: string[] = [
  'retinol',
  'preformed vitamin a',
  'high-dose vitamin a',
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the candidate label contains any pregnancy-contraindicated
 * keyword as a case-insensitive substring.
 */
export function isPregnancyContraindicated(label: string): boolean {
  const lower = label.toLowerCase();
  return PREGNANCY_CONTRAINDICATED.some((keyword) => lower.includes(keyword));
}

// ---------------------------------------------------------------------------
// runSafetyGates
// ---------------------------------------------------------------------------

/**
 * Run the expanded safety gate chain and return an InterlockResult.
 *
 * The three new gates are evaluated BEFORE delegation to runInterlocks so
 * they can short-circuit without touching the existing interlock logic.
 *
 * The existing runInterlocks function is called UNCHANGED for every candidate
 * that clears the new gates. The HFE iron block, UL check, interaction engine,
 * sensitive-variant gate, and disclaimer stamp all still run underneath.
 *
 * Fail-closed: any exception inside this wrapper -> { passed: false }.
 */
export function runSafetyGates(
  candidate: ProtocolCandidate,
  ctx: SafetyGateContext,
): InterlockResult {
  try {
    // -----------------------------------------------------------------------
    // GATE 1: PEDIATRIC
    // ctx.age != null AND ctx.age < 18 -> DROP immediately.
    // If age is null, undefined, or not provided: fail-open (skip gate).
    // -----------------------------------------------------------------------
    if (ctx.age != null && ctx.age < 18) {
      return {
        passed: false,
        droppedReason: 'pediatric' as never,
        detail: `Candidate "${candidate.label}" dropped: supplements are for adults only (age ${ctx.age} < 18).`,
      } as InterlockResult;
    }

    // -----------------------------------------------------------------------
    // GATE 2: PREGNANCY
    // ctx.pregnant === true AND candidate label matches a contraindicated keyword.
    // If pregnant is undefined/false: skip gate.
    // -----------------------------------------------------------------------
    if (ctx.pregnant === true && isPregnancyContraindicated(candidate.label)) {
      return {
        passed: false,
        droppedReason: 'pregnancy' as never,
        detail: `Candidate "${candidate.label}" dropped: contraindicated during pregnancy.`,
      } as InterlockResult;
    }

    // -----------------------------------------------------------------------
    // GATE 3: POLYPHARMACY
    // (ctx.proposedCount ?? 0) >= POLYPHARMACY_CAP -> DROP.
    // When proposedCount is undefined: treat as 0 (no cap yet reached).
    // -----------------------------------------------------------------------
    if ((ctx.proposedCount ?? 0) >= POLYPHARMACY_CAP) {
      return {
        passed: false,
        droppedReason: 'polypharmacy' as never,
        detail: `Candidate "${candidate.label}" dropped: polypharmacy cap of ${POLYPHARMACY_CAP} reached (proposedCount=${ctx.proposedCount ?? 0}).`,
      } as InterlockResult;
    }

    // -----------------------------------------------------------------------
    // DELEGATE: all new gates passed -> run existing 5 interlocks unchanged.
    // The result (pass or drop) is returned directly to the caller.
    // -----------------------------------------------------------------------
    return runInterlocks(candidate, ctx);
  } catch (err) {
    // Fail-closed: any unexpected error in the wrapper -> DROP (never pass).
    safeLog.error('safety-gates', 'runSafetyGates threw unexpectedly - failing closed', {
      candidateLabel: candidate.label,
      err: err instanceof Error ? err.message : String(err),
    });
    return {
      passed: false,
      droppedReason: 'contraindication' as const,
      detail: 'safety-gates error - failed safe',
    };
  }
}
