/**
 * Prompt 219M: cursor-based incremental discovery.
 * Advance only on full success (including honest empty).
 */

import { createAdminClientOrNull } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";

export type CursorRunStatus = "ok" | "empty" | "partial" | "failed";

export interface DiscoveryCursor {
  source_key: string;
  topic_key: string;
  cursor_date: string | null;
  cursor_timestamp: string | null;
  cursor_version: string | null;
  last_content_hash: string | null;
  last_run_at: string | null;
  last_run_status: CursorRunStatus | null;
  last_new_items: number;
  last_error: string | null;
  new_items_history: number[];
}

function parseHistory(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n))
    .slice(-48);
}

export async function loadDiscoveryCursor(
  sourceKey: string,
  topicKey = "global"
): Promise<DiscoveryCursor | null> {
  const supabase = createAdminClientOrNull();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("discovery_cursors")
      .select("*")
      .eq("source_key", sourceKey)
      .eq("topic_key", topicKey)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as Record<string, unknown>;
    return {
      source_key: String(row.source_key),
      topic_key: String(row.topic_key),
      cursor_date: (row.cursor_date as string) ?? null,
      cursor_timestamp: (row.cursor_timestamp as string) ?? null,
      cursor_version: (row.cursor_version as string) ?? null,
      last_content_hash: (row.last_content_hash as string) ?? null,
      last_run_at: (row.last_run_at as string) ?? null,
      last_run_status: (row.last_run_status as CursorRunStatus) ?? null,
      last_new_items: Number(row.last_new_items ?? 0),
      last_error: (row.last_error as string) ?? null,
      new_items_history: parseHistory(row.new_items_history),
    };
  } catch (err) {
    safeLog.warn("ops.cursors", "load failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function ensureDiscoveryCursor(args: {
  sourceKey: string;
  topicKey?: string;
  /** Backfill boundary YYYY-MM-DD when creating */
  seedDate?: string;
}): Promise<DiscoveryCursor | null> {
  const topic = args.topicKey ?? "global";
  const existing = await loadDiscoveryCursor(args.sourceKey, topic);
  if (existing) return existing;
  const supabase = createAdminClientOrNull();
  if (!supabase) return null;
  const seed = args.seedDate ?? "2026-08-15";
  try {
    await supabase.from("discovery_cursors").upsert(
      {
        source_key: args.sourceKey,
        topic_key: topic,
        cursor_date: seed,
        last_run_status: "empty",
        last_new_items: 0,
        new_items_history: [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_key,topic_key" }
    );
  } catch {
    /* open */
  }
  return loadDiscoveryCursor(args.sourceKey, topic);
}

/**
 * Advance cursor only when the run fully succeeded (ok or empty).
 * Partial/failed leave the cursor unmoved.
 */
export async function advanceDiscoveryCursor(args: {
  sourceKey: string;
  topicKey?: string;
  status: CursorRunStatus;
  newItems: number;
  /** Covered forward date (YYYY-MM-DD) or null to keep */
  cursorDate?: string | null;
  cursorTimestamp?: string | null;
  cursorVersion?: string | null;
  lastContentHash?: string | null;
  error?: string | null;
}): Promise<void> {
  const topic = args.topicKey ?? "global";
  const supabase = createAdminClientOrNull();
  if (!supabase) return;

  const fullSuccess = args.status === "ok" || args.status === "empty";
  const existing = await ensureDiscoveryCursor({
    sourceKey: args.sourceKey,
    topicKey: topic,
  });
  const history = [...(existing?.new_items_history ?? []), args.newItems].slice(
    -48
  );
  const now = new Date().toISOString();

  const patch: Record<string, unknown> = {
    last_run_at: now,
    last_run_status: args.status,
    last_new_items: args.newItems,
    last_error: args.error ?? null,
    new_items_history: history,
    updated_at: now,
  };

  if (fullSuccess) {
    if (args.cursorDate != null) patch.cursor_date = args.cursorDate;
    if (args.cursorTimestamp != null)
      patch.cursor_timestamp = args.cursorTimestamp;
    if (args.cursorVersion != null) patch.cursor_version = args.cursorVersion;
    if (args.lastContentHash != null)
      patch.last_content_hash = args.lastContentHash;
  }

  try {
    await supabase
      .from("discovery_cursors")
      .update(patch)
      .eq("source_key", args.sourceKey)
      .eq("topic_key", topic);
  } catch (err) {
    safeLog.warn("ops.cursors", "advance failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** PubMed mindate from cursor: day after last covered date (YYYY/MM/DD for NCBI). */
export function pubmedMindateFromCursor(cursorDate: string | null): string {
  if (!cursorDate || !/^\d{4}-\d{2}-\d{2}$/.test(cursorDate)) {
    // Default: last 3 days if no cursor (bounded)
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 3);
    return d.toISOString().slice(0, 10).replace(/-/g, "/");
  }
  const d = new Date(`${cursorDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "/");
}

/** YYYY-MM-DD covered through "today" after a successful forward run. */
export function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function listDiscoveryCursors(): Promise<DiscoveryCursor[]> {
  const supabase = createAdminClientOrNull();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("discovery_cursors")
      .select("*")
      .order("source_key", { ascending: true });
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map((row) => ({
      source_key: String(row.source_key),
      topic_key: String(row.topic_key),
      cursor_date: (row.cursor_date as string) ?? null,
      cursor_timestamp: (row.cursor_timestamp as string) ?? null,
      cursor_version: (row.cursor_version as string) ?? null,
      last_content_hash: (row.last_content_hash as string) ?? null,
      last_run_at: (row.last_run_at as string) ?? null,
      last_run_status: (row.last_run_status as CursorRunStatus) ?? null,
      last_new_items: Number(row.last_new_items ?? 0),
      last_error: (row.last_error as string) ?? null,
      new_items_history: parseHistory(row.new_items_history),
    }));
  } catch {
    return [];
  }
}

/** Stale if no successful advance within expectedMinutes * 2 */
export function cursorFreshnessStatus(
  lastRunAt: string | null,
  expectedMinutes: number
): "ok" | "warning" | "breach" | "unknown" {
  if (!lastRunAt) return "unknown";
  const ageMs = Date.now() - new Date(lastRunAt).getTime();
  if (!Number.isFinite(ageMs)) return "unknown";
  const limit = expectedMinutes * 2 * 60_000;
  if (ageMs <= expectedMinutes * 60_000) return "ok";
  if (ageMs <= limit) return "warning";
  return "breach";
}
