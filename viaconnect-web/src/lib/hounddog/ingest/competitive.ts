/**
 * Prompt 221 Phase 2 C1: Firecrawl competitive product discovery.
 * Only Gary-approved competitive_sources domains. Facts-only staging.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import {
  defaultBudget,
  firecrawlSearch,
  type FirecrawlBudget,
} from "@/lib/hounddog/firecrawl/client";
import { contentHash } from "@/lib/hounddog/ingest/contentHash";
import { evaluateHoundDogGate } from "@/lib/hounddog/contentGate";
import {
  assertAllowlistScope,
  loadApprovedCompetitiveDomains,
  loadApprovedCompetitiveSources,
} from "@/lib/kb/competitiveAllowlist";
import {
  COMPETITIVE_SKU_SEEDS,
  looksLikeProductDetailUrl,
} from "@/lib/kb/competitiveSkuSeeds";
import { deepExtractCompetitiveLabel } from "@/lib/kb/deepLabelExtract";
import { hasUnknownOnlyIngredients } from "@/lib/kb/parseCompetitiveLabel";

export interface CompetitiveIngestStats {
  runId: string;
  runDate: string;
  allowlistSize: number;
  discovered: number;
  staged: number;
  blockedOutsideAllowlist: number;
  skippedNonProductUrl: number;
  seedsAttempted: number;
  seedsStaged: number;
  geminiExtracts: number;
  interactScrapes: number;
  visionExtracts: number;
  withIngredients: number;
  gateApproved: number;
  gateBlocked: number;
  gateEscalated: number;
  hitBudget: boolean;
  creditsUsed: number;
  pagesUsed: number;
  sampleUrls: string[];
}

/** Category-scoped discovery queries prefer product paths. */
const COMPETITIVE_QUERIES: ReadonlyArray<{ category: string; q: string }> = [
  {
    category: "base-formulations",
    q: "site:thorne.com/products magnesium OR vitamin C OR methyl",
  },
  {
    category: "advanced-formulas",
    q: "site:quicksilverscientific.com/products liposomal",
  },
  {
    category: "advanced-formulas",
    q: "site:bodybio.com/products phosphatidylcholine OR PC",
  },
  {
    category: "methylation-snp",
    q: "site:seekinghealth.com/products methylfolate OR folate OR B12",
  },
  {
    category: "methylation-snp",
    q: "site:pureencapsulations.com magnesium OR B-complex OR folate",
  },
  {
    category: "base-formulations",
    q: "site:nordicnaturals.com/consumers ultimate omega",
  },
  {
    category: "base-formulations",
    q: "site:nowfoods.com/products magnesium OR vitamin-d",
  },
  {
    category: "womens-health",
    q: "site:ritual.com/products essential multivitamin",
  },
  {
    category: "functional-mushrooms",
    q: "site:hostdefense.com/products lions mane OR reishi",
  },
  {
    category: "advanced-formulas",
    q: "site:lifeextension.com/vitamins-supplements omega OR curcumin",
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
  /** Override seed list rotation (for consecutive force runs). */
  seedOffset?: number;
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
    skippedNonProductUrl: 0,
    seedsAttempted: 0,
    seedsStaged: 0,
    geminiExtracts: 0,
    interactScrapes: 0,
    visionExtracts: 0,
    withIngredients: 0,
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

  const stageOne = async (input: {
    url: string;
    category: string;
    titleHint?: string;
    brandHint?: string;
    fromSeed?: boolean;
  }): Promise<boolean> => {
    if (budget.hitBudget) return false;
    const scope = assertAllowlistScope(input.url, allow);
    if (!scope.ok) {
      stats.blockedOutsideAllowlist += 1;
      return false;
    }
    if (!looksLikeProductDetailUrl(input.url) && !input.fromSeed) {
      stats.skippedNonProductUrl += 1;
      return false;
    }

    stats.discovered += 1;

    const titleHint = stripMarketingNoise(
      (input.titleHint || "Competitive product").slice(0, 240)
    );
    // Seeds: full deep path (interact + vision). Search hits: interact only.
    const deep = await deepExtractCompetitiveLabel({
      url: input.url,
      title: titleHint,
      budget,
      allowInteract: true,
      allowVision: Boolean(input.fromSeed),
    });

    const title = stripMarketingNoise(
      (deep.pageTitle || titleHint || "Competitive product").slice(0, 240)
    );
    const markdown = deep.markdown || "";
    const labelFacts = deep.facts;
    const knownLines = labelFacts.ingredient_rows
      .filter((r) => r.ingredient_name !== "UNKNOWN")
      .slice(0, 8)
      .map(
        (r) =>
          `${r.ingredient_name}${r.dose_amount != null ? ` ${r.dose_amount}${r.dose_unit ?? ""}` : ""}`
      );
    const summary =
      stripMarketingNoise(
        [
          title,
          labelFacts.serving_size
            ? `Serving size: ${labelFacts.serving_size}`
            : "",
          knownLines.join("; "),
          markdown.slice(0, 400),
        ]
          .filter(Boolean)
          .join(". ")
      ).slice(0, 800) || "UNKNOWN";
    const brand =
      input.brandHint || brandFromHost(scope.host, labelByDomain);

    if (deep.interacted) stats.interactScrapes += 1;
    if (deep.path.startsWith("vision")) stats.visionExtracts += 1;
    if (deep.path === "gemini_text") stats.geminiExtracts += 1;
    if (!hasUnknownOnlyIngredients(labelFacts.ingredient_rows)) {
      stats.withIngredients += 1;
    }

    const fullText =
      markdown.slice(0, 4000) ||
      knownLines.join("\n") ||
      summary;

    const hash = contentHash([
      "competitive",
      input.url,
      title,
      summary.slice(0, 200),
    ]);

    const gate = evaluateHoundDogGate({
      title,
      summary,
      source_url: input.url,
      source_type: "competitive_product",
    });

    if (gate.verdict === "blocked") {
      stats.gateBlocked += 1;
      return false;
    }
    if (gate.verdict === "escalated") {
      stats.gateEscalated += 1;
    } else {
      stats.gateApproved += 1;
    }

    const { error } = await supabase.from("hounddog_staging_items").upsert(
      {
        source_url: input.url,
        source_type: "competitive_product",
        title,
        summary,
        retrieved_at: new Date().toISOString(),
        raw_payload: {
          brand,
          category: input.category,
          phase: 2,
          collection: "competitive_supplements",
          host: scope.host,
          gate_notes: gate.notes,
          from_seed: Boolean(input.fromSeed),
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
          deep_path: deep.path,
          markdown_len: deep.markdownLen,
          handler_version: "221.phase2.c1deep.1",
        },
        is_aggregate_only: true,
        robots_ok: true,
        gate_status: gate.verdict === "escalated" ? "escalated" : "pending",
        content_hash: hash,
        external_id: `competitive:${hash.slice(0, 32)}`,
        agent_slug: "hounddog",
        topic_key: `competitive:${input.category}`,
        relevance_score: input.fromSeed ? 0.9 : 0.75,
        full_text_excerpt: fullText.slice(0, 4000),
      },
      { onConflict: "source_url" }
    );

    if (!error) {
      stats.staged += 1;
      if (input.fromSeed) stats.seedsStaged += 1;
      if (stats.sampleUrls.length < 10) stats.sampleUrls.push(input.url);
      return true;
    }
    safeLog.warn("competitive.ingest", "stage failed", {
      error: error.message,
    });
    return false;
  };

  // 1) Curated SKU seeds first (5 per window; vision enabled on seeds)
  const seedWindow = 5;
  const seedOffset =
    (opts?.seedOffset ?? Math.floor(Date.now() / 1000)) %
    Math.max(1, COMPETITIVE_SKU_SEEDS.length);
  const seeds = [
    ...COMPETITIVE_SKU_SEEDS.slice(seedOffset, seedOffset + seedWindow),
    ...COMPETITIVE_SKU_SEEDS.slice(
      0,
      Math.max(0, seedWindow - (COMPETITIVE_SKU_SEEDS.length - seedOffset))
    ),
  ].slice(0, seedWindow);

  for (const seed of seeds) {
    if (budget.hitBudget) break;
    stats.seedsAttempted += 1;
    await stageOne({
      url: seed.url,
      category: seed.category,
      titleHint: seed.productHint,
      brandHint: seed.brandHint,
      fromSeed: true,
    });
  }

  // 2) Open discovery only if budget remains (keep small; seeds are primary)
  const queries = COMPETITIVE_QUERIES.slice(0, Math.min(maxQueries, 2));
  for (const { category, q } of queries) {
    if (budget.hitBudget) break;
    const search = await firecrawlSearch(q, budget, 2);
    if (!search.ok || !search.results?.length) continue;
    for (const hit of search.results) {
      if (budget.hitBudget) break;
      await stageOne({
        url: hit.url ?? "",
        category,
        titleHint: hit.title,
      });
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
          seedsStaged: stats.seedsStaged,
          geminiExtracts: stats.geminiExtracts,
        },
      },
      { onConflict: "source_key,topic_key" }
    );
  } catch {
    /* open */
  }

  return stats;
}
