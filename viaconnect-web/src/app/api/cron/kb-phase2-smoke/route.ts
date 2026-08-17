/**
 * Prompt 221 Phase 2: allowlist + C1 ingredient coverage smoke (Bearer CRON_SECRET).
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadApprovedCompetitiveSources } from "@/lib/kb/competitiveAllowlist";
import { hasUnknownOnlyIngredients } from "@/lib/kb/parseCompetitiveLabel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const sources = await loadApprovedCompetitiveSources();
  const byKind: Record<string, number> = {};
  for (const s of sources) {
    byKind[s.source_kind] = (byKind[s.source_kind] ?? 0) + 1;
  }

  const { data: collections } = await admin
    .from("kb_collections")
    .select("slug, status, seeding_phase")
    .in("slug", ["competitive_supplements", "genetic_tests"]);

  const { data: coll } = await admin
    .from("kb_collections")
    .select("id")
    .eq("slug", "competitive_supplements")
    .maybeSingle();

  const { count: competitiveItems } = await admin
    .from("kb_items")
    .select("id", { count: "exact", head: true })
    .eq("payload_type", "product")
    .eq("jeffery_verdict", "approved");

  const { count: geneticItems } = await admin
    .from("kb_items")
    .select("id", { count: "exact", head: true })
    .eq("payload_type", "genetic_test")
    .eq("jeffery_verdict", "approved");

  const { count: stagedCompetitive } = await admin
    .from("hounddog_staging_items")
    .select("id", { count: "exact", head: true })
    .eq("source_type", "competitive_product");

  const { count: stagedGenetic } = await admin
    .from("hounddog_staging_items")
    .select("id", { count: "exact", head: true })
    .eq("source_type", "genetic_test");

  // C1 ingredient coverage sample
  let productsWithIngredients = 0;
  let productsUnknownOnly = 0;
  let sampleIngredients: Array<{
    brand: string;
    product_name: string;
    ingredientCount: number;
    sample: string[];
  }> = [];

  if (coll?.id) {
    const { data: prods } = await admin
      .from("kb_products")
      .select("brand, product_name, ingredient_rows, list_price, serving_size")
      .eq("is_via_cura", false)
      .limit(80);

    for (const p of prods ?? []) {
      const rows = Array.isArray(p.ingredient_rows) ? p.ingredient_rows : [];
      if (hasUnknownOnlyIngredients(rows as never)) {
        productsUnknownOnly += 1;
      } else {
        productsWithIngredients += 1;
        if (sampleIngredients.length < 5) {
          const names = (rows as Array<{ ingredient_name?: string; dose_amount?: number; dose_unit?: string }>)
            .filter((r) => r.ingredient_name && r.ingredient_name !== "UNKNOWN")
            .slice(0, 4)
            .map(
              (r) =>
                `${r.ingredient_name}${r.dose_amount != null ? ` ${r.dose_amount}${r.dose_unit ?? ""}` : ""}`
            );
          sampleIngredients.push({
            brand: String(p.brand ?? ""),
            product_name: String(p.product_name ?? "").slice(0, 80),
            ingredientCount: names.length,
            sample: names,
          });
        }
      }
    }
  }

  const allowlistOk = sources.length >= 20;
  const coverage =
    productsWithIngredients + productsUnknownOnly > 0
      ? productsWithIngredients /
        (productsWithIngredients + productsUnknownOnly)
      : 0;

  return Response.json({
    ok: allowlistOk,
    allowlistCount: sources.length,
    byKind,
    sampleDomains: sources.slice(0, 8).map((s) => s.domain),
    phase2Collections: collections ?? [],
    competitiveItemsApproved: competitiveItems ?? 0,
    geneticItemsApproved: geneticItems ?? 0,
    stagedCompetitive: stagedCompetitive ?? 0,
    stagedGenetic: stagedGenetic ?? 0,
    c1IngredientCoverage: {
      withIngredients: productsWithIngredients,
      unknownOnly: productsUnknownOnly,
      coveragePct: Math.round(coverage * 1000) / 10,
      samples: sampleIngredients,
    },
  });
}
