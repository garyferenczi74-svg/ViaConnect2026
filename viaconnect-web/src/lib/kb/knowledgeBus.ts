// knowledge_bus TS read/guard layer (Prompt 208, Task 8b)
//
// Provides:
//   subscribeBus            - polling subscriber (seq cursor-based catch-up)
//   maxCursor               - advance stored cursor after a poll
//   canTransitionToPublished - publish-transition guard (Task 9 uses this)
//
// No live DB writes. Fail-open on read errors.

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BusEvent {
  id: string;
  seq: number;
  event_type: string;
  ref_table: string;
  ref_id: string;
  domain: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// subscribeBus
//
// Returns all knowledge_bus rows with seq > sinceCursor, ordered ascending.
// Callers (Gordon, Arnold) use this as a polling fallback to catch up after
// a gap. Fail-open: DB errors are logged and [] is returned so callers degrade
// gracefully rather than crashing.
// ---------------------------------------------------------------------------

export async function subscribeBus(sinceCursor: number): Promise<BusEvent[]> {
  const client = createAdminClient();

  const { data, error } = await client
    .from('knowledge_bus')
    .gt('seq', sinceCursor)
    .order('seq', { ascending: true });

  if (error || data === null) {
    safeLog.error('knowledge-bus', 'subscribeBus query failed', {
      sinceCursor,
      error,
    });
    return [];
  }

  return data as BusEvent[];
}

// ---------------------------------------------------------------------------
// maxCursor
//
// Returns the highest seq value found in events, or fallback when events is
// empty. Subscribers store this value and pass it back to subscribeBus on the
// next poll to avoid re-processing events.
// ---------------------------------------------------------------------------

export function maxCursor(events: BusEvent[], fallback: number): number {
  if (events.length === 0) return fallback;
  return events.reduce((max, e) => (e.seq > max ? e.seq : max), events[0].seq);
}

// ---------------------------------------------------------------------------
// canTransitionToPublished
//
// A row may only advance to published from the in_review stage. Jumping from
// draft (or any other status) to published is blocked. Task 9 calls this
// before executing a publish mutation.
// ---------------------------------------------------------------------------

export function canTransitionToPublished(from: string): boolean {
  return from === 'in_review';
}
