/**
 * Prompt 221 Phase 2: competitive_sources allowlist helpers.
 * Gary-approved domains only; fail-closed empty when DB unavailable (no crawl).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import {
  hostFromUrl,
  isHostAllowlisted,
  assertAllowlistScope,
} from "@/lib/agents/authorityAllowlist";

export type CompetitiveSourceKind =
  | "brand"
  | "retailer"
  | "genetic_test_provider"
  | "reference"
  | "other";

export interface CompetitiveSourceRow {
  domain: string;
  label: string;
  source_kind: CompetitiveSourceKind;
  category_tags: string[];
  base_url: string | null;
}

export { hostFromUrl, isHostAllowlisted, assertAllowlistScope };

/** Fail-closed: empty list means no competitive crawl (unlike science allowlist fallback). */
export async function loadApprovedCompetitiveDomains(opts?: {
  kinds?: CompetitiveSourceKind[];
}): Promise<string[]> {
  const rows = await loadApprovedCompetitiveSources(opts);
  return rows.map((r) => r.domain).filter(Boolean);
}

export async function loadApprovedCompetitiveSources(opts?: {
  kinds?: CompetitiveSourceKind[];
}): Promise<CompetitiveSourceRow[]> {
  try {
    const supabase = createAdminClient();
    let q = supabase
      .from("competitive_sources")
      .select("domain, label, source_kind, category_tags, base_url")
      .eq("is_active", true)
      .eq("approval_status", "approved");

    if (opts?.kinds?.length) {
      q = q.in("source_kind", opts.kinds);
    }

    const { data, error } = await q;
    if (error) {
      safeLog.warn("competitive.allowlist", "query failed", {
        error: error.message,
      });
      return [];
    }
    return (Array.isArray(data) ? data : []).map((r) => ({
      domain: String((r as { domain?: string }).domain ?? ""),
      label: String((r as { label?: string }).label ?? ""),
      source_kind: String(
        (r as { source_kind?: string }).source_kind ?? "brand"
      ) as CompetitiveSourceKind,
      category_tags: Array.isArray((r as { category_tags?: string[] }).category_tags)
        ? ((r as { category_tags: string[] }).category_tags as string[])
        : [],
      base_url:
        typeof (r as { base_url?: string | null }).base_url === "string"
          ? (r as { base_url: string }).base_url
          : null,
    })).filter((r) => r.domain.length > 0);
  } catch (err) {
    safeLog.warn("competitive.allowlist", "threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/** Static seed mirror for unit tests only (not used for live crawl). */
export const PHASE2_COMPETITIVE_SEED_DOMAINS: readonly string[] = [
  "quicksilverscientific.com",
  "bodybio.com",
  "livonlabs.com",
  "thorne.com",
  "pureencapsulations.com",
  "designsforhealth.com",
  "seekinghealth.com",
  "lifeextension.com",
  "nowfoods.com",
  "jarrow.com",
  "gardenoflife.com",
  "nordicnaturals.com",
  "momentous.com",
  "drinkag1.com",
  "ritual.com",
  "humann.com",
  "hostdefense.com",
  "foursigmatic.com",
  "iherb.com",
  "vitacost.com",
  // Gary-approved expand 2026-08-17 (competitor database seed docs)
  "codeage.com",
  "metagenics.com",
  "organika.com",
  "aor.ca",
  "canprev.ca",
  "canprev.com",
  "solgar.com",
  "orthomolecularproducts.com",
  "integrativepro.com",
  "doctorsbest.com",
  "cymbiotika.com",
  "cymbiotika.ca",
  "renuebyscience.com",
  "seed.com",
  "sisu.com",
  "im8health.com",
  "innosupps.com",
  "23andme.com",
  "ancestry.com",
  "nebula.org",
  "sequencing.com",
  "invitae.com",
  "color.com",
  "selfdecode.com",
  "genomelink.io",
  "myheritage.com",
  "tellmegen.com",
];
