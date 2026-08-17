/**
 * Prompt 221: flip collection status to live when Phase 1 corpus is populated.
 * Fail-open; never demotes without explicit operator action.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";

const PHASE1_SLUGS = [
  "clinical_studies",
  "bioavailability_studies",
  "peptide_education",
] as const;

export async function syncPhase1CollectionStatus(): Promise<{
  updated: string[];
  skipped: string[];
}> {
  const updated: string[] = [];
  const skipped: string[] = [];
  const sb = createAdminClient();

  for (const slug of PHASE1_SLUGS) {
    try {
      const { data: coll } = await sb
        .from("kb_collections")
        .select("id, status")
        .eq("slug", slug)
        .maybeSingle();
      if (!coll?.id) {
        skipped.push(slug);
        continue;
      }

      const { count } = await sb
        .from("kb_items")
        .select("id", { count: "exact", head: true })
        .eq("primary_collection_id", coll.id)
        .in("gate_status", ["approved", "lex_approved"])
        .eq("jeffery_verdict", "approved");

      const n = count ?? 0;
      if (n <= 0) {
        skipped.push(slug);
        continue;
      }

      if (coll.status === "live") {
        skipped.push(`${slug}:already_live`);
        continue;
      }

      const { error } = await sb
        .from("kb_collections")
        .update({ status: "live" })
        .eq("id", coll.id);

      if (error) {
        safeLog.warn("kb.syncCollectionStatus", "update failed", {
          slug,
          error: error.message,
        });
        skipped.push(`${slug}:error`);
      } else {
        updated.push(`${slug}:${n}`);
      }
    } catch (err) {
      safeLog.warn("kb.syncCollectionStatus", "threw", {
        slug,
        error: err instanceof Error ? err.message : String(err),
      });
      skipped.push(`${slug}:threw`);
    }
  }

  return { updated, skipped };
}
