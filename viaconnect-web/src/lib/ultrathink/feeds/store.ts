import { createAdminClient } from "@/lib/supabase/admin";
import type { FeedRow, Phase1Source } from "./phase1";

export interface ResearchFeedInsert {
  source: Phase1Source;
  external_id: string;
  title: string;
  abstract: string | null;
  authors: string[];
  published_at: string | null;
  url: string;
  raw_payload: Record<string, unknown>;
  status: "pending";
}

export interface SyncRecord {
  runId: string;
  source: string;
  action: string;
  recordsIn: number;
  recordsAdded: number;
  recordsSkipped: number;
  recordsError: number;
  durationMs: number;
  status: "ok" | "partial" | "error";
  errorMessage: string | null;
  metadata: Record<string, unknown>;
}

export interface Phase1Store {
  listActiveFeeds(): Promise<FeedRow[]>;
  updateNextRunAt(id: string, nextRunAt: string): Promise<void>;
  existingExternalIds(source: Phase1Source, ids: string[]): Promise<Set<string>>;
  insertResearchRows(rows: ResearchFeedInsert[]): Promise<void>;
  recordSync(entry: SyncRecord): Promise<void>;
}

export function createSupabasePhase1Store(): Phase1Store {
  const db = createAdminClient();

  return {
    async listActiveFeeds(): Promise<FeedRow[]> {
      const { data, error } = await db
        .from("ultrathink_data_feeds")
        .select("id, source, is_active, next_run_at, circuit_open_until, last_status")
        .eq("is_active", true)
        .order("next_run_at", { ascending: true, nullsFirst: true });
      if (error) throw new Error(`feed read: ${error.message}`);
      return (data ?? []) as FeedRow[];
    },

    async updateNextRunAt(id: string, nextRunAt: string): Promise<void> {
      const { error } = await db
        .from("ultrathink_data_feeds")
        .update({
          next_run_at: nextRunAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw new Error(`next_run_at update: ${error.message}`);
    },

    async existingExternalIds(source: Phase1Source, ids: string[]): Promise<Set<string>> {
      if (ids.length === 0) return new Set();
      const { data, error } = await db
        .from("ultrathink_research_feed")
        .select("external_id")
        .eq("source", source)
        .in("external_id", ids);
      if (error) throw new Error(`dedupe read: ${error.message}`);
      return new Set((data ?? []).map((row) => String(row.external_id)));
    },

    async insertResearchRows(rows: ResearchFeedInsert[]): Promise<void> {
      if (rows.length === 0) return;
      const { error } = await db.from("ultrathink_research_feed").insert(rows);
      if (error) throw new Error(`research_feed insert: ${error.message}`);
    },

    async recordSync(entry: SyncRecord): Promise<void> {
      const { error } = await db.rpc("ultrathink_record_sync", {
        p_run_id: entry.runId,
        p_source: entry.source,
        p_action: entry.action,
        p_in: entry.recordsIn,
        p_added: entry.recordsAdded,
        p_skipped: entry.recordsSkipped,
        p_error: entry.recordsError,
        p_cost: 0,
        p_duration: entry.durationMs,
        p_status: entry.status,
        p_err_msg: entry.errorMessage,
        p_metadata: entry.metadata,
      });
      if (error) throw new Error(`sync_log write: ${error.message}`);
    },
  };
}
