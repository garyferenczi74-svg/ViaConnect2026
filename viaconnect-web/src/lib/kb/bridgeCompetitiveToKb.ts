/**
 * Prompt 221 Phase 2 C1: bridge competitive staging/gated rows into kb_items + kb_products.
 * Grade E (competitive awareness). Facts-only product shell; label parser fills ingredients.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import { contentHashFromParts } from "./contentHash";
import {
  hasUnknownOnlyIngredients,
  parseCompetitiveLabelText,
  type CompetitiveIngredientRow,
} from "./parseCompetitiveLabel";
import { promoteThenJefferyReview } from "./promotePipeline";

export interface CompetitiveBridgeResult {
  considered: number;
  inserted: number;
  promoted: number;
  jefferyApproved: number;
  skipped: number;
  errors: number;
  sampleItemIds: string[];
  withIngredients: number;
  unknownOnly: number;
}

export async function bridgeCompetitiveToKb(
  limit = 12
): Promise<CompetitiveBridgeResult> {
  const stats: CompetitiveBridgeResult = {
    considered: 0,
    inserted: 0,
    promoted: 0,
    jefferyApproved: 0,
    skipped: 0,
    errors: 0,
    sampleItemIds: [],
    withIngredients: 0,
    unknownOnly: 0,
  };

  const sb = createAdminClient();
  const { data: coll } = await sb
    .from("kb_collections")
    .select("id")
    .eq("slug", "competitive_supplements")
    .maybeSingle();

  if (!coll?.id) {
    safeLog.warn("kb.competitiveBridge", "competitive_supplements missing");
    return stats;
  }
  const collectionId = String(coll.id);

  // Prefer Marshall-approved gated rows; fall back to approved staging
  const { data: gated } = await sb
    .from("hounddog_gated_items")
    .select("id, staging_id, source_url, source_type, title, summary")
    .eq("source_type", "competitive_product")
    .order("created_at", { ascending: false })
    .limit(limit * 2);

  let rows: Array<{
    id: string;
    staging_id?: string;
    source_url: string;
    title: string;
    summary: string;
    brand?: string;
    category?: string;
    full_text?: string;
    payload?: Record<string, unknown>;
  }> = [];

  if (gated?.length) {
    for (const g of gated) {
      const { data: st } = await sb
        .from("hounddog_staging_items")
        .select("raw_payload, full_text_excerpt, summary")
        .eq("id", (g as { staging_id?: string }).staging_id ?? "")
        .maybeSingle();
      const payload =
        st?.raw_payload && typeof st.raw_payload === "object"
          ? (st.raw_payload as Record<string, unknown>)
          : {};
      rows.push({
        id: String((g as { id: string }).id),
        staging_id: (g as { staging_id?: string }).staging_id,
        source_url: String((g as { source_url: string }).source_url ?? ""),
        title: String((g as { title: string }).title ?? ""),
        summary: String((g as { summary: string }).summary ?? ""),
        brand: typeof payload.brand === "string" ? payload.brand : undefined,
        category:
          typeof payload.category === "string" ? payload.category : undefined,
        full_text: String(
          (st as { full_text_excerpt?: string } | null)?.full_text_excerpt ||
            (st as { summary?: string } | null)?.summary ||
            (g as { summary?: string }).summary ||
            ""
        ),
        payload,
      });
    }
  } else {
    const { data: staged } = await sb
      .from("hounddog_staging_items")
      .select(
        "id, source_url, title, summary, raw_payload, gate_status, full_text_excerpt"
      )
      .eq("source_type", "competitive_product")
      .in("gate_status", ["approved", "pending"])
      .order("retrieved_at", { ascending: false })
      .limit(limit * 2);
    for (const s of staged ?? []) {
      const payload =
        s.raw_payload && typeof s.raw_payload === "object"
          ? (s.raw_payload as Record<string, unknown>)
          : {};
      rows.push({
        id: String(s.id),
        source_url: String(s.source_url ?? ""),
        title: String(s.title ?? ""),
        summary: String(s.summary ?? ""),
        brand: typeof payload.brand === "string" ? payload.brand : undefined,
        category:
          typeof payload.category === "string" ? payload.category : undefined,
        full_text: String(
          (s as { full_text_excerpt?: string }).full_text_excerpt ||
            s.summary ||
            ""
        ),
        payload,
      });
    }
  }

  for (const row of rows) {
    if (stats.inserted + stats.skipped + stats.errors >= limit) break;
    stats.considered += 1;
    const url = row.source_url;
    const title = row.title.trim();
    const summary = (row.summary || "").trim() || "UNKNOWN";
    if (!title || !url) {
      stats.skipped += 1;
      continue;
    }

    const hash = contentHashFromParts({
      source_url: url,
      title,
      summary: summary.slice(0, 400),
      kind: "competitive_product",
    });

    // Prefer hash match; also match by product URL so re-seeded facts update
    // the same catalog row even when title/summary (and thus hash) drifted.
    let existing: {
      id: string;
      gate_status?: string | null;
      jeffery_verdict?: string | null;
    } | null = null;
    const { data: byHash } = await sb
      .from("kb_items")
      .select("id, gate_status, jeffery_verdict")
      .eq("content_hash", hash)
      .maybeSingle();
    if (byHash?.id) {
      existing = byHash;
    } else {
      const { data: byUrl } = await sb
        .from("kb_items")
        .select("id, gate_status, jeffery_verdict")
        .eq("primary_collection_id", collectionId)
        .eq("payload_type", "product")
        .contains("source_urls", [url])
        .limit(1)
        .maybeSingle();
      if (byUrl?.id) existing = byUrl;
    }

    const labelText = row.full_text || summary;
    const fromPayload =
      row.payload && Array.isArray(row.payload.ingredient_rows)
        ? (row.payload.ingredient_rows as CompetitiveIngredientRow[])
        : null;
    const parsed = parseCompetitiveLabelText(labelText, { title });
    const ingredient_rows =
      fromPayload && !hasUnknownOnlyIngredients(fromPayload)
        ? fromPayload
        : parsed.ingredient_rows;
    const facts = {
      ...parsed,
      ingredient_rows,
      extraction_confidence:
        fromPayload && !hasUnknownOnlyIngredients(fromPayload)
          ? Math.max(parsed.extraction_confidence, 78)
          : parsed.extraction_confidence,
    };
    if (hasUnknownOnlyIngredients(ingredient_rows)) {
      stats.unknownOnly += 1;
    } else {
      stats.withIngredients += 1;
    }

    if (existing?.id) {
      // Refresh product facts on already-bridged rows when we now have ingredients
      if (!hasUnknownOnlyIngredients(ingredient_rows)) {
        await sb
          .from("kb_products")
          .update({
            ingredient_rows,
            serving_size: facts.serving_size,
            servings_per_container: facts.servings_per_container,
            list_price: facts.list_price,
            currency: facts.currency,
            price_per_serving: facts.price_per_serving,
            label_claims: facts.label_claims,
            delivery_technology: facts.delivery_technology,
            availability_note: facts.availability_note,
          })
          .eq("item_id", existing.id);
        await sb
          .from("kb_items")
          .update({
            extraction_confidence: facts.extraction_confidence,
            title: title.slice(0, 500),
            summary: summary.slice(0, 2000),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
      if (
        (existing.gate_status === "approved" ||
          existing.gate_status === "lex_approved") &&
        (existing.jeffery_verdict === "pending" || !existing.jeffery_verdict)
      ) {
        const r = await promoteThenJefferyReview({
          itemId: String(existing.id),
          targetStatus: "approved",
          gateReason: "competitive re-review pending Jeffery",
          producedByAgent: "hounddog",
        });
        if (r.jefferyVerdict === "approved") stats.jefferyApproved += 1;
      }
      stats.skipped += 1;
      continue;
    }

    const brand = (row.brand || "UNKNOWN").slice(0, 120);

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
          evidence_grade: "E",
          extraction_confidence: facts.extraction_confidence,
          gate_status: "pending",
          jeffery_verdict: "pending",
          provenance: {
            bridge: "competitive_phase2",
            staging_or_gated_id: row.id,
            handler_version: "221.phase2.c1e.1",
            brand,
            category: row.category ?? "UNKNOWN",
            parse_notes: facts.parse_notes,
          },
          payload_type: "product",
          practitioner_depth: false,
          consumer_safe: true,
        })
        .select("id")
        .maybeSingle();

      if (insErr || !inserted?.id) {
        stats.errors += 1;
        safeLog.warn("kb.competitiveBridge", "insert failed", {
          error: insErr?.message,
        });
        continue;
      }

      stats.inserted += 1;
      const itemId = String(inserted.id);
      stats.sampleItemIds.push(itemId);

      await sb.from("kb_products").upsert(
        {
          item_id: itemId,
          brand,
          product_name: title.slice(0, 300),
          category: row.category ?? null,
          ingredient_rows,
          serving_size: facts.serving_size,
          servings_per_container: facts.servings_per_container,
          list_price: facts.list_price,
          currency: facts.currency,
          price_per_serving: facts.price_per_serving,
          label_claims: facts.label_claims,
          delivery_technology: facts.delivery_technology,
          retailer_or_brand_page: url,
          availability_note: facts.availability_note ?? "UNKNOWN",
          is_via_cura: false,
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
        gateReason:
          "Phase 2 competitive bridge; facts-only grade E; Marshall gate on source",
        producedByAgent: "hounddog",
      });
      if (pr.promoteOk) stats.promoted += 1;
      if (pr.jefferyVerdict === "approved") stats.jefferyApproved += 1;
      if (pr.error) stats.errors += 1;
    } catch (err) {
      stats.errors += 1;
      safeLog.warn("kb.competitiveBridge", "threw", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return stats;
}
