/**
 * Prompt 221 Phase 2 cleanup: reject study-shaped kb_items whose source URLs
 * are competitive/genetic allowlist hosts (mis-bridged by clinical bridge).
 * Leaves correct competitive_supplements / genetic_tests product rows alone.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import {
  hostFromUrl,
  isHostAllowlisted,
  loadApprovedCompetitiveDomains,
} from "./competitiveAllowlist";

export interface MisbridgeRepairResult {
  scanned: number;
  rejected: number;
  skipped: number;
  errors: number;
  sampleTitles: string[];
}

export async function repairMisbridgedCompetitiveStudies(
  limit = 40
): Promise<MisbridgeRepairResult> {
  const stats: MisbridgeRepairResult = {
    scanned: 0,
    rejected: 0,
    skipped: 0,
    errors: 0,
    sampleTitles: [],
  };

  const competitiveHosts = await loadApprovedCompetitiveDomains();
  if (competitiveHosts.length === 0) {
    safeLog.warn("kb.repairMisbridge", "allowlist empty; skip repair");
    return stats;
  }

  const sb = createAdminClient();

  const { data: collections } = await sb
    .from("kb_collections")
    .select("id, slug")
    .in("slug", ["clinical_studies", "bioavailability_studies"]);

  const clinicalIds = new Set(
    (collections ?? []).map((c) => String((c as { id: string }).id))
  );
  if (clinicalIds.size === 0) return stats;

  const { data: rows, error } = await sb
    .from("kb_items")
    .select(
      "id, title, source_urls, payload_type, gate_status, primary_collection_id, evidence_grade"
    )
    .eq("payload_type", "study")
    .in("gate_status", ["approved", "lex_approved", "pending"])
    .order("created_at", { ascending: false })
    .limit(Math.max(limit * 3, 80));

  if (error || !rows?.length) {
    if (error) {
      safeLog.warn("kb.repairMisbridge", "list failed", { error: error.message });
    }
    return stats;
  }

  for (const raw of rows) {
    if (stats.rejected + stats.errors >= limit) break;
    stats.scanned += 1;
    const row = raw as {
      id: string;
      title: string;
      source_urls: string[] | null;
      primary_collection_id: string;
      gate_status: string;
    };

    if (!clinicalIds.has(String(row.primary_collection_id))) {
      stats.skipped += 1;
      continue;
    }

    const urls = Array.isArray(row.source_urls) ? row.source_urls : [];
    const hostsOnAllowlist = urls.some((u) => {
      const host = hostFromUrl(String(u));
      return host ? isHostAllowlisted(host, competitiveHosts) : false;
    });

    if (!hostsOnAllowlist) {
      stats.skipped += 1;
      continue;
    }

    try {
      const { error: rejErr } = await sb.rpc("promote_kb_item", {
        p_item_id: row.id,
        p_target_status: "rejected",
        p_gate_reason:
          "Phase 2 repair: competitive/genetic brand host mis-bridged as study; product lane owns this URL",
        p_lex_decision_id: null,
      });

      if (rejErr) {
        // Fallback direct update if RPC rejects already-rejected transitions
        const { error: upErr } = await sb
          .from("kb_items")
          .update({
            gate_status: "rejected",
            gate_reason:
              "Phase 2 repair: competitive host mis-bridged as study",
            gate_decided_at: new Date().toISOString(),
            jeffery_verdict: "rejected",
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (upErr) {
          stats.errors += 1;
          safeLog.warn("kb.repairMisbridge", "reject failed", {
            id: row.id,
            error: upErr.message,
            rpc: rejErr.message,
          });
          continue;
        }
      } else {
        // Keep Jeffery verdict aligned so kb_search fail-closed stays honest
        await sb
          .from("kb_items")
          .update({
            jeffery_verdict: "rejected",
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      }

      stats.rejected += 1;
      if (stats.sampleTitles.length < 8) {
        stats.sampleTitles.push(String(row.title ?? "").slice(0, 80));
      }
    } catch (err) {
      stats.errors += 1;
      safeLog.warn("kb.repairMisbridge", "threw", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return stats;
}
