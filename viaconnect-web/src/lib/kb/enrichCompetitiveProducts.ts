/**
 * Prompt 221 Phase 2 C1: re-parse staged full_text (or re-scrape) and fill
 * kb_products ingredient_rows / price / serving facts when still UNKNOWN.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import {
  defaultBudget,
  firecrawlScrape,
} from "@/lib/hounddog/firecrawl/client";
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
  skipped: number;
  errors: number;
  sample: Array<{
    itemId: string;
    ingredientCount: number;
    confidence: number;
  }>;
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
      /net\s*wt|fl\.?\s*oz|calories?|softgels?\s+per\s+serving/i.test(n) ||
      (r.dose_unit === "mL" && /oz|net|bottle|wt/i.test(n))
    );
  });
  // All rows bad, or majority packaging noise
  return bad.length > 0 && bad.length >= Math.ceil(list.length / 2);
}

export async function enrichCompetitiveProducts(
  limit = 15,
  opts?: { allowScrape?: boolean }
): Promise<EnrichCompetitiveResult> {
  const allowScrape = opts?.allowScrape !== false;
  const stats: EnrichCompetitiveResult = {
    considered: 0,
    enriched: 0,
    stillUnknown: 0,
    scraped: 0,
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

  const { data: items, error } = await sb
    .from("kb_items")
    .select("id, title, source_urls, extraction_confidence")
    .eq("primary_collection_id", coll.id)
    .eq("payload_type", "product")
    .in("gate_status", ["approved", "lex_approved"])
    .eq("jeffery_verdict", "approved")
    .order("updated_at", { ascending: true })
    .limit(limit * 2);

  if (error || !items?.length) {
    if (error) {
      safeLog.warn("kb.enrichCompetitive", "list failed", {
        error: error.message,
      });
    }
    return stats;
  }

  const budget = defaultBudget();
  budget.maxPages = Math.min(budget.maxPages, 12);

  for (const item of items) {
    if (stats.enriched + stats.stillUnknown + stats.errors >= limit) break;
    stats.considered += 1;
    const itemId = String((item as { id: string }).id);
    const title = String((item as { title?: string }).title ?? "");
    const urls = Array.isArray((item as { source_urls?: string[] }).source_urls)
      ? ((item as { source_urls: string[] }).source_urls as string[])
      : [];
    const url = urls[0] ?? "";

    const { data: product } = await sb
      .from("kb_products")
      .select(
        "item_id, ingredient_rows, serving_size, servings_per_container, list_price, label_claims, delivery_technology"
      )
      .eq("item_id", itemId)
      .maybeSingle();

    if (!product) {
      stats.skipped += 1;
      continue;
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

    // Prefer staging full_text for this URL
    let text = "";
    if (url) {
      const { data: staged } = await sb
        .from("hounddog_staging_items")
        .select("full_text_excerpt, summary, title, raw_payload")
        .eq("source_url", url)
        .maybeSingle();
      if (staged) {
        text = String(
          (staged as { full_text_excerpt?: string }).full_text_excerpt ||
            (staged as { summary?: string }).summary ||
            ""
        );
        const payload = (staged as { raw_payload?: Record<string, unknown> })
          .raw_payload;
        if (
          payload &&
          Array.isArray(payload.ingredient_rows) &&
          !isUnknownRows(payload.ingredient_rows)
        ) {
          const pre = parseCompetitiveLabelText(text, { title });
          const rows = payload.ingredient_rows as CompetitiveIngredientRow[];
          const facts = {
            ...pre,
            ingredient_rows: rows,
            extraction_confidence: Math.max(pre.extraction_confidence, 78),
          };
          await applyProductFacts(sb, itemId, facts);
          stats.enriched += 1;
          stats.sample.push({
            itemId,
            ingredientCount: rows.filter((r) => r.ingredient_name !== "UNKNOWN")
              .length,
            confidence: facts.extraction_confidence,
          });
          continue;
        }
      }
    }

    // First pass on whatever text we have
    let facts = parseCompetitiveLabelText(text || title, { title });

    // Re-scrape when still UNKNOWN (old staging was marketing-only, <400 was too strict)
    if (
      allowScrape &&
      url &&
      hasUnknownOnlyIngredients(facts.ingredient_rows) &&
      !budget.hitBudget &&
      stats.scraped < 10
    ) {
      try {
        const scrape = await firecrawlScrape(url, budget);
        if (scrape.ok && scrape.markdown) {
          text = scrape.markdown.slice(0, 8000);
          stats.scraped += 1;
          facts = parseCompetitiveLabelText(text, { title });
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
              full_text_excerpt: text.slice(0, 4000),
              raw_payload: {
                ...priorPayload,
                re_scraped_for_label: true,
                ingredient_rows: facts.ingredient_rows,
                serving_size: facts.serving_size,
                list_price: facts.list_price,
                extraction_confidence: facts.extraction_confidence,
                parse_notes: facts.parse_notes,
                handler_version: "221.phase2.c1e.2",
              },
            })
            .eq("source_url", url);
        }
      } catch (err) {
        safeLog.warn("kb.enrichCompetitive", "scrape threw", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (!text.trim() && hasUnknownOnlyIngredients(facts.ingredient_rows)) {
      stats.stillUnknown += 1;
      continue;
    }

    try {
      if (hasUnknownOnlyIngredients(facts.ingredient_rows) && alreadyKnown) {
        stats.skipped += 1;
        continue;
      }
      if (hasUnknownOnlyIngredients(facts.ingredient_rows)) {
        stats.stillUnknown += 1;
        // Clear packaging-noise rows so coverage reflects honest UNKNOWN
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
              note: "No parseable Supplement Facts dose lines after scrape",
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
