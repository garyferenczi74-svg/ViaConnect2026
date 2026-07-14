/**
 * src/lib/formavision/pregnancy/pregnancyMode.ts
 *
 * Prompt 211b Workstream 4a -- pregnancy-mode gating service.
 *
 * PURE service, no IO. Decides whether pregnancy mode is active from the
 * already-loaded user_health_context.pregnancy_status (Prompt 208a,
 * migration 20260621134000), and returns a typed gating result the display
 * layer consumes. This service DECIDES; W4b wires the suppression into the
 * composition surfaces (composition/page.tsx and friends are not touched
 * here).
 *
 * Honesty / safety rule (non-negotiable):
 *   - When pregnancy mode is active, COMPOSITION estimates (body fat,
 *     composition deltas, future-self projection, personal bands) are
 *     SUPPRESSED with supportive copy. This service NEVER emits a
 *     composition estimate when active; it only returns the suppression
 *     decision and copy.
 *   - Girth MEASUREMENTS are never suppressed by this service. Suppression is
 *     scoped to composition estimates only.
 *
 * The pregnant/lactating value convention mirrors the existing
 * src/lib/protocol/synthesis.ts PREGNANT_VALUES check (pregnant, lactating,
 * breastfeeding, nursing) so pregnancy-mode gating reads the same
 * pregnancy_status values consistently across the app. That module is not
 * imported here to keep this a standalone, dependency-free FormaVision
 * service; the convention is duplicated intentionally, not the logic path.
 */

/** The subset of UserHealthContext this service needs. */
export interface PregnancyModeHealthContext {
  pregnancyStatus: string | null;
}

const PREGNANT_STATUS_VALUES = ['pregnant', 'lactating', 'breastfeeding', 'nursing'];

/**
 * Determines whether pregnancy mode is active for a user, from their
 * user_health_context.pregnancy_status value.
 *
 * @param userHealthContext The subset of the user's health context carrying pregnancy_status.
 * @returns true when pregnancy_status matches a pregnant/lactating value.
 */
export function isPregnancyModeActive(userHealthContext: PregnancyModeHealthContext): boolean {
  const status = userHealthContext.pregnancyStatus;
  if (typeof status !== 'string') return false;
  const normalized = status.toLowerCase();
  return PREGNANT_STATUS_VALUES.some((value) => normalized.includes(value));
}

/** Supportive, non-alarming copy shown in place of a suppressed composition estimate. */
export const PREGNANCY_COMPOSITION_SUPPRESSED_COPY =
  'Body composition estimates are paused while pregnancy or lactation mode is active. Your girth measurements stay available so you can keep tracking comfortably.';

/** The gating decision the display layer consumes. */
export interface CompositionGatingResult {
  /** true when composition estimates must not be shown; girth measurements are unaffected. */
  compositionSuppressed: boolean;
  /** Supportive copy to show in place of the suppressed estimate, or null when not suppressed. */
  reason: string | null;
}

/**
 * Returns the composition-suppression gating result for a user's health
 * context. When pregnancy mode is active, compositionSuppressed is true and
 * reason carries the supportive copy. Girth measurements are never part of
 * this gate; the caller must continue to display them regardless of this
 * result.
 *
 * @param userHealthContext The subset of the user's health context carrying pregnancy_status.
 * @returns CompositionGatingResult. NEVER instructs the caller to emit a composition estimate when active.
 */
export function getCompositionGating(
  userHealthContext: PregnancyModeHealthContext,
): CompositionGatingResult {
  const active = isPregnancyModeActive(userHealthContext);
  return {
    compositionSuppressed: active,
    reason: active ? PREGNANCY_COMPOSITION_SUPPRESSED_COPY : null,
  };
}
