// =============================================================================
// Disordered-eating safeguard: pure, I/O-free decision logic.
// (Prompt #169b, Task 16, spec section 3.)
//
// This module holds the testable contract behind the disordered-eating
// safeguard MECHANISM:
//   * the four-option response value (section 3.2.1),
//   * the response-adaptive DEFAULTS mapping (section 3.2.2),
//   * the support resource-card TRIGGER logic and its four conditions
//     (section 3.2.5),
//   * the body-fat "at or below clinical threshold for age/sex" check used by
//     one of those triggers,
//   * a guard proving the disordered-eating response is NEVER part of any
//     practitioner-facing payload shape (section 3 privacy + section 3.2.6).
//
// The WORDING (question prompt, option labels, resource-card + helpline copy) is
// NOT here: it lives in body-scan-copy-slots.ts as clinician-gated placeholders.
// This module contains NO user-facing crisis or question copy, only data/logic.
//
// PRIVACY (section 3): the response is stored on the user's own profile,
// encrypted-at-rest expectation, and is NEVER visible to practitioners by
// default. It is intentionally absent from every practitioner payload type in
// the codebase (see practitioner-scan.ts PractitionerScanPayload), and
// assertResponseNotInPractitionerPayload below enforces that at runtime/in tests.
// =============================================================================

// ---------------------------------------------------------------------------
// The four-option response (section 3.2.1)
// ---------------------------------------------------------------------------

// The four fixed MACHINE values. The user-facing LABELS are clinician-gated
// slots (body-scan-copy-slots.ts DISORDERED_EATING_OPTION_SLOTS); these values
// drive the adaptive defaults and are persisted to the profile, so they must
// not change without updating the mapping + the migration check constraint.
export type DisorderedEatingResponse =
  | 'currently'
  | 'in_the_past'
  | 'no'
  | 'prefer_not_to_say';

export const DISORDERED_EATING_RESPONSES: readonly DisorderedEatingResponse[] = [
  'currently',
  'in_the_past',
  'no',
  'prefer_not_to_say',
] as const;

/** Type guard for a persisted/loaded response value. */
export function isDisorderedEatingResponse(v: unknown): v is DisorderedEatingResponse {
  return typeof v === 'string' && (DISORDERED_EATING_RESPONSES as readonly string[]).includes(v);
}

// ---------------------------------------------------------------------------
// Response-adaptive defaults (section 3.2.2)
// ---------------------------------------------------------------------------

// The settings the response tunes. These map onto EXISTING per-user settings
// where possible (profiles.numbers_optional is the canonical "Hide specific
// numbers" flag from Task 15); the rest are body-scan UX defaults the surfaces
// read. EVERY one of these remains user-changeable later; the response only sets
// the INITIAL default, it does not lock anything.
export type ResourceCardPersistence = 'persistent' | 'dismissible' | 'none';

export interface ResponseAdaptiveDefaults {
  // Initial value for profiles.numbers_optional ("Hide specific numbers" ON).
  numbersOptionalDefault: boolean;
  // Suggested days between scans (a soft suggestion surfaced in the UI, not a
  // hard limit; the 24h frequency limiter is separate and always applies).
  scanFrequencySuggestionDays: number;
  // How the support resource card behaves for this user by default.
  resourceCardPersistence: ResourceCardPersistence;
  // Whether body fat % is hidden by default (in addition to the numbers-optional
  // fully-hidden set). For the "currently" response we hide it by default.
  bodyFatHiddenByDefault: boolean;
}

/**
 * Map a disordered-eating response to its initial defaults (spec section 3.2.2).
 *
 *   'currently'           -> numbers-optional ON, 14-day suggestion, PERSISTENT
 *                            resource card, body fat hidden by default.
 *   'in_the_past'         -> softer: 7-day suggestion, DISMISSIBLE resource card,
 *     'prefer_not_to_say'    numbers-optional OFF, body fat not force-hidden.
 *   'no'                  -> standard: 7-day suggestion (the app's normal
 *                            cadence), NO resource card, nothing hidden.
 *
 * Total + pure. An unrecognized value is treated as the standard ('no') profile,
 * so a future/garbled value can never accidentally apply the strictest defaults.
 *
 * The user can change any of these settings afterward; these are INITIAL values.
 */
export function responseAdaptiveDefaults(
  response: DisorderedEatingResponse,
): ResponseAdaptiveDefaults {
  switch (response) {
    case 'currently':
      return {
        numbersOptionalDefault: true,
        scanFrequencySuggestionDays: 14,
        resourceCardPersistence: 'persistent',
        bodyFatHiddenByDefault: true,
      };
    case 'in_the_past':
    case 'prefer_not_to_say':
      return {
        numbersOptionalDefault: false,
        scanFrequencySuggestionDays: 7,
        resourceCardPersistence: 'dismissible',
        bodyFatHiddenByDefault: false,
      };
    case 'no':
    default:
      return {
        numbersOptionalDefault: false,
        scanFrequencySuggestionDays: 7,
        resourceCardPersistence: 'none',
        bodyFatHiddenByDefault: false,
      };
  }
}

// ---------------------------------------------------------------------------
// Body-fat clinical-threshold check (one of the section 3.2.5 triggers)
// ---------------------------------------------------------------------------

// Approximate "essential fat" floors by sex; at or below these, body fat is at
// the low clinical edge. These are conservative, widely-cited essential-fat
// reference points (male ~3-5%, female ~10-13%); the trigger uses the upper end
// of essential fat as the "at/below clinical threshold" line so the resource
// card appears at a genuinely low value, not merely a lean-athletic one.
//
// NOTE: these are reference thresholds for a NON-prescriptive support pointer,
// not a diagnosis. The exact values can be tuned by the clinician without
// changing the trigger logic.
export const ESSENTIAL_FAT_THRESHOLD_PCT = {
  male: 5,
  female: 13,
} as const;

export type BiologicalSexForThreshold = 'male' | 'female';

/**
 * Whether a body-fat percentage is at or below the clinical low threshold for
 * the given sex (spec section 3.2.5 condition 3). Returns false when the inputs
 * are missing/invalid (fail-safe: do not trigger on absent data).
 *
 * `ageYears` is accepted for forward-compatibility with age-banded thresholds
 * but the current reference floors are sex-based; it is intentionally unused in
 * the comparison so the signature is stable when age bands are added.
 */
export function isBodyFatAtOrBelowClinicalThreshold(
  bodyFatPct: number | null | undefined,
  sex: BiologicalSexForThreshold | null | undefined,
  _ageYears?: number | null,
): boolean {
  if (bodyFatPct === null || bodyFatPct === undefined || Number.isNaN(bodyFatPct)) return false;
  if (sex !== 'male' && sex !== 'female') return false;
  return bodyFatPct <= ESSENTIAL_FAT_THRESHOLD_PCT[sex];
}

// ---------------------------------------------------------------------------
// Resource-card trigger logic (section 3.2.5)
// ---------------------------------------------------------------------------

// The maximum percentage-point drop in body fat across the last 3 scans that is
// considered "rapid" for the purposes of the support pointer. Conservative; a
// drop of this magnitude or more across three consecutive scans triggers.
export const RAPID_BODY_FAT_DROP_PCT_OVER_3_SCANS = 5;

// The number of scan-frequency attempts (within the slow-down window) that, when
// the user keeps trying to scan more often than suggested, counts as a
// "scan-frequency attempts" trigger. Reuses the spec's 3-in-7 slow-down notion.
export const SCAN_FREQUENCY_ATTEMPTS_TRIGGER = 3;

// The inputs the resource-card trigger evaluates. All optional/nullable so the
// card simply does not appear when data is missing (fail-safe, never errors).
export interface ResourceCardTriggerInput {
  // Body-fat % for the user's last scans, OLDEST-to-NEWEST. The rapid-drop
  // condition looks at the first vs last of the most recent 3.
  recentBodyFatPctOldestFirst?: ReadonlyArray<number | null | undefined>;
  // Count of scan attempts within the slow-down window (the same signal that
  // drives BodyScanSlowDownBanner). >= SCAN_FREQUENCY_ATTEMPTS_TRIGGER triggers.
  scanFrequencyAttemptsInWindow?: number | null;
  // The user's latest body-fat % + sex for the clinical-threshold condition.
  latestBodyFatPct?: number | null;
  sex?: BiologicalSexForThreshold | null;
  ageYears?: number | null;
  // The user's disordered-eating history response (past history condition).
  disorderedEatingResponse?: DisorderedEatingResponse | null;
}

// Which of the four conditions fired. Exposed so analytics/QA can see WHY the
// card showed without surfacing anything sensitive in the UI.
export interface ResourceCardTriggerResult {
  show: boolean;
  reasons: {
    rapidBodyFatLoss: boolean;
    scanFrequencyAttempts: boolean;
    bodyFatBelowThreshold: boolean;
    pastDisorderedEatingHistory: boolean;
  };
}

/**
 * Rapid body-fat loss over the most recent 3 scans (spec section 3.2.5
 * condition 1): the first-to-last DROP across the last three available values
 * is >= RAPID_BODY_FAT_DROP_PCT_OVER_3_SCANS. Needs at least 3 numeric values.
 */
export function isRapidBodyFatLossOver3Scans(
  recentOldestFirst: ReadonlyArray<number | null | undefined> | undefined,
): boolean {
  if (!recentOldestFirst) return false;
  const nums = recentOldestFirst.filter(
    (v): v is number => typeof v === 'number' && !Number.isNaN(v),
  );
  if (nums.length < 3) return false;
  const lastThree = nums.slice(-3);
  const drop = lastThree[0] - lastThree[lastThree.length - 1];
  return drop >= RAPID_BODY_FAT_DROP_PCT_OVER_3_SCANS;
}

/**
 * Decide whether the support resource card should show, and why (spec section
 * 3.2.5). The card shows when ANY of the four conditions is met:
 *   1. rapid weight/body-fat loss over the last 3 scans,
 *   2. repeated scan-frequency attempts (>= 3 in the window),
 *   3. body fat at/below the clinical threshold for age/sex,
 *   4. a disclosed past (or current) disordered-eating history.
 *
 * Pure + total: missing data for a condition simply leaves that reason false.
 * The card itself is NON-intrusive (informational pointer only); this function
 * decides ONLY whether it appears, not its (clinician-gated) wording.
 */
export function decideResourceCard(
  input: ResourceCardTriggerInput,
): ResourceCardTriggerResult {
  const rapidBodyFatLoss = isRapidBodyFatLossOver3Scans(input.recentBodyFatPctOldestFirst);

  const scanFrequencyAttempts =
    typeof input.scanFrequencyAttemptsInWindow === 'number' &&
    input.scanFrequencyAttemptsInWindow >= SCAN_FREQUENCY_ATTEMPTS_TRIGGER;

  const bodyFatBelowThreshold = isBodyFatAtOrBelowClinicalThreshold(
    input.latestBodyFatPct,
    input.sex,
    input.ageYears,
  );

  // Both a CURRENT and an IN-THE-PAST disclosed history qualify as a "past
  // disordered-eating history" trigger for the persistent support pointer.
  const pastDisorderedEatingHistory =
    input.disorderedEatingResponse === 'currently' ||
    input.disorderedEatingResponse === 'in_the_past';

  return {
    show:
      rapidBodyFatLoss ||
      scanFrequencyAttempts ||
      bodyFatBelowThreshold ||
      pastDisorderedEatingHistory,
    reasons: {
      rapidBodyFatLoss,
      scanFrequencyAttempts,
      bodyFatBelowThreshold,
      pastDisorderedEatingHistory,
    },
  };
}

// ---------------------------------------------------------------------------
// Practitioner-visibility guard (section 3 privacy + section 3.2.6)
// ---------------------------------------------------------------------------

// The set of object KEYS that would indicate the disordered-eating response (or
// any body-composition leaderboard exposure) has leaked into a surface where it
// must never appear: any practitioner-facing payload, and any Helix
// leaderboard / peer-comparison row. Checked case-insensitively as a substring.
export const FORBIDDEN_DISORDERED_EATING_KEY_FRAGMENTS: readonly string[] = [
  'disordered_eating',
  'disorderedeating',
  'eating_disorder',
  'eatingdisorder',
  // The real persisted column names (profiles.body_scan_de_response /
  // body_scan_de_answered_at, migration 20260516000110). Catch the actual
  // column identifier, not just the human phrase, so a raw row spread cannot
  // leak it into a practitioner payload.
  'body_scan_de',
  'de_response',
] as const;

// Body-composition key fragments that must never appear on a Helix leaderboard /
// peer-comparison row (spec section 3.2.6: body scan composition is never shown
// in any leaderboard or peer comparison).
export const FORBIDDEN_LEADERBOARD_COMPOSITION_KEY_FRAGMENTS: readonly string[] = [
  'body_fat',
  'bodyfat',
  'body_composition',
  'bodycomposition',
  'lean_mass',
  'leanmass',
  'fat_mass',
  'fatmass',
  'visceral',
] as const;

/**
 * Return the forbidden keys (case-insensitive substring match) found anywhere in
 * an object, given a list of forbidden fragments. Deep over plain objects +
 * arrays. Empty array means clean. Mirrors practitioner-scan.ts findHelixExposure.
 */
export function findForbiddenKeys(
  obj: unknown,
  fragments: readonly string[],
): string[] {
  const hits: string[] = [];
  const visit = (value: unknown, path: string): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => visit(item, path ? `${path}[${i}]` : `[${i}]`));
      return;
    }
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (fragments.some((frag) => lower.includes(frag))) {
        hits.push(path ? `${path}.${key}` : key);
      }
      visit((value as Record<string, unknown>)[key], path ? `${path}.${key}` : key);
    }
  };
  visit(obj, '');
  return hits;
}

/**
 * Throw if a payload destined for a practitioner surface carries the disordered-
 * eating response under any recognizable key (spec section 3 privacy). Call on
 * any practitioner payload before it crosses into the render/transport layer so
 * a future refactor cannot silently expose it.
 */
export function assertResponseNotInPractitionerPayload(payload: unknown): void {
  const hits = findForbiddenKeys(payload, FORBIDDEN_DISORDERED_EATING_KEY_FRAGMENTS);
  if (hits.length > 0) {
    throw new Error(
      `Disordered-eating response leaked into practitioner payload: ${hits.join(', ')}`,
    );
  }
}

/**
 * Throw if a Helix leaderboard / peer-comparison row carries any body-
 * composition field (spec section 3.2.6). The existing leaderboard row shape
 * (rank/name/initials/helix) is composition-free; this guard keeps it that way.
 */
export function assertNoCompositionInLeaderboardRow(row: unknown): void {
  const hits = findForbiddenKeys(row, FORBIDDEN_LEADERBOARD_COMPOSITION_KEY_FRAGMENTS);
  if (hits.length > 0) {
    throw new Error(
      `Body composition leaked into a Helix leaderboard row: ${hits.join(', ')}`,
    );
  }
}
