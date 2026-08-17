/**
 * Prompt 221 Phase 2 C1: re-parse staged full_text (or re-scrape) and fill
 * kb_products ingredient_rows / price / serving facts when still UNKNOWN.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import { defaultBudget } from "@/lib/hounddog/firecrawl/client";
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
      /net\s*wt|fl\.?\s*oz|calories?|softgels?\s*per\s*serving|per serving|teaspoons?|tablespoons?|approx|providing approximately|professional groups|salmon is|level teaspoon|ultimate omega|recommended daily|daily intake|serv\.?\s*size|provides?\s|add\s+l-|!\[|\]\(/i.test(
        n
      ) ||
      (r.dose_unit === "mL" &&
        (/oz|net|bottle|wt|serv/i.test(n) ||
          /^serv/i.test(n.trim()) ||
          n.split(/\s+/).length <= 3)) ||
      // Serving-size lines mistaken for ingredients
      /^\d/.test(n.trim()) ||
      /^[a-z]\s/i.test(n.trim()) ||
      // Product marketing titles used as the only "ingredient"
      (n.length > 40 &&
        r.dose_amount != null &&
        !/\b(vitamin|magnesium|calcium|omega|curcumin|folate|zinc|iron|epa|dha|methyl|arginine|bioflavonoid)\b/i.test(
          n
        ))
    );
  });
  // Re-enrich if any packaging/prose noise remains
  return bad.length > 0;
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
    geminiUsed: 0,
    visionUsed: 0,
    interactUsed: 0,
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
    .select("id, title, source_urls, extraction_confidence, updated_at")
    .eq("primary_collection_id", coll.id)
    .eq("payload_type", "product")
    .in("gate_status", ["approved", "lex_approved"])
    .eq("jeffery_verdict", "approved")
    .order("updated_at", { ascending: false })
    .limit(Math.max(limit * 4, 40));

  if (error || !items?.length) {
    if (error) {
      safeLog.warn("kb.enrichCompetitive", "list failed", {
        error: error.message,
      });
    }
    return stats;
  }

  // Load product rows and prioritize: low-quality noise first, then UNKNOWN
  const ranked: Array<{
    item: (typeof items)[0];
    product: Record<string, unknown>;
    priority: number;
  }> = [];
  for (const item of items) {
    const itemId = String((item as { id: string }).id);
    const { data: product } = await sb
      .from("kb_products")
      .select(
        "item_id, ingredient_rows, serving_size, servings_per_container, list_price, label_claims, delivery_technology"
      )
      .eq("item_id", itemId)
      .maybeSingle();
    if (!product) continue;
    const rows = product.ingredient_rows;
    let priority = 3;
    if (isLowQualityRows(rows) && !isUnknownRows(rows)) priority = 0; // noise first
    else if (isUnknownRows(rows)) priority = 1;
    else priority = 2; // already good
    ranked.push({ item, product: product as Record<string, unknown>, priority });
  }
  ranked.sort((a, b) => a.priority - b.priority);

  const budget = defaultBudget();
  budget.maxPages = Math.min(budget.maxPages, 12);

  for (const { item, product } of ranked) {
    if (stats.enriched + stats.stillUnknown + stats.errors >= limit) break;
    stats.considered += 1;
    const itemId = String((item as { id: string }).id);
    const title = String((item as { title?: string }).title ?? "");
    const urls = Array.isArray((item as { source_urls?: string[] }).source_urls)
      ? ((item as { source_urls: string[] }).source_urls as string[])
      : [];
    const url = urls[0] ?? "";

    const alreadyKnown =
      !isUnknownRows(product.ingredient_rows) &&
      !isLowQualityRows(product.ingredient_rows);
    const hasPrice =
      typeof product.list_price === "number" && product.list_price > 0;
    if (alreadyKnown && hasPrice) {
      stats.skipped += 1;
      continue;
    }

    // Cheap path: re-filter existing rows through latest parser (no scrape)
    if (
      Array.isArray(product.ingredient_rows) &&
      isLowQualityRows(product.ingredient_rows) &&
      !isUnknownRows(product.ingredient_rows)
    ) {
      const rebuilt: CompetitiveIngredientRow[] = [];
      for (const row of product.ingredient_rows as CompetitiveIngredientRow[]) {
        const line = `${row.ingredient_name ?? ""} ${row.dose_amount ?? ""} ${row.dose_unit ?? ""}`.trim();
        const parsed = parseCompetitiveLabelText(line, { title });
        for (const r of parsed.ingredient_rows) {
          if (r.ingredient_name !== "UNKNOWN" && r.dose_amount != null) {
            rebuilt.push(r);
          }
        }
      }
      if (rebuilt.length > 0 && !isLowQualityRows(rebuilt)) {
        const shell = parseCompetitiveLabelText("", { title });
        await applyProductFacts(sb, itemId, {
          ...shell,
          ingredient_rows: rebuilt,
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
          ingredientCount: rebuilt.length,
          confidence: 80,
        });
        continue;
      }
      // Pure noise only: clear to honest UNKNOWN without burning scrape budget
      if (rebuilt.length === 0) {
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
          !isUnknownRows(payload.ingredient_rows) &&
          !isLowQualityRows(payload.ingredient_rows)
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

    // Deep path: interact tabs + Gemini text + vision OCR
    let facts = parseCompetitiveLabelText(text || title, { title });
    if (
      allowScrape &&
      url &&
      (hasUnknownOnlyIngredients(facts.ingredient_rows) ||
        isLowQualityRows(facts.ingredient_rows)) &&
      !budget.hitBudget &&
      stats.scraped < 8
    ) {
      try {
        const deep = await deepExtractCompetitiveLabel({
          url,
          title,
          existingMarkdown: text,
          budget,
          allowInteract: true,
          allowVision: stats.visionUsed < 5,
        });
        stats.scraped += deep.scraped ? 1 : 0;
        if (deep.interacted) stats.interactUsed += 1;
        if (deep.path === "gemini_text") stats.geminiUsed += 1;
        if (deep.path.startsWith("vision")) stats.visionUsed += 1;
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
              handler_version: "221.phase2.c1deep.1",
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
