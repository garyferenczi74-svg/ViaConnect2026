/**
 * src/lib/formavision/noise/cyclePhaseAware.ts
 *
 * Prompt 211b Workstream 4a -- phase-aware classification wrapper.
 *
 * This is a PURE, ADDITIVE layer that composes over the reviewed W2 classifier
 * (noiseDeltaClassifier.ts / mdcEngine.ts). It never edits the base
 * classification and never hides a data point. It only adds an optional
 * "phase context" label alongside a delta that is already MEANINGFUL, when
 * that delta is typical of water retention for the user's current cycle
 * phase (luteal / menstrual) on a girth region prone to bloating
 * (waist, hip).
 *
 * Honesty rules (non-negotiable):
 *   - The base classification (MEANINGFUL | WITHIN_NOISE | null) is NEVER
 *     changed. Phase context is metadata alongside it, not a reclassification.
 *   - The underlying delta (from/to/direction) is NEVER altered or hidden.
 *   - When opt_in is false, or phase is null/unknown, the result is the base
 *     classification UNCHANGED with isPhaseTypical=false.
 *   - Phase context never frames a reading as judgment (no "you gained X").
 *
 * Scope: this wrapper only reasons about circumference (girth) deltas, since
 * "phase-typical water retention" is a girth phenomenon, not a body-fat one.
 */

import type { NoiseClassification } from './mdcEngine';
import type { CircumferenceNoiseResult } from './noiseDeltaClassifier';
import type { MeasurementKey } from '@/lib/body-tracker/circumference';

// ---------------------------------------------------------------------------
// Cycle phase types (mirrors user_cycle_context.current_phase enum)
// ---------------------------------------------------------------------------

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'unknown';

/** The consumer's cycle opt-in state and current phase, as read from user_cycle_context. */
export interface CyclePhaseAwareContext {
  optIn: boolean;
  phase: CyclePhase | null;
}

/** Result of composing phase awareness over a base circumference classification. */
export interface PhaseAwareDeltaResult {
  /** The base classification, always passed through unchanged. */
  classification: NoiseClassification | null;
  /** Whether this delta was labeled as typical for the user's current phase. */
  isPhaseTypical: boolean;
  /** Kind, honest, non-judgmental phase-context copy, or null when not phase-typical. */
  phaseContextCopy: string | null;
}

// ---------------------------------------------------------------------------
// Phase-typical water retention: girth regions + phases where a bloat-driven
// increase is physiologically typical, not a fabricated claim.
// ---------------------------------------------------------------------------

const WATER_RETENTION_PHASES: ReadonlySet<CyclePhase> = new Set(['luteal', 'menstrual']);

const WATER_RETENTION_PRONE_KEYS: ReadonlySet<MeasurementKey> = new Set(['waist', 'hip']);

/**
 * Composes phase awareness over a base circumference noise classification.
 *
 * The base classification is always returned unchanged. Phase context is only
 * added (isPhaseTypical=true, phaseContextCopy populated) when ALL of:
 *   - cycle.optIn is true
 *   - cycle.phase is known and not 'unknown'
 *   - base.classification is 'MEANINGFUL' (WITHIN_NOISE already reads as no
 *     meaningful change; phase context is most useful explaining a flagged
 *     change)
 *   - the delta direction is 'worsened' (a girth increase; water retention is
 *     never framed on a loss)
 *   - the key is a bloat-prone girth region (waist, hip)
 *   - the phase is one where water retention is typical (luteal, menstrual)
 *
 * @param base The base classification from classifyCircumferenceDelta (W2, unedited).
 * @param cycle The user's cycle opt-in state and current phase.
 * @returns PhaseAwareDeltaResult. Never hides or alters the underlying delta.
 */
export function applyCyclePhaseAwareness(
  base: CircumferenceNoiseResult,
  cycle: CyclePhaseAwareContext,
): PhaseAwareDeltaResult {
  const unchanged: PhaseAwareDeltaResult = {
    classification: base.classification,
    isPhaseTypical: false,
    phaseContextCopy: null,
  };

  if (!cycle.optIn) return unchanged;
  if (cycle.phase === null || cycle.phase === 'unknown') return unchanged;
  if (base.classification !== 'MEANINGFUL') return unchanged;
  if (base.delta.direction !== 'worsened') return unchanged;
  if (!WATER_RETENTION_PRONE_KEYS.has(base.delta.key)) return unchanged;
  if (!WATER_RETENTION_PHASES.has(cycle.phase)) return unchanged;

  return {
    classification: base.classification,
    isPhaseTypical: true,
    phaseContextCopy:
      `This ${base.delta.label.toLowerCase()} fluctuation is typical for your current cycle phase. ` +
      'Your measurement is still shown exactly as scanned.',
  };
}
