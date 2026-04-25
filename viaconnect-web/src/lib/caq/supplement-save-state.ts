// Pure helpers for the CAQ Phase 4b per-row save-state machine
// (Prompt #39 §7.3.4). Extracted so the optimistic-add + retry path is
// unit-testable independent of the React component.

export type SupplementSaveState = "pending" | "saved" | "failed";

/**
 * Generate a stable client id for a newly added supplement. Used as the
 * AnimatePresence key for the row pulse and as the lookup key into the
 * saveState map. Falls back to a Math.random suffix on platforms without
 * `crypto.randomUUID` (older Safari, server-side render edge cases).
 */
export function genSupplementId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Transition every row currently in the "pending" state to either "saved" or
 * "failed". Rows already in a terminal state are left alone so a successful
 * save does not overwrite a still-pending retry from a later add.
 */
export function transitionPendingTo(
  prev: Record<string, SupplementSaveState>,
  to: "saved" | "failed",
): Record<string, SupplementSaveState> {
  const next: Record<string, SupplementSaveState> = { ...prev };
  for (const id of Object.keys(next)) {
    if (next[id] === "pending") next[id] = to;
  }
  return next;
}

/**
 * Mark a single row pending again (used by the "Retry" button on a failed
 * row). Returns a new object so React state updates trigger a re-render.
 */
export function markRowPending(
  prev: Record<string, SupplementSaveState>,
  id: string,
): Record<string, SupplementSaveState> {
  return { ...prev, [id]: "pending" };
}
