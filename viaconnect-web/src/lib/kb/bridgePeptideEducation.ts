/**
 * Prompt 221 Phase 1 C5: structural migrate peptide_education_entries -> kb_items.
 * practitioner_depth preserved; Marshall already applied on source catalog.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import { contentHashFromParts, contentHashFromText } from "./contentHash";
import { promoteThenJefferyReview } from "./promotePipeline";

function mapEvidenceGrade(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const g = raw.trim().toUpperCase();
  if (g === "A" || g === "B" || g === "C" || g === "D" || g === "E") return g;
  if (g === "STRONG" || g === "HIGH") return "B";
  if (g === "MODERATE" || g === "MEDIUM") return "C";
  if (g === "EMERGING" || g === "LOW" || g === "UNKNOWN") return "D";
  return null;
}

export interface PeptideBridgeResult {
  considered: number;
  inserted: number;
  promoted: number;
  jefferyApproved: number;
  skipped: number;
  errors: number;
  sampleItemIds: string[];
}

export async function bridgePeptideEducationToKb(
  limit = 30
): Promise<PeptideBridgeResult> {
  const stats: PeptideBridgeResult = {
    considered: 0,
    inserted: 0,
    promoted: 0,
    jefferyApproved: 0,
    skipped: 0,
    errors: 0,
    sampleItemIds: [],
  };

  const sb = createAdminClient();
  const { data: coll } = await sb
    .from("kb_collections")
    .select("id")
    .eq("slug", "peptide_education")
    .maybeSingle();

  if (!coll?.id) {
    safeLog.warn("kb.peptideBridge", "peptide_education collection missing");
    return stats;
  }
  const collectionId = String(coll.id);

  const { data: entries, error } = await sb
    .from("peptide_education_entries")
    .select(
      "id, entry_key, title, summary, mechanism, evidence_grade, source_url, content_hash, is_practitioner_depth, is_active, regulatory_status, safety_context"
    )
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error || !entries?.length) {
    if (error) {
      safeLog.warn("kb.peptideBridge", "list failed", { error: error.message });
    }
    return stats;
  }

  for (const raw of entries) {
    const row = raw as Record<string, unknown>;
    stats.considered += 1;
    const title = String(row.title ?? "").trim();
    const summary = String(row.summary ?? "").trim() || "UNKNOWN";
    if (!title) {
      stats.skipped += 1;
      continue;
    }

    const sourceUrl =
      typeof row.source_url === "string" && row.source_url
        ? row.source_url
        : `internal:peptide_education:${row.entry_key}`;

    const hash =
      typeof row.content_hash === "string" && row.content_hash.length >= 32
        ? row.content_hash
        : contentHashFromParts({
            entry_key: String(row.entry_key ?? ""),
            title,
            summary: summary.slice(0, 400),
          });

    const { data: existing } = await sb
      .from("kb_items")
      .select("id, jeffery_verdict, gate_status")
      .eq("content_hash", hash)
      .maybeSingle();

    if (existing?.id) {
      stats.skipped += 1;
      continue;
    }

    const grade = mapEvidenceGrade(
      typeof row.evidence_grade === "string" ? row.evidence_grade : null
    );
    const practitioner = Boolean(row.is_practitioner_depth);

    try {
      const bodyExtra = [
        typeof row.mechanism === "string" ? row.mechanism : "",
        typeof row.regulatory_status === "string"
          ? `Regulatory: ${row.regulatory_status}`
          : "",
        typeof row.safety_context === "string" ? row.safety_context : "",
      ]
        .filter(Boolean)
        .join(" ");

      const fullSummary = [summary, bodyExtra].filter(Boolean).join(" ").slice(0, 2000);

      const { data: inserted, error: insErr } = await sb
        .from("kb_items")
        .insert({
          primary_collection_id: collectionId,
          title: title.slice(0, 500),
          summary: fullSummary,
          source_urls: [sourceUrl],
          retrieval_timestamp: new Date().toISOString(),
          content_hash: hash.length === 64 ? hash : contentHashFromText(hash + title),
          evidence_grade: grade,
          extraction_confidence: 90,
          gate_status: "pending",
          jeffery_verdict: "pending",
          provenance: {
            bridge: "peptide_education_entries",
            entry_key: row.entry_key,
            source_id: row.id,
            handler_version: "221.phase1.c5.1",
          },
          payload_type: "education_entry",
          practitioner_depth: practitioner,
          consumer_safe: !practitioner,
        })
        .select("id")
        .maybeSingle();

      if (insErr || !inserted?.id) {
        stats.errors += 1;
        continue;
      }

      stats.inserted += 1;
      const itemId = String(inserted.id);
      stats.sampleItemIds.push(itemId);

      await sb.from("kb_item_collections").upsert(
        { item_id: itemId, collection_id: collectionId },
        { onConflict: "item_id,collection_id" }
      );

      const pr = await promoteThenJefferyReview({
        itemId,
        targetStatus: "approved",
        gateReason:
          "C5 structural migrate from peptide_education_entries (214c catalog)",
        producedByAgent: "thanos",
      });
      if (pr.promoteOk) stats.promoted += 1;
      if (pr.jefferyVerdict === "approved") stats.jefferyApproved += 1;
    } catch (err) {
      stats.errors += 1;
      safeLog.warn("kb.peptideBridge", "threw", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return stats;
}
