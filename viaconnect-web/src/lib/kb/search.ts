/**
 * Prompt 221: kb_search capability wrapper.
 * Fail-open: missing embed / RPC error returns [] never throws.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import { embedText } from "./embeddings";
import type { EvidenceGrade } from "./grades";
import type { KbCollectionSlug } from "./collections";

export interface KbSearchOptions {
  collectionSlugs?: KbCollectionSlug[];
  minGrade?: EvidenceGrade;
  includePractitioner?: boolean;
  consumerOnly?: boolean;
  limit?: number;
}

export interface KbSearchHit {
  itemId: string;
  title: string;
  summary: string;
  evidenceGrade: string | null;
  gateStatus: string;
  collectionSlug: string;
  payloadType: string;
  distance: number;
  provenance: Record<string, unknown>;
}

export async function kbSearch(
  query: string,
  opts: KbSearchOptions = {}
): Promise<KbSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const embedding = await embedText(q);
  if (!embedding) {
    safeLog.warn("kb.search", "embed failed open empty", {
      queryShape: q.slice(0, 80),
    });
    return [];
  }

  try {
    const sb = createAdminClient();
    const { data, error } = await sb.rpc("kb_search", {
      p_query_embedding: embedding,
      p_collection_slugs: opts.collectionSlugs ?? null,
      p_min_grade: opts.minGrade ?? null,
      p_include_practitioner: opts.includePractitioner ?? false,
      p_consumer_only: opts.consumerOnly ?? true,
      p_limit: opts.limit ?? 6,
    });

    if (error || !data) {
      safeLog.warn("kb.search", "rpc failed open empty", {
        error: error?.message,
      });
      return [];
    }

    return (data as Array<Record<string, unknown>>).map((row) => ({
      itemId: String(row.item_id),
      title: String(row.title ?? ""),
      summary: String(row.summary ?? ""),
      evidenceGrade: (row.evidence_grade as string) ?? null,
      gateStatus: String(row.gate_status ?? ""),
      collectionSlug: String(row.collection_slug ?? ""),
      payloadType: String(row.payload_type ?? ""),
      distance: Number(row.distance ?? 1),
      provenance:
        row.provenance && typeof row.provenance === "object"
          ? (row.provenance as Record<string, unknown>)
          : {},
    }));
  } catch (err) {
    safeLog.warn("kb.search", "threw fail-open", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Format hits for Hannah context injection (citation contract).
 * Never includes grade E as evidence; caller still receives them if search did
 * for competitive awareness only when filters allow.
 */
export function formatHitsForHannahContext(hits: KbSearchHit[]): string {
  if (hits.length === 0) {
    return "KB retrieval: no relevant corpus items for this query.";
  }
  const lines = hits.map((h, i) => {
    const grade = h.evidenceGrade ?? "UNKNOWN";
    const citeNote =
      grade === "E"
        ? "(commercial/anecdotal; do not cite as scientific evidence)"
        : `(evidence grade ${grade})`;
    return `${i + 1}. [${h.collectionSlug}] ${h.title} ${citeNote}\n   ${h.summary}`;
  });
  return [
    "KB corpus context (cite sources with grade; prefer A/B; never invent sources):",
    ...lines,
  ].join("\n");
}
