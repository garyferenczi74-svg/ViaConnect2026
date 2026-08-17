/**
 * Prompt 221 Phase 1: embed kb_items for hybrid search.
 * Fail-open: missing key / API error leaves embedding null; item still stored.
 * Vector write via set_kb_item_embedding RPC (no direct postgres import; keeps edge/client safe).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import { embedText, EMBEDDING_DIMS } from "./embeddings";

/** Compose representative text for embedding (Part E chunking rule, short form). */
export function composeItemEmbedText(row: {
  title?: string | null;
  summary?: string | null;
  payload_type?: string | null;
  evidence_grade?: string | null;
}): string {
  const parts = [
    row.title?.trim() || "",
    row.summary?.trim() || "",
    row.payload_type ? `type:${row.payload_type}` : "",
    row.evidence_grade ? `grade:${row.evidence_grade}` : "",
  ].filter(Boolean);
  return parts.join("\n").slice(0, 6000);
}

/**
 * Embed one item and write vector column. Returns true if embedding stored.
 */
export async function embedAndStoreKbItem(itemId: string): Promise<boolean> {
  const sb = createAdminClient();
  const { data: row, error } = await sb
    .from("kb_items")
    .select("id, title, summary, payload_type, evidence_grade")
    .eq("id", itemId)
    .maybeSingle();

  if (error || !row) {
    safeLog.warn("kb.embedItem", "load failed", {
      itemId,
      error: error?.message,
    });
    return false;
  }

  const text = composeItemEmbedText(row as Record<string, string | null>);
  if (!text.trim()) return false;

  const values = await embedText(text);
  if (!values || values.length !== EMBEDDING_DIMS) {
    safeLog.warn("kb.embedItem", "embedText returned null", { itemId });
    return false;
  }

  const vectorLiteral = `[${values.join(",")}]`;

  const { error: rpcErr } = await sb.rpc("set_kb_item_embedding", {
    p_item_id: itemId,
    p_embedding: vectorLiteral,
  });

  if (rpcErr) {
    // Fallback: PostgREST update with vector literal
    const { error: upErr } = await sb
      .from("kb_items")
      .update({
        embedding: vectorLiteral as unknown as number[],
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId);
    if (upErr) {
      safeLog.warn("kb.embedItem", "write failed", {
        itemId,
        rpc: rpcErr.message,
        update: upErr.message,
      });
      return false;
    }
  }
  return true;
}

/**
 * Backfill embeddings for Jeffery-approved items missing vectors.
 */
export async function backfillKbEmbeddings(limit = 20): Promise<{
  attempted: number;
  embedded: number;
  failed: number;
}> {
  const stats = { attempted: 0, embedded: 0, failed: 0 };
  const sb = createAdminClient();

  // Prefer RPC list if available; else table select
  const { data, error } = await sb
    .from("kb_items")
    .select("id")
    .eq("jeffery_verdict", "approved")
    .in("gate_status", ["approved", "lex_approved"])
    .is("embedding", null)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) {
    if (error) {
      safeLog.warn("kb.embedItem", "backfill list failed", {
        error: error.message,
      });
    }
    return stats;
  }

  for (const row of data) {
    stats.attempted += 1;
    const ok = await embedAndStoreKbItem(String(row.id));
    if (ok) stats.embedded += 1;
    else stats.failed += 1;
  }
  return stats;
}
