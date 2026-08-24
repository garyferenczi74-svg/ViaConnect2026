/**
 * Prompt 221 Phase 2 C4: bridge genetic test staging into kb_items + kb_genetic_tests.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import { contentHashFromParts } from "./contentHash";
import { promoteThenJefferyReview } from "./promotePipeline";

export interface GeneticBridgeResult {
  considered: number;
  inserted: number;
  promoted: number;
  jefferyApproved: number;
  skipped: number;
  errors: number;
  sampleItemIds: string[];
}

function inferTestType(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes("whole genome") || t.includes("wgs")) return "WGS";
  if (t.includes("exome") || t.includes("wes")) return "WES";
  if (t.includes("panel") || t.includes("hereditary")) return "targeted_panel";
  if (t.includes("clinical") || t.includes("invitae") || t.includes("color"))
    return "clinical";
  if (t.includes("array") || t.includes("ancestry") || t.includes("23andme"))
    return "consumer_array";
  return null;
}

export async function bridgeGeneticTestsToKb(
  limit = 12
): Promise<GeneticBridgeResult> {
  const stats: GeneticBridgeResult = {
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
    .eq("slug", "genetic_tests")
    .maybeSingle();

  if (!coll?.id) {
    safeLog.warn("kb.geneticBridge", "genetic_tests collection missing");
    return stats;
  }
  const collectionId = String(coll.id);

  const { data: staged } = await sb
    .from("hounddog_staging_items")
    .select("id, source_url, title, summary, raw_payload, gate_status")
    .eq("source_type", "genetic_test")
    .in("gate_status", ["approved", "pending"])
    .order("retrieved_at", { ascending: false })
    .limit(limit * 2);

  for (const s of staged ?? []) {
    if (stats.inserted + stats.skipped + stats.errors >= limit) break;
    stats.considered += 1;
    const url = String(s.source_url ?? "");
    const title = String(s.title ?? "").trim();
    const summary = String(s.summary ?? "").trim() || "UNKNOWN";
    if (!title || !url) {
      stats.skipped += 1;
      continue;
    }

    const payload =
      s.raw_payload && typeof s.raw_payload === "object"
        ? (s.raw_payload as Record<string, unknown>)
        : {};
    const provider =
      typeof payload.provider === "string" && payload.provider
        ? payload.provider
        : "UNKNOWN";

    const hash = contentHashFromParts({
      source_url: url,
      title,
      summary: summary.slice(0, 400),
      kind: "genetic_test",
    });

    const { data: existing } = await sb
      .from("kb_items")
      .select("id, gate_status, jeffery_verdict")
      .eq("content_hash", hash)
      .maybeSingle();

    if (existing?.id) {
      if (
        (existing.gate_status === "approved" ||
          existing.gate_status === "lex_approved") &&
        (existing.jeffery_verdict === "pending" || !existing.jeffery_verdict)
      ) {
        const r = await promoteThenJefferyReview({
          itemId: String(existing.id),
          targetStatus: "approved",
          gateReason: "genetic test re-review pending Jeffery",
          producedByAgent: "elysium",
        });
        if (r.jefferyVerdict === "approved") stats.jefferyApproved += 1;
      }
      stats.skipped += 1;
      continue;
    }

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
          evidence_grade: "D",
          extraction_confidence: 72,
          gate_status: "pending",
          jeffery_verdict: "pending",
          provenance: {
            bridge: "genetic_tests_phase2",
            staging_id: s.id,
            handler_version: "221.phase2.1",
            provider,
          },
          payload_type: "genetic_test",
          practitioner_depth: false,
          consumer_safe: true,
        })
        .select("id")
        .maybeSingle();

      if (insErr || !inserted?.id) {
        stats.errors += 1;
        safeLog.warn("kb.geneticBridge", "insert failed", {
          error: insErr?.message,
        });
        continue;
      }

      stats.inserted += 1;
      const itemId = String(inserted.id);
      stats.sampleItemIds.push(itemId);

      await sb.from("kb_genetic_tests").upsert(
        {
          item_id: itemId,
          provider: provider.slice(0, 200),
          test_name: title.slice(0, 300),
          test_type: inferTestType(`${title} ${summary}`),
          panel_scope: { note: "UNKNOWN; panel SNPs not enumerated in pass 1" },
          sample_type: "UNKNOWN",
          methodology: "UNKNOWN",
          report_features: [],
          raw_data_export: false,
          genex360_overlap: {
            note: "Overlap not computed in Phase 2 pass 1",
            count: null,
          },
          source: url,
          last_verified_at: new Date().toISOString(),
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
        gateReason: "Phase 2 genetic test bridge; Elysium discovery",
        producedByAgent: "elysium",
      });
      if (pr.promoteOk) stats.promoted += 1;
      if (pr.jefferyVerdict === "approved") stats.jefferyApproved += 1;
      if (pr.error) stats.errors += 1;
    } catch (err) {
      stats.errors += 1;
      safeLog.warn("kb.geneticBridge", "threw", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return stats;
}
