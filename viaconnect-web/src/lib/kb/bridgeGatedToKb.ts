/**
 * Prompt 221 Phase 1 wire: Marshall-approved hounddog_gated_items -> kb_items
 * then promote + Jeffery review (fail-closed retrieval).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import { contentHashFromParts } from "./contentHash";
import { defaultGradeForStudyType } from "./grades";
import { promoteThenJefferyReview } from "./promotePipeline";

function extractPmid(url: string): string | null {
  const m = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)
    || url.match(/[?&]term=(\d+)/i)
    || url.match(/\bPMID[:\s]*(\d+)/i);
  return m?.[1] ?? null;
}

function looksBioavailability(title: string, summary: string): boolean {
  const t = `${title} ${summary}`.toLowerCase();
  return (
    t.includes("bioavailab") ||
    t.includes("absorption") ||
    t.includes("liposomal") ||
    t.includes("micellar") ||
    t.includes("cmax") ||
    t.includes("auc ")
  );
}

export interface BridgeResult {
  considered: number;
  inserted: number;
  promoted: number;
  jefferyApproved: number;
  skipped: number;
  errors: number;
  sampleItemIds: string[];
}

/**
 * Bridge recent gated research into clinical_studies / bioavailability_studies.
 */
export async function bridgeGatedItemsToKb(limit = 15): Promise<BridgeResult> {
  const stats: BridgeResult = {
    considered: 0,
    inserted: 0,
    promoted: 0,
    jefferyApproved: 0,
    skipped: 0,
    errors: 0,
    sampleItemIds: [],
  };

  const sb = createAdminClient();

  const { data: gated, error } = await sb
    .from("hounddog_gated_items")
    .select("id, staging_id, source_url, source_type, title, summary, created_at")
    .order("created_at", { ascending: false })
    .limit(limit * 3);

  if (error || !gated?.length) {
    if (error) {
      safeLog.warn("kb.bridge", "gated list failed", { error: error.message });
    }
    return stats;
  }

  const { data: clinical } = await sb
    .from("kb_collections")
    .select("id, slug")
    .in("slug", ["clinical_studies", "bioavailability_studies"]);

  const collBySlug = new Map(
    (clinical ?? []).map((c) => [String(c.slug), String(c.id)])
  );
  if (!collBySlug.has("clinical_studies")) {
    safeLog.warn("kb.bridge", "clinical_studies collection missing");
    return stats;
  }

  for (const raw of gated) {
    if (stats.inserted + stats.skipped + stats.errors >= limit * 2) break;
    const row = raw as {
      id: string;
      staging_id?: string;
      source_url: string;
      source_type?: string;
      title: string;
      summary: string;
    };
    stats.considered += 1;

    const url = row.source_url || "";
    const title = (row.title || "").trim();
    const summary = (row.summary || "").trim() || "UNKNOWN";
    if (!title || !url) {
      stats.skipped += 1;
      continue;
    }

    const hash = contentHashFromParts({
      source_url: url,
      title,
      summary: summary.slice(0, 500),
    });

    const { data: existing } = await sb
      .from("kb_items")
      .select("id, gate_status, jeffery_verdict")
      .eq("content_hash", hash)
      .maybeSingle();

    if (existing?.id) {
      // Already bridged: ensure Jeffery review if still pending
      if (
        (existing.gate_status === "approved" ||
          existing.gate_status === "lex_approved") &&
        (existing.jeffery_verdict === "pending" || !existing.jeffery_verdict)
      ) {
        const r = await promoteThenJefferyReview({
          itemId: String(existing.id),
          targetStatus: "approved",
          gateReason: "re-review pending Jeffery",
          producedByAgent: "hounddog",
        });
        if (r.jefferyVerdict === "approved") stats.jefferyApproved += 1;
      }
      stats.skipped += 1;
      continue;
    }

    const bio = looksBioavailability(title, summary);
    const collectionId = bio
      ? collBySlug.get("bioavailability_studies") ??
        collBySlug.get("clinical_studies")!
      : collBySlug.get("clinical_studies")!;

    const pmid = extractPmid(url);
    const grade = defaultGradeForStudyType("review") ?? "C";

    try {
      const { data: inserted, error: insErr } = await sb
        .from("kb_items")
        .insert({
          primary_collection_id: collectionId,
          title: title.slice(0, 500),
          summary: summary.slice(0, 2000),
          source_urls: [url],
          retrieval_timestamp: new Date().toISOString(),
          content_hash: hash,
          evidence_grade: grade,
          extraction_confidence: pmid ? 85 : 72,
          gate_status: "pending",
          jeffery_verdict: "pending",
          provenance: {
            bridge: "hounddog_gated_items",
            gated_id: row.id,
            staging_id: row.staging_id ?? null,
            handler_version: "221.wire.1",
            source_type: row.source_type ?? null,
          },
          payload_type: "study",
          practitioner_depth: false,
          consumer_safe: true,
        })
        .select("id")
        .maybeSingle();

      if (insErr || !inserted?.id) {
        // unique hash race
        stats.errors += 1;
        safeLog.warn("kb.bridge", "insert failed", {
          error: insErr?.message,
        });
        continue;
      }

      stats.inserted += 1;
      const itemId = String(inserted.id);
      stats.sampleItemIds.push(itemId);

      // Typed study row
      await sb.from("kb_studies").upsert(
        {
          item_id: itemId,
          pmid,
          doi: null,
          study_type: "review",
          outcomes_summary: summary.slice(0, 1000),
          is_bioavailability: bio,
          bioavailability_metrics: bio
            ? {
                compound: "UNKNOWN",
                formulation: "UNKNOWN",
                note: "Metrics not extracted in bridge pass",
              }
            : null,
          full_text_available: false,
        },
        { onConflict: "item_id" }
      );

      await sb.from("kb_item_collections").upsert(
        { item_id: itemId, collection_id: collectionId },
        { onConflict: "item_id,collection_id" }
      );

      const pr = await promoteThenJefferyReview({
        itemId,
        targetStatus: "approved",
        gateReason: "Marshall already approved via hounddog_gated_items bridge",
        producedByAgent: "hounddog",
      });
      if (pr.promoteOk) stats.promoted += 1;
      if (pr.jefferyVerdict === "approved") stats.jefferyApproved += 1;
      if (pr.error) stats.errors += 1;
    } catch (err) {
      stats.errors += 1;
      safeLog.warn("kb.bridge", "threw", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return stats;
}
