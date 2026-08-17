/**
 * Prompt 221 Phase 1: embed kb_items for hybrid search.
 * Fail-open: missing key / API error leaves embedding null; item still stored.
 * Prefer direct Postgres write for pgvector (PostgREST vector updates are fragile).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import { embedText, EMBEDDING_DIMS } from "./embeddings";

function buildConnectionString(): string | null {
  const direct =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL;
  if (direct && direct.trim().length > 0) {
    return direct.trim().replace(/^["']|["']$/g, "");
  }
  const host = process.env.POSTGRES_HOST?.trim();
  const user = process.env.POSTGRES_USER?.trim() || "postgres";
  const password = process.env.POSTGRES_PASSWORD?.trim();
  const database = process.env.POSTGRES_DATABASE?.trim() || "postgres";
  if (host && password) {
    return `postgresql://${user}:${encodeURIComponent(password)}@${host}:5432/${database}`;
  }
  return null;
}

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
  const conn = buildConnectionString();

  if (conn) {
    try {
      const postgres = (await import("postgres")).default;
      const sql = postgres(conn, { max: 1, idle_timeout: 5, connect_timeout: 15 });
      try {
        await sql.unsafe(
          `UPDATE public.kb_items
           SET embedding = $1::extensions.vector,
               updated_at = now()
           WHERE id = $2::uuid`,
          [vectorLiteral, itemId]
        );
        return true;
      } finally {
        await sql.end({ timeout: 5 });
      }
    } catch (err) {
      safeLog.warn("kb.embedItem", "postgres write failed, trying supabase", {
        itemId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const { error: upErr } = await sb
    .from("kb_items")
    .update({
      embedding: vectorLiteral as unknown as number[],
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  if (upErr) {
    safeLog.warn("kb.embedItem", "supabase update failed", {
      itemId,
      error: upErr.message,
    });
    return false;
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
  reason?: string;
}> {
  const stats = { attempted: 0, embedded: 0, failed: 0, reason: undefined as string | undefined };
  const conn = buildConnectionString();

  if (conn) {
    try {
      const postgres = (await import("postgres")).default;
      const sql = postgres(conn, { max: 1, idle_timeout: 5, connect_timeout: 15 });
      try {
        const rows = await sql<{ id: string }[]>`
          SELECT id::text AS id
          FROM public.kb_items
          WHERE jeffery_verdict = 'approved'
            AND gate_status IN ('approved', 'lex_approved')
            AND embedding IS NULL
          ORDER BY updated_at DESC
          LIMIT ${limit}
        `;
        for (const row of rows) {
          stats.attempted += 1;
          const ok = await embedAndStoreKbItem(row.id);
          if (ok) stats.embedded += 1;
          else stats.failed += 1;
        }
        return stats;
      } finally {
        await sql.end({ timeout: 5 });
      }
    } catch (err) {
      stats.reason = err instanceof Error ? err.message : String(err);
      safeLog.warn("kb.embedItem", "postgres backfill list failed", {
        error: stats.reason,
      });
    }
  }

  const sb = createAdminClient();
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
      stats.reason = error.message;
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
