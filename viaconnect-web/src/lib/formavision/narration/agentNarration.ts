// Prompt 210b P6-T2: AgentNarration pure narration lib.
//
// DESIGN: Templated, NOT generated. Pure functions map the composition delta
// (direction + biggestChange) to a small set of PRE-WRITTEN, compliance-clearable
// body-positive lines attributed to Arnold (body tracker) and Hannah (tone).
// No LLM call, no network call, no fetch. Deterministic. Fail-open.
//
// Attribution via getDisplayName so speaker names are consistent with the rest
// of the app and never raw slugs. Lines are derived ONLY from real deltas:
//   - no prior scan / empty deltas -> calm first-scan welcome (no fabricated change)
//   - UNKNOWN metrics are simply not narrated
//   - never "0", never a fabricated delta
//
// Standing rules: no em/en dashes, no medical/dosage/dietary language.
//
// 2026-06-27. No em/en-dashes.

import { getDisplayName } from '@/lib/getDisplayName';
import type {
  CompositionDeltasResult,
  MetricDelta,
  CircumferenceDelta,
  BiggestChange,
} from '@/lib/formavision/deltas/compositionDeltas';

// Speaker display names (resolved once; never raw slugs in the UI).
const ARNOLD = getDisplayName('arnold'); // "Arnold"
const HANNAH = getDisplayName('hannah'); // "Hannah"

/** One attributed narration line. */
export interface NarrationLine {
  /** Display name of the speaking agent (Arnold or Hannah). */
  speaker: string;
  /** The line text. Pre-written template; no LLM generation at runtime. */
  text: string;
}

// ---------------------------------------------------------------------------
// Template helpers -- private, exported only via buildNarrationLines
// ---------------------------------------------------------------------------

// "What changed" line for body fat (Arnold, lower-is-better).
function bodyFatChangedLine(direction: MetricDelta['direction']): string {
  switch (direction) {
    case 'improved':
      return 'Your body fat has been moving in a positive direction since your first scan.';
    case 'worsened':
      return 'Your body fat has shifted since your first scan, and that is useful data to have.';
    case 'unchanged':
    case 'neutral':
      return 'Your body fat has stayed steady since your first scan.';
  }
}

// "What changed" line for circumference (Arnold, lower-is-better or neutral).
function circumferenceChangedLine(direction: CircumferenceDelta['direction']): string {
  switch (direction) {
    case 'improved':
      return 'Your body measurements have been showing positive movement since your first scan.';
    case 'worsened':
      return 'Your body measurements have shifted a bit, and every scan adds to your story.';
    case 'unchanged':
    case 'neutral':
      return 'Your body measurements have stayed consistent since your first scan.';
  }
}

// "What changed" line for muscle (Arnold, higher-is-better).
function muscleChangedLine(direction: MetricDelta['direction']): string {
  switch (direction) {
    case 'improved':
      return 'Your muscle composition has been trending in a positive direction since your first scan.';
    case 'worsened':
      return 'Your muscle levels have shifted since your first scan, and tracking it keeps you informed.';
    case 'unchanged':
    case 'neutral':
      return 'Your muscle composition has stayed consistent since your first scan.';
  }
}

// "What is notable" line (Hannah) -- names the exact metric from biggestChange.
// Drift-proof: uses the label from the delta detail, never a hardcoded name.
function notableLine(biggest: BiggestChange): string {
  if (biggest.kind === 'bodyFat') {
    const dir = biggest.detail.direction;
    if (dir === 'improved') {
      return 'Your biggest shift has been in body fat, which has moved in the right direction.';
    }
    if (dir === 'worsened') {
      return 'Body fat is your biggest change right now, and awareness of it is a good first step.';
    }
    return 'Body fat has been your most stable metric across your scans.';
  }

  // circumference or muscle: use the label from the delta detail directly
  const label = biggest.detail.label;
  const dir = biggest.detail.direction;

  if (dir === 'improved') {
    return `Your biggest movement has been in ${label}, which is heading in a great direction.`;
  }
  if (dir === 'worsened') {
    return `${label} has shown the most change across your scans, and tracking it keeps you informed.`;
  }
  // unchanged or neutral
  return `${label} has been your most consistent metric across your scans.`;
}

// One gentle, non-prescriptive suggestion (Hannah). Fixed template, never
// medical/dosage/dietary. The same line appears regardless of direction so it
// is honest and cannot imply a specific action or clinical guidance.
const GENTLE_SUGGESTION =
  'Your next scan will add another data point and give you a clearer picture of your journey.';

// ---------------------------------------------------------------------------
// First-scan welcome (no prior scan / no defensible delta)
// ---------------------------------------------------------------------------

function firstScanLines(): NarrationLine[] {
  return [
    {
      speaker: ARNOLD,
      text: 'This is your starting point. Every scan from here adds to your story.',
    },
    {
      speaker: HANNAH,
      text: 'Every journey begins with one honest look. You are here, and that matters.',
    },
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build 1-3 narration lines from the composition deltas.
 *
 * - no deltas / null -> 2 honest first-scan welcome lines (no fabricated change)
 * - real deltas -> 3 lines:
 *     Arnold: what changed (direction from the primary delta)
 *     Hannah: what is notable (names the biggestChange metric exactly)
 *     Hannah: one gentle non-prescriptive suggestion
 *
 * Pure, deterministic, no network. Same input -> same output, always.
 */
export function buildNarrationLines(
  deltas: CompositionDeltasResult | null,
): NarrationLine[] {
  // First-scan / no-data path: honest welcome, no fabricated change.
  const hasAnyDelta =
    deltas !== null &&
    (deltas.bodyFat !== null ||
      deltas.circumferences.length > 0 ||
      deltas.muscle.length > 0);

  if (!hasAnyDelta) {
    return firstScanLines();
  }

  const lines: NarrationLine[] = [];

  // Line 1 (Arnold): what changed -- prefer bodyFat, then first circumference,
  // then first muscle. Whichever is available first is the "what changed" story.
  if (deltas.bodyFat !== null) {
    lines.push({
      speaker: ARNOLD,
      text: bodyFatChangedLine(deltas.bodyFat.direction),
    });
  } else if (deltas.circumferences.length > 0) {
    lines.push({
      speaker: ARNOLD,
      text: circumferenceChangedLine(deltas.circumferences[0].direction),
    });
  } else if (deltas.muscle.length > 0) {
    lines.push({
      speaker: ARNOLD,
      text: muscleChangedLine(deltas.muscle[0].direction),
    });
  }

  // Line 2 (Hannah): what is notable (names the biggest metric exactly).
  if (deltas.biggest !== null) {
    lines.push({ speaker: HANNAH, text: notableLine(deltas.biggest) });
  }

  // Line 3 (Hannah): one gentle non-prescriptive suggestion.
  lines.push({ speaker: HANNAH, text: GENTLE_SUGGESTION });

  return lines;
}
