import { randomUUID } from "node:crypto";
import { safeLog } from "@/lib/utils/safe-log";
import { ingestPhase1Source, type IngestDeps, type IngestResult } from "./ingest";
import {
  computeNextRunAt,
  isPhase1Source,
  selectDuePhase1Feeds,
  type FeedRow,
  type Phase1Source,
} from "./phase1";
import type { Phase1Store } from "./store";

export interface Phase1DispatchResult {
  ok: boolean;
  runId: string;
  durationMs: number;
  due: Phase1Source[];
  skippedNotDue: string[];
  skippedNotPhase1: string[];
  dispatched: IngestResult[];
  nextRunAt: Record<string, string>;
}

export interface DispatchPhase1Options {
  store: Phase1Store;
  fetchFn?: typeof fetch;
  env?: IngestDeps["env"];
  now?: Date;
  runId?: string;
}

export async function dispatchPhase1Feeds(
  options: DispatchPhase1Options
): Promise<Phase1DispatchResult> {
  const now = options.now ?? new Date();
  const runId = options.runId ?? randomUUID();
  const t0 = Date.now();
  const fetchFn = options.fetchFn ?? fetch;
  const env = options.env ?? {
    NCBI_API_KEY: process.env.NCBI_API_KEY || undefined,
    FDA_API_KEY: process.env.FDA_API_KEY || undefined,
  };

  const feeds = await options.store.listActiveFeeds();
  const due = selectDuePhase1Feeds(feeds, now);
  const dueSources = due.map((feed) => feed.source).filter(isPhase1Source);
  const skippedNotPhase1 = feeds
    .filter((feed) => !isPhase1Source(feed.source))
    .map((feed) => feed.source);
  const skippedNotDue = feeds
    .filter((feed) => isPhase1Source(feed.source) && !due.some((row) => row.id === feed.id))
    .map((feed) => feed.source);

  const dispatched: IngestResult[] = [];
  const nextRunAt: Record<string, string> = {};

  for (const feed of due) {
    if (!isPhase1Source(feed.source)) continue;
    const source: Phase1Source = feed.source;
    const ingest = await ingestPhase1Source(source, runId, {
      store: options.store,
      fetchFn,
      env,
      now,
    });
    dispatched.push(ingest);

    const next = computeNextRunAt(source, now);
    await options.store.updateNextRunAt(feed.id, next);
    nextRunAt[source] = next;
  }

  await options.store.recordSync({
    runId,
    source: "orchestrator",
    action: "tick",
    recordsIn: feeds.length,
    recordsAdded: dispatched.filter((row) => row.status === "ok").length,
    recordsSkipped: skippedNotDue.length + skippedNotPhase1.length,
    recordsError: dispatched.filter((row) => row.status === "error").length,
    durationMs: Date.now() - t0,
    status: dispatched.some((row) => row.status === "error") ? "partial" : "ok",
    errorMessage: null,
    metadata: {
      due: dueSources,
      skipped_not_due: skippedNotDue,
      skipped_not_phase1: skippedNotPhase1,
      next_run_at: nextRunAt,
      phase: 1,
    },
  });

  safeLog.info("ultrathink.phase1.dispatch", "tick complete", {
    runId,
    due: dueSources,
    added: dispatched.reduce((sum, row) => sum + row.added, 0),
    errors: dispatched.filter((row) => row.status === "error").length,
  });

  return {
    ok: dispatched.every((row) => row.status === "ok") || due.length === 0,
    runId,
    durationMs: Date.now() - t0,
    due: dueSources,
    skippedNotDue,
    skippedNotPhase1,
    dispatched,
    nextRunAt,
  };
}

export function describeFeedSchedule(feeds: FeedRow[], now: Date): {
  duePhase1: string[];
  notDuePhase1: string[];
  phase2: string[];
} {
  const due = new Set(selectDuePhase1Feeds(feeds, now).map((feed) => feed.source));
  return {
    duePhase1: feeds.filter((feed) => isPhase1Source(feed.source) && due.has(feed.source)).map((f) => f.source),
    notDuePhase1: feeds
      .filter((feed) => isPhase1Source(feed.source) && !due.has(feed.source))
      .map((feed) => feed.source),
    phase2: feeds.filter((feed) => !isPhase1Source(feed.source)).map((feed) => feed.source),
  };
}
