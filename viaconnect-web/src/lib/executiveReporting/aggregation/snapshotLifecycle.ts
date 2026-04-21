// Prompt #105 Workstream A — aggregation snapshot state machine.
// Pure. Mirrors the DB enum + the business rules from §4.1.

import type { AggregationSnapshotState } from '../types';

/** Pure: which target states is a given source state allowed to move to? */
export const ALLOWED_AGG_TRANSITIONS: Record<
  AggregationSnapshotState,
  readonly AggregationSnapshotState[]
> = {
  draft: ['computing', 'failed'],
  computing: ['computed', 'failed'],
  computed: ['cfo_review', 'failed'],
  cfo_review: ['cfo_approved', 'draft', 'failed'], // CFO can reject back to draft
  cfo_approved: ['locked', 'failed'],
  locked: [],
  failed: ['draft'], // can retry from draft
};

export function canTransitionAggregationSnapshot(
  from: AggregationSnapshotState,
  to: AggregationSnapshotState,
): boolean {
  return (ALLOWED_AGG_TRANSITIONS[from] as readonly AggregationSnapshotState[]).includes(to);
}

/** Pure: states that permit KPI snapshot inserts/updates. Once locked,
 *  the DB trigger blocks mutation (see enforce_locked_kpi_snapshot_immutability);
 *  this helper short-circuits client code from attempting a write. */
export function canWriteKPISnapshots(state: AggregationSnapshotState): boolean {
  return state === 'draft' || state === 'computing';
}

/** Pure: states that permit a pack draft to consume this snapshot.
 *  cfo_approved is the earliest; locked remains consumable forever. */
export function canConsumeInPackDraft(state: AggregationSnapshotState): boolean {
  return state === 'cfo_approved' || state === 'locked';
}
