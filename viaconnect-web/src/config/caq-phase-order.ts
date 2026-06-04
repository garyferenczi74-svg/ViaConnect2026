// Canonical CAQ form-phase order, expressed as data (Prompt 173 §3.3 +
// Prompt 173b §1 semantic binding).
//
// Prompt 173 Part 1A relocates Lifestyle from position 7 to 2; Medications,
// Supplements, and Allergies becomes the last form phase (position 7). The
// experienced order is array-driven and reorder-safe: every consumer (progress
// bar, interstitial sequencer, "Phase X of 7" label, completion trigger,
// resume logic) reads this array rather than scattered numeric literals.
// Reordering here automatically updates everything downstream.
//
// Stable identifiers (173b §1): each form phase is keyed by its short legacy
// id ("1", "3", "1b", "2a", "2b", "2c", "4"). These ids are preserved across
// the reorder; only the ORDER in which they appear changes. An in-flight
// session that paused at `/onboarding/3` resumes correctly because the route
// is the stable id, not the numeric position.
//
// The DB column `assessment_results.phase` (typed as an integer per the
// existing 168 + complete-caq.ts contract) is INDEPENDENT of the experienced
// order. complete-caq.ts continues to read phase 1 / 4 / 6 / 7 / 8 / 9
// regardless of how the form is sequenced. This file controls only the
// USER-FACING order, not the DB schema.

// ---------------------------------------------------------------------------
// 1. Stable form-phase identifiers (short legacy ids preserved for URL safety)
// ---------------------------------------------------------------------------

// Experienced order of the 7 CAQ form phases after Prompt 173 + 173b.
// Position | Legacy id | User-facing title
// ---------|-----------|------------------------------------------------------
//    1     |    "1"    | Demographics & Biodata
//    2     |    "3"    | Lifestyle & Goals               (moved from 7)
//    3     |   "1b"    | Health Concerns & Family History (moved from 2)
//    4     |   "2a"    | Physical Symptoms                (moved from 3)
//    5     |   "2b"    | Neuro Symptoms                   (moved from 4)
//    6     |   "2c"    | Emotional Symptoms               (moved from 5)
//    7     |    "4"    | Medications, Supplements, and Allergies (moved from 6; fires completion)
export const CAQ_FORM_PHASE_IDS = ["1", "3", "1b", "2a", "2b", "2c", "4"] as const;

export type CaqFormPhaseId = (typeof CAQ_FORM_PHASE_IDS)[number];

// ---------------------------------------------------------------------------
// 2. Semantic phase id mapping (Prompt 173b §1 binding rule)
// ---------------------------------------------------------------------------

// Stable semantic identifiers per 173b §2. Used by interstitial binding so the
// content travels with its phase regardless of the numeric position. Analytics
// events also key off the semantic id so historical funnel data stays
// interpretable across the remap.
export const CAQ_PHASE_SEMANTIC_ID: Record<CaqFormPhaseId, string> = {
  "1":  "phase_demographics",
  "3":  "phase_lifestyle",
  "1b": "phase_family_history",
  "2a": "phase_physical_symptoms",
  "2b": "phase_neuro_symptoms",
  "2c": "phase_emotional_symptoms",
  "4":  "phase_meds_supps",
} as const;

export type CaqPhaseSemanticId = (typeof CAQ_PHASE_SEMANTIC_ID)[CaqFormPhaseId];

// ---------------------------------------------------------------------------
// 3. Position-derived label helper (no hardcoded "Phase X of 7" literals)
// ---------------------------------------------------------------------------

export function getPhasePositionLabel(phaseId: CaqFormPhaseId | string): string {
  const idx = CAQ_FORM_PHASE_IDS.indexOf(phaseId as CaqFormPhaseId);
  if (idx < 0) return "";
  return `Phase ${idx + 1} of ${CAQ_FORM_PHASE_IDS.length}`;
}

// ---------------------------------------------------------------------------
// 4. Last-phase + completion trigger (173 §3.2: bind to event, not index)
// ---------------------------------------------------------------------------

export interface PhaseLike {
  id: string;
}

// True when `stepId` is the last form phase in the canonical order. The
// completion engines (Bio Optimization compute, Ultrathink protocol, symptom
// profile, wellness analytics) fire on this and nothing else. Moving a phase
// only requires reordering CAQ_FORM_PHASE_IDS, not editing the trigger.
//
// The `order` parameter accepts either the canonical array directly or any
// PhaseLike[] (e.g., the page's filtered PHASES slice with intermediate
// interstitials stripped) so tests can pass a mock order.
export function isLastFormPhase(
  stepId: string,
  order: ReadonlyArray<string | PhaseLike> = CAQ_FORM_PHASE_IDS,
): boolean {
  if (order.length === 0) return false;
  const last = order[order.length - 1];
  const lastId = typeof last === "string" ? last : last.id;
  return lastId === stepId;
}
