/**
 * Prompt 221 Phase 2 C1: Firecrawl competitive product discovery.
 * Only Gary-approved competitive_sources domains. Facts-only staging.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import {
  defaultBudget,
  firecrawlSearch,
  firecrawlScrape,
  type FirecrawlBudget,
} from "@/lib/hounddog/firecrawl/client";
import { contentHash } from "@/lib/hounddog/ingest/contentHash";
import { evaluateHoundDogGate } from "@/lib/hounddog/contentGate";
import {
  assertAllowlistScope,
  loadApprovedCompetitiveDomains,
  loadApprovedCompetitiveSources,
} from "@/lib/kb/competitiveAllowlist";
import { parseCompetitiveLabelText } from "@/lib/kb/parseCompetitiveLabel";

export interface CompetitiveIngestStats {
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

/** Category-scoped discovery queries (top-N intent; allowlist filters hosts). */
const COMPETITIVE_QUERIES: ReadonlyArray<{ category: string; q: string }> = [
  {
    category: "advanced-formulas",
    q: "site:thorne.com liposomal OR micellar supplement product",
  },
  {
    category: "advanced-formulas",
    q: "site:quicksilverscientific.com liposomal product",
  },
  {
    category: "advanced-formulas",
    q: "site:bodybio.com PC OR phospholipid product",
  },
  {
    category: "methylation-snp",
    q: "site:seekinghealth.com methylfolate OR MTHFR product",
  },
  {
    category: "methylation-snp",
    q: "site:pureencapsulations.com methylated B vitamin product",
  },
  {
    category: "base-formulations",
    q: "site:nordicnaturals.com omega-3 fish oil product",
  },
  {
    category: "base-formulations",
    q: "site:nowfoods.com magnesium OR vitamin D product",
  },
  {
    category: "womens-health",
    q: "site:ritual.com prenatal OR multivitamin product",
  },
  {
    category: "functional-mushrooms",
    q: "site:hostdefense.com mushroom extract product",
  },
  {
    category: "advanced-formulas",
    q: "site:lifeextension.com curcumin OR NMN product",
  },
];

function brandFromHost(host: string, labelByDomain: Map<string, string>): string {
  for (const [domain, label] of labelByDomain) {
    if (host === domain || host.endsWith(`.${domain}`)) return label;
  }
  const root = host.replace(/^www\./, "").split(".")[0] ?? host;
  return root.charAt(0).toUpperCase() + root.slice(1);
}

function stripMarketingNoise(text: string): string {
  return text
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\b(best|miracle|cure|guaranteed|#1)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function runCompetitiveIngest(opts?: {
  runId?: string;
  runDate?: string;
  budget?: FirecrawlBudget;
  maxQueries?: number;
}): Promise<CompetitiveIngestStats> {
  const runDate = opts?.runDate ?? new Date().toISOString().slice(0, 10);
  const runId = opts?.runId ?? `competitive-${runDate}`;
  const budget = opts?.budget ?? defaultBudget();
  const maxQueries = opts?.maxQueries ?? COMPETITIVE_QUERIES.length;

  const allow = await loadApprovedCompetitiveDomains({
    kinds: ["brand", "retailer"],
  });
  const sources = await loadApprovedCompetitiveSources({
    kinds: ["brand", "retailer"],
  });
  const labelByDomain = new Map(sources.map((s) => [s.domain, s.label]));

  const stats: CompetitiveIngestStats = {
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
    safeLog.warn("competitive.ingest", "allowlist empty; skip crawl");
    return stats;
  }

  const supabase = createAdminClient();
  const queries = COMPETITIVE_QUERIES.slice(0, maxQueries);

  for (const { category, q } of queries) {
    if (budget.hitBudget) break;

    const search = await firecrawlSearch(q, budget, 4);
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
          // Keep enough page body for Supplement Facts parsing
          excerpt = scrape.markdown.slice(0, 6000);
        }
      }

      const title = stripMarketingNoise(
        (hit.title ?? "Competitive product").slice(0, 240)
      );
      const summary = stripMarketingNoise(excerpt).slice(0, 800) || "UNKNOWN";
      const brand = brandFromHost(scope.host, labelByDomain);
      const labelFacts = parseCompetitiveLabelText(excerpt, { title });
      const hash = contentHash([
        "competitive",
        url,
        title,
        summary.slice(0, 200),
      ]);

      const gate = evaluateHoundDogGate({
        title,
        summary,
        source_url: url,
        source_type: "competitive_product",
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
          source_type: "competitive_product",
          title,
          summary,
          retrieved_at: new Date().toISOString(),
          raw_payload: {
            brand,
            category,
            phase: 2,
            collection: "competitive_supplements",
            host: scope.host,
            gate_notes: gate.notes,
            ingredient_rows: labelFacts.ingredient_rows,
            serving_size: labelFacts.serving_size,
            servings_per_container: labelFacts.servings_per_container,
            list_price: labelFacts.list_price,
            currency: labelFacts.currency,
            price_per_serving: labelFacts.price_per_serving,
            label_claims: labelFacts.label_claims,
            delivery_technology: labelFacts.delivery_technology,
            availability_note: labelFacts.availability_note,
            extraction_confidence: labelFacts.extraction_confidence,
            parse_notes: labelFacts.parse_notes,
            handler_version: "221.phase2.c1e.1",
          },
          is_aggregate_only: true,
          robots_ok: true,
          gate_status: gate.verdict === "escalated" ? "escalated" : "pending",
          content_hash: hash,
          external_id: `competitive:${hash.slice(0, 32)}`,
          agent_slug: "hounddog",
          topic_key: `competitive:${category}`,
          relevance_score: 0.75,
          full_text_excerpt: excerpt.slice(0, 4000),
        },
        { onConflict: "source_url" }
      );

      if (!error) {
        stats.staged += 1;
        if (stats.sampleUrls.length < 8) stats.sampleUrls.push(url);
      } else {
        safeLog.warn("competitive.ingest", "stage failed", {
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
        source_key: "firecrawl_competitive",
        topic_key: "global",
        cursor_date: runDate,
        last_run_status: stats.staged > 0 ? "ok" : "empty",
        last_new_items: stats.staged,
        last_run_at: new Date().toISOString(),
        config: {
          discovered: stats.discovered,
          blockedOutsideAllowlist: stats.blockedOutsideAllowlist,
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
