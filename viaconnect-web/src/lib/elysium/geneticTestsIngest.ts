/**
 * Prompt 221 Phase 2 C4: genetic test provider discovery (allowlist only).
 * Elysium owns genetic_tests collection; Marshall gate via staging.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import {
  firecrawlSearch,
  firecrawlScrape,
  type FirecrawlBudget,
} from "@/lib/hounddog/firecrawl/client";
import { createDayAwareBudget } from "@/lib/hounddog/firecrawl/dayCap";
import { contentHash } from "@/lib/hounddog/ingest/contentHash";
import { evaluateHoundDogGate } from "@/lib/hounddog/contentGate";
import {
  assertAllowlistScope,
  loadApprovedCompetitiveDomains,
  loadApprovedCompetitiveSources,
} from "@/lib/kb/competitiveAllowlist";

export interface GeneticTestsIngestStats {
  runId: string;
  runDate: string;
  allowlistSize: number;
  discovered: number;
  staged: number;
  blockedOutsideAllowlist: number;
  gateApproved: number;
  gateBlocked: number;
  gateEscalated: number;
  hitBudget: boolean;
  creditsUsed: number;
  pagesUsed: number;
  sampleUrls: string[];
}

const GENETIC_QUERIES: readonly string[] = [
  "site:23andme.com health ancestry dna kit",
  "site:ancestry.com dna kit product",
  "site:nebula.org whole genome sequencing",
  "site:sequencing.com whole genome product",
  "site:invitae.com genetic testing panel",
  "site:color.com hereditary genetic test",
  "site:selfdecode.com dna analysis report",
  "site:genomelink.io dna traits report",
];

function providerFromHost(
  host: string,
  labelByDomain: Map<string, string>
): string {
  for (const [domain, label] of labelByDomain) {
    if (host === domain || host.endsWith(`.${domain}`)) return label;
  }
  return host.replace(/^www\./, "");
}

export async function runGeneticTestsIngest(opts?: {
  runId?: string;
  runDate?: string;
  budget?: FirecrawlBudget;
  maxQueries?: number;
}): Promise<GeneticTestsIngestStats> {
  const runDate = opts?.runDate ?? new Date().toISOString().slice(0, 10);
  const runId = opts?.runId ?? `genetic-tests-${runDate}`;
  const maxQueries = opts?.maxQueries ?? GENETIC_QUERIES.length;
  const supabase = createAdminClient();
  const budget = opts?.budget ?? (await createDayAwareBudget(supabase));

  const allow = await loadApprovedCompetitiveDomains({
    kinds: ["genetic_test_provider"],
  });
  const sources = await loadApprovedCompetitiveSources({
    kinds: ["genetic_test_provider"],
  });
  const labelByDomain = new Map(sources.map((s) => [s.domain, s.label]));

  const stats: GeneticTestsIngestStats = {
    runId,
    runDate,
    allowlistSize: allow.length,
    discovered: 0,
    staged: 0,
    blockedOutsideAllowlist: 0,
    gateApproved: 0,
    gateBlocked: 0,
    gateEscalated: 0,
    hitBudget: false,
    creditsUsed: 0,
    pagesUsed: 0,
    sampleUrls: [],
  };

  if (allow.length === 0) {
    safeLog.warn("geneticTests.ingest", "allowlist empty; skip crawl");
    return stats;
  }

  for (const q of GENETIC_QUERIES.slice(0, maxQueries)) {
    if (budget.hitBudget) break;
    const search = await firecrawlSearch(q, budget, 3);
    if (!search.ok || !search.results?.length) continue;

    for (const hit of search.results) {
      if (budget.hitBudget) break;
      stats.discovered += 1;
      const url = hit.url ?? "";
      const scope = assertAllowlistScope(url, allow);
      if (!scope.ok) {
        stats.blockedOutsideAllowlist += 1;
        continue;
      }

      let excerpt = hit.description ?? hit.title ?? "";
      if (!budget.hitBudget) {
        const scrape = await firecrawlScrape(url, budget);
        if (scrape.ok && scrape.markdown) {
          excerpt = scrape.markdown.slice(0, 1200);
        }
      }

      const title = (hit.title ?? "Genetic test offering")
        .replace(/[\u2013\u2014]/g, "-")
        .slice(0, 240);
      const summary =
        excerpt
          .replace(/[\u2013\u2014]/g, "-")
          .slice(0, 800) || "UNKNOWN";
      const provider = providerFromHost(scope.host, labelByDomain);
      const hash = contentHash([
        "genetic_test",
        url,
        title,
        summary.slice(0, 200),
      ]);

      const gate = evaluateHoundDogGate({
        title,
        summary,
        source_url: url,
        source_type: "genetic_test",
      });

      if (gate.verdict === "blocked") {
        stats.gateBlocked += 1;
        continue;
      }
      if (gate.verdict === "escalated") {
        stats.gateEscalated += 1;
      } else {
        stats.gateApproved += 1;
      }

      const { error } = await supabase.from("hounddog_staging_items").upsert(
        {
          source_url: url,
          source_type: "genetic_test",
          title,
          summary,
          retrieved_at: new Date().toISOString(),
          raw_payload: {
            provider,
            phase: 2,
            collection: "genetic_tests",
            host: scope.host,
            gate_notes: gate.notes,
          },
          is_aggregate_only: true,
          robots_ok: true,
          gate_status: gate.verdict === "escalated" ? "escalated" : "pending",
          content_hash: hash,
          external_id: `genetic:${hash.slice(0, 32)}`,
          agent_slug: "elysium",
          topic_key: "genetic_tests",
          relevance_score: 0.8,
          full_text_excerpt: excerpt.slice(0, 2000),
        },
        { onConflict: "source_url" }
      );

      if (!error) {
        stats.staged += 1;
        if (stats.sampleUrls.length < 8) stats.sampleUrls.push(url);
      } else {
        safeLog.warn("geneticTests.ingest", "stage failed", {
          error: error.message,
        });
      }
    }
  }

  stats.hitBudget = budget.hitBudget;
  stats.creditsUsed = budget.creditsUsed;
  stats.pagesUsed = budget.pagesUsed;

  try {
    await supabase.from("discovery_cursors").upsert(
      {
        source_key: "firecrawl_genetic_tests",
        topic_key: "global",
        cursor_date: runDate,
        last_run_status: stats.staged > 0 ? "ok" : "empty",
        last_new_items: stats.staged,
        last_run_at: new Date().toISOString(),
        config: {
          discovered: stats.discovered,
          allowlistSize: stats.allowlistSize,
        },
      },
      { onConflict: "source_key,topic_key" }
    );
  } catch {
    /* open */
  }

  return stats;
}
