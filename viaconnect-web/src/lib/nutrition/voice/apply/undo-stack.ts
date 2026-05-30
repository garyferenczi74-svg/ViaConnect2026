/**
 * In-memory undo stack for voice operations per §6.6.
 *
 * Each entry represents a batch of operations applied together (one Apply All
 * action). Within UNDO_WINDOW_MS the user can undo the most recent batch by
 * tapping the Undo toast.
 *
 * State is per-session only and not persisted. Once the meal is saved or the
 * session ends, the stack is cleared. The 10-second window is enforced here;
 * timer-driven UI hiding lives in the toast component.
 */

import type { UndoEntry, VoiceOperation } from '../types';
import { UNDO_WINDOW_MS } from '../feature-flags';

export class VoiceUndoStack {
  private entries: UndoEntry[] = [];

  push(operations: VoiceOperation[], appliedCount: number, now: number = Date.now()): void {
    this.entries.push({
      applied_at: now,
      operations,
      applied_count: appliedCount,
    });
  }

  /**
   * Returns the most recent entry if applied within UNDO_WINDOW_MS,
   * otherwise null. Pops the entry from the stack regardless of whether
   * it was within the window so stale entries do not accumulate.
   */
  popWithinWindow(now: number = Date.now()): UndoEntry | null {
    const entry = this.entries.pop();
    if (!entry) return null;
    if (now - entry.applied_at > UNDO_WINDOW_MS) {
      return null;
    }
    return entry;
  }

  peek(): UndoEntry | null {
    return this.entries[this.entries.length - 1] ?? null;
  }

  isWithinUndoWindow(now: number = Date.now()): boolean {
    const last = this.peek();
    if (!last) return false;
    return now - last.applied_at <= UNDO_WINDOW_MS;
  }

  /**
   * Milliseconds remaining in the undo window for the most recent entry.
   * Returns 0 when nothing is undoable. The toast component uses this to
   * drive the 10-second countdown.
   */
  remainingMsInWindow(now: number = Date.now()): number {
    const last = this.peek();
    if (!last) return 0;
    const elapsed = now - last.applied_at;
    return Math.max(0, UNDO_WINDOW_MS - elapsed);
  }

  clear(): void {
    this.entries = [];
  }

  get size(): number {
    return this.entries.length;
  }
}
