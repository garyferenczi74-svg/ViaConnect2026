// =============================================================================
// POST /api/admin/brands/add  (Prompt #59)
// =============================================================================
// On-demand brand creation endpoint. Inserts a new row into
// supplement_brand_registry + brand_enrichment_state with status='pending'.
// The next brand-enricher cron tick (within 10 minutes) will pick it up and
// fetch real product data via the 4-source waterfall.
// =============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

interface AddBrandPayload {
  brand_name: string;
  tier: number;          // 1-5
  hq_country?: string;
  website_url?: string;
  key_categories?: string[];
  certifications?: string[];
  estimated_sku_count?: number;
  aliases?: string[];
}

const TIER_LABELS: Record<number, string> = {
  1: "Premium Practitioner",
  2: "Premium DTC",
  3: "Mass Market",
  4: "Specialty Herbal",
  5: "Canadian/International",
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function POST(req: Request) {
  try {
    let body: AddBrandPayload;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // validate
    if (!body.brand_name || typeof body.brand_name !== "string" || body.brand_name.trim().length < 2) {
      return NextResponse.json({ error: "brand_name required (min 2 chars)" }, { status: 400 });
    }
    if (!body.tier || ![1, 2, 3, 4, 5].includes(body.tier)) {
      return NextResponse.json({ error: "tier required (1-5)" }, { status: 400 });
    }

    const supabase = createClient();

    // auth: must be a signed-in user; admin gating happens in RLS or via
    // a separate role check the project may already enforce
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.brands.add.auth');
    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const brandName    = body.brand_name.trim();
    const normalized   = normalize(brandName);
    const tier         = body.tier;
    const tierLabel    = TIER_LABELS[tier];

    // duplicate check by normalized_name
    const existingRes = await withTimeout(
      (async () => supabase
        .from("supplement_brand_registry")
        .select("id, brand_name")
        .eq("normalized_name", normalized)
        .maybeSingle())(),
      8000,
      'api.brands.add.dupe-check',
    );
    const existing = existingRes.data as { id: string; brand_name: string } | null;

    if (existing) {
      return NextResponse.json(
        { error: `Brand already exists: ${existing.brand_name}`, brand_id: existing.id },
        { status: 409 }
      );
    }

    // insert registry row
    const insertRes = await withTimeout(
      (async () => supabase
        .from("supplement_brand_registry")
        .insert({
          brand_name:           brandName,
          normalized_name:      normalized,
          tier,
          tier_label:           tierLabel,
          hq_country:           body.hq_country ?? null,
          website_url:          body.website_url ?? null,
          key_categories:       body.key_categories ?? null,
          certifications:       body.certifications ?? null,
          estimated_sku_count:  body.estimated_sku_count ?? null,
          is_active:            true,
          verification_status:  "unverified",
          discovery_source:     "admin_add",
        })
        .select("id, brand_name, tier")
        .single())(),
      8000,
      'api.brands.add.insert-registry',
    );
    const brand = insertRes.data as { id: string; brand_name: string; tier: number } | null;

    if (insertRes.error || !brand) {
      return NextResponse.json({ error: insertRes.error?.message ?? "Insert failed" }, { status: 500 });
    }

    // insert enrichment_state row (pending)
    await withTimeout(
      (async () => supabase.from("brand_enrichment_state").insert({
        brand_id:           brand.id,
        brand_name:         brand.brand_name,
        tier:               brand.tier,
        enrichment_status:  "pending",
        seed_product_count: 0,
        enriched_product_count: 0,
        retry_count:        0,
      }))(),
      8000,
      'api.brands.add.insert-enrichment-state',
    );

    // insert aliases (optional)
    if (body.aliases && body.aliases.length > 0) {
      const aliasRows = body.aliases
        .filter(a => a && a.trim().length > 0)
        .map(a => ({
          brand_registry_id: brand.id,
          alias:             a.trim(),
          normalized_alias:  normalize(a),
          alias_type:        "common" as const,
        }));
      if (aliasRows.length > 0) {
        await withTimeout(
          (async () => supabase.from("supplement_brand_aliases").insert(aliasRows))(),
          8000,
          'api.brands.add.insert-aliases',
        );
      }
    }

    return NextResponse.json({
      ok: true,
      brand,
      next_step: "Will be auto-enriched within 10 minutes by the brand-enricher cron",
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.brands.add', 'database timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.brands.add', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
