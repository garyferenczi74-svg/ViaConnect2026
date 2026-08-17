/**
 * Prompt 221 Phase 2 C1: re-parse staged full_text (or re-scrape) and fill
 * kb_products ingredient_rows / price / serving facts when still UNKNOWN.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import { defaultBudget } from "@/lib/hounddog/firecrawl/client";
import {
  augmentProductHintWithUrlDose,
  COMPETITIVE_SKU_SEEDS,
} from "./competitiveSkuSeeds";
import { deepExtractCompetitiveLabel } from "./deepLabelExtract";
import {
  hasUnknownOnlyIngredients,
  parseCompetitiveLabelText,
  type CompetitiveIngredientRow,
} from "./parseCompetitiveLabel";

export interface EnrichCompetitiveResult {
  considered: number;
  enriched: number;
  stillUnknown: number;
  scraped: number;
  geminiUsed: number;
  visionUsed: number;
  interactUsed: number;
  /** UNKNOWN (or noise) products whose source_url matched a curated SKU seed. */
  seedMatched: number;
  /** Deep scrapes forced for seed-matched UNKNOWN rows. */
  seedForcedScrapes: number;
  skipped: number;
  errors: number;
  sample: Array<{
    itemId: string;
    ingredientCount: number;
    confidence: number;
  }>;
}

/** Normalize product URLs for seed matching (host, path, no trailing slash). */
export function normalizeProductUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    u.search = "";
    let host = u.hostname.toLowerCase().replace(/^www\./, "");
    let path = u.pathname.replace(/\/+$/, "") || "";
    path = path.toLowerCase();
    return `${host}${path}`;
  } catch {
    return raw.trim().toLowerCase().replace(/\/+$/, "").replace(/^https?:\/\//, "").replace(/^www\./, "");
  }
}

function buildSeedUrlIndex(): {
  byNorm: Map<string, { url: string; productHint: string; brandHint: string }>;
} {
  const byNorm = new Map<
    string,
    { url: string; productHint: string; brandHint: string }
  >();
  for (const s of COMPETITIVE_SKU_SEEDS) {
    const n = normalizeProductUrl(s.url);
    if (!byNorm.has(n)) {
      byNorm.set(n, {
        url: s.url,
        productHint: s.productHint,
        brandHint: s.brandHint,
      });
    }
  }
  return { byNorm };
}

function matchSeed(
  sourceUrls: string[],
  byNorm: Map<string, { url: string; productHint: string; brandHint: string }>
): { url: string; productHint: string; brandHint: string } | null {
  for (const u of sourceUrls) {
    const hit = byNorm.get(normalizeProductUrl(u));
    if (hit) return hit;
  }
  return null;
}

function isUnknownRows(rows: unknown): boolean {
  if (!Array.isArray(rows)) return true;
  return hasUnknownOnlyIngredients(rows as CompetitiveIngredientRow[]);
}

/** Prior pass may have accepted packaging noise; treat as not-yet-enriched. */
function isLowQualityRows(rows: unknown): boolean {
  if (!Array.isArray(rows) || rows.length === 0) return true;
  const list = rows as CompetitiveIngredientRow[];
  if (hasUnknownOnlyIngredients(list)) return true;
  const bad = list.filter((r) => {
    const n = String(r.ingredient_name ?? "");
    return (
      /net\s*wt|fl\.?\s*oz|calories?|softgels?\s*per\s*serving|per serving|teaspoons?|tablespoons?|approx|providing approximately|professional groups|salmon is|level teaspoon|ultimate omega|recommended daily|daily intake|serv\.?\s*size|provides?\s|add\s+l-|!\[|\]\(|also available|travel[- ]friendly|supercharged|brain function|by adding|double strength|mega vitamin|iu\)|customers also|you may also|related products|member price/i.test(
        n
      ) ||
      (r.dose_unit === "mL" &&
        (/oz|net|bottle|wt|serv|available|friendly|travel/i.test(n) ||
          /^serv/i.test(n.trim()) ||
          n.split(/\s+/).length <= 4)) ||
      // Serving-size lines mistaken for ingredients
      /^\d/.test(n.trim()) ||
      /^[a-z]{1,3}\s/i.test(n.trim()) ||
      // OCR fragments / dangling punctuation names
      /^[A-Za-z]{1,4}\)/.test(n.trim()) ||
      // Implausible single-nutrient mega doses often from cross-sell scrape
      (r.dose_amount != null &&
        r.dose_amount >= 10000 &&
        /k2|vitamin\s*k/i.test(n) &&
        r.dose_unit === "mcg") ||
      // Product marketing titles / long prose used as "ingredient"
      (n.length > 35 &&
        r.dose_amount != null &&
        !/\b(vitamin|magnesium|calcium|omega|curcumin|folate|zinc|iron|epa|dha|methyl|arginine|bioflavonoid|glutathione|ascorbate|bisglycinate|threonate)\b/i.test(
          n
        ))
    );
  });
  // Re-enrich if any packaging/prose noise remains
  return bad.length > 0;
}

export async function enrichCompetitiveProducts(
  limit = 15,
  opts?: {
    allowScrape?: boolean;
    /**
     * Prefer curated COMPETITIVE_SKU_SEEDS URLs that are still UNKNOWN and
     * force deep re-scrape (interact + vision). Default true.
     */
    preferSeedUnknown?: boolean;
    /** Max deep scrapes this run (seed-matched get first claim). */
    maxScrapes?: number;
  }
): Promise<EnrichCompetitiveResult> {
  const allowScrape = opts?.allowScrape !== false;
  const preferSeedUnknown = opts?.preferSeedUnknown !== false;
  const maxScrapes = opts?.maxScrapes ?? 10;
  const stats: EnrichCompetitiveResult = {
    considered: 0,
    enriched: 0,
    stillUnknown: 0,
    scraped: 0,
    geminiUsed: 0,
    visionUsed: 0,
    interactUsed: 0,
    seedMatched: 0,
    seedForcedScrapes: 0,
    skipped: 0,
    errors: 0,
    sample: [],
  };

  const sb = createAdminClient();
  const { data: coll } = await sb
    .from("kb_collections")
    .select("id")
    .eq("slug", "competitive_supplements")
    .maybeSingle();
  if (!coll?.id) return stats;

  const { byNorm: seedByNorm } = buildSeedUrlIndex();

  // Pull a wide window so seed-matched UNKNOWN is not starved by recent updates
  const { data: items, error } = await sb
    .from("kb_items")
    .select("id, title, source_urls, extraction_confidence, updated_at")
    .eq("primary_collection_id", coll.id)
    .eq("payload_type", "product")
    .in("gate_status", ["approved", "lex_approved"])
    .eq("jeffery_verdict", "approved")
    .order("updated_at", { ascending: true }) // oldest first; seeds re-ranked below
    .limit(Math.max(limit * 12, 200));

  if (error || !items?.length) {
    if (error) {
      safeLog.warn("kb.enrichCompetitive", "list failed", {
        error: error.message,
      });
    }
    return stats;
  }

  // Priority:
  //  0 = UNKNOWN (or noise) on curated seed URL → force re-scrape first
  //  1 = low-quality noise (refilter cheap)
  //  2 = UNKNOWN non-seed
  //  3 = already good
  const ranked: Array<{
    item: (typeof items)[0];
    product: Record<string, unknown>;
    priority: number;
    seed: { url: string; productHint: string; brandHint: string } | null;
  }> = [];
  for (const item of items) {
    const itemId = String((item as { id: string }).id);
    const urls = Array.isArray((item as { source_urls?: string[] }).source_urls)
      ? ((item as { source_urls: string[] }).source_urls as string[])
      : [];
    const seed = preferSeedUnknown ? matchSeed(urls, seedByNorm) : null;
    const { data: product } = await sb
      .from("kb_products")
      .select(
        "item_id, ingredient_rows, serving_size, servings_per_container, list_price, label_claims, delivery_technology"
      )
      .eq("item_id", itemId)
      .maybeSingle();
    if (!product) continue;
    const rows = product.ingredient_rows;
    const unknown = isUnknownRows(rows);
    const noisy = isLowQualityRows(rows) && !unknown;
    let priority = 3;
    if (preferSeedUnknown && seed && (unknown || noisy)) {
      priority = 0; // seed UNKNOWN / noise first — force scrape
    } else if (noisy) {
      priority = 1;
    } else if (unknown) {
      priority = 2;
    } else {
      priority = 3;
    }
    ranked.push({
      item,
      product: product as Record<string, unknown>,
      priority,
      seed,
    });
  }
  ranked.sort((a, b) => a.priority - b.priority);

  const budget = defaultBudget();
  // Seed force-rescrape burns more pages; allow a bit more headroom
  budget.maxPages = Math.min(budget.maxPages, preferSeedUnknown ? 16 : 12);

  for (const { item, product, seed } of ranked) {
    if (stats.enriched + stats.stillUnknown + stats.errors >= limit) break;
    stats.considered += 1;
    const itemId = String((item as { id: string }).id);
    let title = String((item as { title?: string }).title ?? "");
    const urls = Array.isArray((item as { source_urls?: string[] }).source_urls)
      ? ((item as { source_urls: string[] }).source_urls as string[])
      : [];
    // Prefer seed canonical URL (stable PDP) over whatever was stored first
    const url = seed?.url || urls[0] || "";
    const isSeedMatch = Boolean(seed);
    if (isSeedMatch) stats.seedMatched += 1;
    // Seed productHint + URL dose for title_dose when page markdown is thin
    if (seed?.productHint) {
      title =
        augmentProductHintWithUrlDose(seed.url, seed.productHint) || title;
    }

    const alreadyKnown =
      !isUnknownRows(product.ingredient_rows) &&
      !isLowQualityRows(product.ingredient_rows);
    const hasPrice =
      typeof product.list_price === "number" && product.list_price > 0;
    if (alreadyKnown && hasPrice) {
      stats.skipped += 1;
      continue;
    }

    // Cheap path: re-filter noisy rows through latest parser (no scrape).
    // Seed-matched UNKNOWN/noise falls through to force deep scrape instead.
    if (
      Array.isArray(product.ingredient_rows) &&
      isLowQualityRows(product.ingredient_rows) &&
      !isUnknownRows(product.ingredient_rows) &&
      !isSeedMatch
    ) {
      const rebuilt: CompetitiveIngredientRow[] = [];
      for (const row of product.ingredient_rows as CompetitiveIngredientRow[]) {
        const line = `${row.ingredient_name ?? ""} ${row.dose_amount ?? ""} ${row.dose_unit ?? ""}`.trim();
        // Direct line parse rejects Serv.Size / cart chrome
        const { parseIngredientLine } = await import("./parseCompetitiveLabel");
        const one = parseIngredientLine(line);
        if (one && one.ingredient_name !== "UNKNOWN" && one.dose_amount != null) {
          rebuilt.push(one);
          continue;
        }
        const parsed = parseCompetitiveLabelText(line, { title });
        for (const r of parsed.ingredient_rows) {
          if (r.ingredient_name !== "UNKNOWN" && r.dose_amount != null) {
            rebuilt.push(r);
          }
        }
      }
      // Dedupe by name+dose
      const seen = new Set<string>();
      const unique = rebuilt.filter((r) => {
        const k = `${r.ingredient_name}|${r.dose_amount}|${r.dose_unit}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      if (unique.length > 0 && !isLowQualityRows(unique)) {
        const shell = parseCompetitiveLabelText("", { title });
        await applyProductFacts(sb, itemId, {
          ...shell,
          ingredient_rows: unique,
          serving_size:
            (product.serving_size as string | null) ?? shell.serving_size,
          servings_per_container:
            (product.servings_per_container as number | null) ??
            shell.servings_per_container,
          list_price: (product.list_price as number | null) ?? shell.list_price,
          label_claims: Array.isArray(product.label_claims)
            ? (product.label_claims as string[])
            : shell.label_claims,
          extraction_confidence: 80,
          parse_notes: ["refilter_existing_rows"],
        });
        stats.enriched += 1;
        stats.sample.push({
          itemId,
          ingredientCount: unique.length,
          confidence: 80,
        });
        continue;
      }
      // Pure noise or still-low-quality: clear to honest UNKNOWN (no scrape)
      // Non-seed only — seed matches force scrape below
      if (unique.length === 0 || isLowQualityRows(unique)) {
        const shell = parseCompetitiveLabelText("", { title });
        await applyProductFacts(sb, itemId, {
          ...shell,
          ingredient_rows: [
            {
              ingredient_name: "UNKNOWN",
              canonical_ingredient_id: null,
              dose_amount: null,
              dose_unit: null,
              form: null,
              dose_confidence: 0,
              note: "Cleared packaging/serving-size noise",
            },
          ],
          extraction_confidence: 45,
          parse_notes: ["cleared_noise_rows"],
        });
        stats.stillUnknown += 1;
        continue;
      }
    }

    // Prefer staging full_text for this URL (try seed URL + stored URLs)
    let text = "";
    let appliedFromStaging = false;
    const stagingUrls = Array.from(new Set([url, ...urls].filter(Boolean)));
    for (const stagingUrl of stagingUrls) {
      const { data: staged } = await sb
        .from("hounddog_staging_items")
        .select("full_text_excerpt, summary, title, raw_payload")
        .eq("source_url", stagingUrl)
        .maybeSingle();
      if (!staged) continue;
      const excerpt = String(
        (staged as { full_text_excerpt?: string }).full_text_excerpt ||
          (staged as { summary?: string }).summary ||
          ""
      );
      if (excerpt.length > text.length) text = excerpt;
      const payload = (staged as { raw_payload?: Record<string, unknown> })
        .raw_payload;
      // Apply good staging ingredients when present (seed or not).
      // Stale UNKNOWN staging is ignored → falls through to force re-scrape.
      if (
        payload &&
        Array.isArray(payload.ingredient_rows) &&
        !isUnknownRows(payload.ingredient_rows) &&
        !isLowQualityRows(payload.ingredient_rows)
      ) {
        const pre = parseCompetitiveLabelText(text || title, { title });
        const rows = payload.ingredient_rows as CompetitiveIngredientRow[];
        const factsFromStage = {
          ...pre,
          ingredient_rows: rows,
          extraction_confidence: Math.max(pre.extraction_confidence, 78),
        };
        await applyProductFacts(sb, itemId, factsFromStage);
        stats.enriched += 1;
        stats.sample.push({
          itemId,
          ingredientCount: rows.filter((r) => r.ingredient_name !== "UNKNOWN")
            .length,
          confidence: factsFromStage.extraction_confidence,
        });
        appliedFromStaging = true;
        break;
      }
    }
    if (appliedFromStaging) continue;

    // Deep path: interact tabs + Gemini text + vision OCR
    // Seed-matched UNKNOWN always force-scrapes when budget remains.
    let facts = parseCompetitiveLabelText(text || title, { title });
    const needsDeep =
      hasUnknownOnlyIngredients(facts.ingredient_rows) ||
      isLowQualityRows(facts.ingredient_rows) ||
      (isSeedMatch && isUnknownRows(product.ingredient_rows));
    const canScrape =
      allowScrape &&
      url &&
      needsDeep &&
      !budget.hitBudget &&
      stats.scraped < maxScrapes;

    if (canScrape) {
      try {
        if (isSeedMatch) stats.seedForcedScrapes += 1;
        const deep = await deepExtractCompetitiveLabel({
          url,
          title,
          // Seed force path: ignore thin/stale markdown so interact+vision run
          existingMarkdown: isSeedMatch ? "" : text,
          budget,
          allowInteract: true,
          allowVision: stats.visionUsed < (isSeedMatch ? 10 : 8),
        });
        stats.scraped += deep.scraped ? 1 : 0;
        if (deep.interacted) stats.interactUsed += 1;
        if (deep.path === "gemini_text") stats.geminiUsed += 1;
        if (deep.visionUsed) stats.visionUsed += 1;
        facts = deep.facts;
        if (deep.markdown) text = deep.markdown;

        const { data: prior } = await sb
          .from("hounddog_staging_items")
          .select("raw_payload")
          .eq("source_url", url)
          .maybeSingle();
        const priorPayload =
          prior?.raw_payload && typeof prior.raw_payload === "object"
            ? (prior.raw_payload as Record<string, unknown>)
            : {};
        await sb
          .from("hounddog_staging_items")
          .update({
            full_text_excerpt: (text || "").slice(0, 4000),
            raw_payload: {
              ...priorPayload,
              deep_path: deep.path,
              ingredient_rows: facts.ingredient_rows,
              serving_size: facts.serving_size,
              list_price: facts.list_price,
              extraction_confidence: facts.extraction_confidence,
              parse_notes: facts.parse_notes,
              seed_forced: isSeedMatch,
              handler_version: "221.phase2.c1deep.2",
            },
          })
          .eq("source_url", url);
      } catch (err) {
        safeLog.warn("kb.enrichCompetitive", "deep extract threw", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (!text.trim() && hasUnknownOnlyIngredients(facts.ingredient_rows)) {
      // Last resort: title_dose from seed productHint (already in title)
      const titleOnly = parseCompetitiveLabelText("", { title });
      if (!hasUnknownOnlyIngredients(titleOnly.ingredient_rows)) {
        facts = {
          ...titleOnly,
          parse_notes: ["seed_title_dose", ...titleOnly.parse_notes],
        };
      } else {
        stats.stillUnknown += 1;
        continue;
      }
    }

    try {
      if (hasUnknownOnlyIngredients(facts.ingredient_rows) && alreadyKnown) {
        stats.skipped += 1;
        continue;
      }
      if (hasUnknownOnlyIngredients(facts.ingredient_rows)) {
        stats.stillUnknown += 1;
        await applyProductFacts(sb, itemId, {
          ...facts,
          ingredient_rows: [
            {
              ingredient_name: "UNKNOWN",
              canonical_ingredient_id: null,
              dose_amount: null,
              dose_unit: null,
              form: null,
              dose_confidence: 0,
              note: isSeedMatch
                ? "Seed force re-scrape: no parseable dose lines"
                : "No parseable Supplement Facts dose lines after scrape",
            },
          ],
          extraction_confidence: Math.min(facts.extraction_confidence, 50),
        });
        continue;
      }

      await applyProductFacts(sb, itemId, facts);
      stats.enriched += 1;
      stats.sample.push({
        itemId,
        ingredientCount: facts.ingredient_rows.filter(
          (r) => r.ingredient_name !== "UNKNOWN"
        ).length,
        confidence: facts.extraction_confidence,
      });
    } catch (err) {
      stats.errors += 1;
      safeLog.warn("kb.enrichCompetitive", "apply threw", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return stats;
}

async function applyProductFacts(
  sb: ReturnType<typeof createAdminClient>,
  itemId: string,
  facts: ReturnType<typeof parseCompetitiveLabelText>,
  opts?: { onlyShell?: boolean }
): Promise<void> {
  const patch: Record<string, unknown> = {
    serving_size: facts.serving_size,
    servings_per_container: facts.servings_per_container,
    list_price: facts.list_price,
    currency: facts.currency,
    price_per_serving: facts.price_per_serving,
    label_claims: facts.label_claims,
    availability_note: facts.availability_note,
  };
  if (facts.delivery_technology) {
    patch.delivery_technology = facts.delivery_technology;
  }
  if (!opts?.onlyShell) {
    patch.ingredient_rows = facts.ingredient_rows;
  }

  const { error } = await sb
    .from("kb_products")
    .update(patch)
    .eq("item_id", itemId);
  if (error) {
    throw new Error(error.message);
  }

  await sb
    .from("kb_items")
    .update({
      extraction_confidence: facts.extraction_confidence,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);
}
