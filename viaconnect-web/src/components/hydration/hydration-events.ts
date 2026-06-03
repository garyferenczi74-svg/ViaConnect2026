/**
 * Gary 2026-06-03: cross-mount hydration sync bus.
 *
 * Every successful hydration write (quick-log POST, edit PUT, delete DELETE)
 * calls notifyHydrationUpdated(); every read hook (useHydrationToday,
 * useHydrationHistory) subscribes on mount and refetches on notify, so a
 * tap on any one surface bumps the totals on every other mount in the same
 * tab. Module-level Set so listeners survive across React tree boundaries.
 */

const listeners = new Set<() => void>();

export function subscribeToHydrationUpdates(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function notifyHydrationUpdated(): void {
  for (const cb of listeners) {
    try {
      cb();
    } catch {
      // Listener errors must not break the broadcast; a misbehaving
      // subscriber should not prevent others from refreshing.
    }
  }
}
