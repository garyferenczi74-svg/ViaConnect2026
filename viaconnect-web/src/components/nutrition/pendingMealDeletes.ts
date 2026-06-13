// Gary (2026-06-13): shared registry of meal IDs that have been optimistically
// removed in the UI but whose server DELETE has not yet committed.
//
// Why this exists. useRemoveMeal defers the DELETE for a 5 second undo window
// (REMOVE_UNDO_WINDOW_MS) and, in the meantime, only edits the React Query
// ['user-meals'] cache, so a quick undo never touches the server. But
// useUserMeals also holds a realtime postgres_changes channel on the meals table
// and invalidates ['user-meals'] on ANY change. Logging or loading another meal
// during the undo window fires that channel, refetches, and the server still has
// the not yet deleted meal, so the optimistic removal is clobbered and the meal
// reappears (the bug Gary hit on the My Nutrition Log Today's meals card: remove
// works, then the meal readds when another meal loads).
//
// The fix: while a meal is pending deletion, its ID lives here, and useUserMeals
// filters it out of every result until the DELETE commits (or is undone, or
// fails and the row is restored). This survives refetches without weakening the
// deferred delete or the undo contract.
//
// It is a tiny module level pub/sub so useRemoveMeal (the writer) and
// useUserMeals (the reader, via useSyncExternalStore) share one source of truth
// across unrelated component trees. getSnapshot returns a NEW Set reference on
// every change and a STABLE one between changes, which is exactly the contract
// useSyncExternalStore needs to both re-render on change and avoid render loops.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

type Listener = () => void;

let snapshot: ReadonlySet<string> = new Set<string>();
const listeners = new Set<Listener>();

function publish(next: ReadonlySet<string>): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

export const pendingMealDeletes = {
  // Mark a meal as pending deletion (optimistically removed, DELETE not yet
  // sent). No-op for an empty id or one already pending so we never notify
  // subscribers without an actual change.
  add(mealId: string): void {
    if (!mealId || snapshot.has(mealId)) return;
    const next = new Set(snapshot);
    next.add(mealId);
    publish(next);
  },
  // Clear a meal from the pending set: the DELETE committed, the user undid it,
  // or it failed and the row was restored. Idempotent.
  remove(mealId: string): void {
    if (!snapshot.has(mealId)) return;
    const next = new Set(snapshot);
    next.delete(mealId);
    publish(next);
  },
  has(mealId: string): boolean {
    return snapshot.has(mealId);
  },
  // Stable between changes, fresh on each change. useSyncExternalStore relies on
  // this to avoid both missed updates and infinite render loops.
  getSnapshot(): ReadonlySet<string> {
    return snapshot;
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export default pendingMealDeletes;
