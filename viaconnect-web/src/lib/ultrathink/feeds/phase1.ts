/**
 * Phase 1 ultrathink feed registry (pubmed, clinicaltrials_gov, openfda).
 * Phase 2 sources stay registered in the table and are out of scope here.
 */

export const PHASE1_SOURCES = ["pubmed", "clinicaltrials_gov", "openfda"] as const;
export type Phase1Source = (typeof PHASE1_SOURCES)[number];

export const PHASE1_INTERVAL_MINUTES: Record<Phase1Source, number> = {
  pubmed: 360,
  clinicaltrials_gov: 1440,
  openfda: 1440,
};

export interface FeedRow {
  id: string;
  source: string;
  is_active: boolean;
  next_run_at: string | null;
  circuit_open_until: string | null;
  last_status: string | null;
}

export function isPhase1Source(source: string): source is Phase1Source {
  return (PHASE1_SOURCES as readonly string[]).includes(source);
}

export function selectDuePhase1Feeds(feeds: FeedRow[], now: Date): FeedRow[] {
  const nowIso = now.toISOString();
  return feeds.filter((feed) => {
    if (!feed.is_active) return false;
    if (!isPhase1Source(feed.source)) return false;
    if (feed.circuit_open_until && feed.circuit_open_until > nowIso) return false;
    if (feed.next_run_at && feed.next_run_at > nowIso) return false;
    return true;
  });
}

export function computeNextRunAt(source: Phase1Source, now: Date): string {
  const minutes = PHASE1_INTERVAL_MINUTES[source];
  return new Date(now.getTime() + minutes * 60_000).toISOString();
}
