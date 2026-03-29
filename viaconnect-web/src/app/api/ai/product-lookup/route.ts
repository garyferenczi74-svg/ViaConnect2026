import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

function normalizeBrandSearch(query: string): string {
  return query
    .replace(/[\u00ae\u2122\u00a9]/g, "")  // Remove ®™©
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // Remove accents
    .replace(/[-_.]/g, " ")
    .trim();
}

function buildPrompt(query: string) {
  const normalized = normalizeBrandSearch(query);
  return `You are a supplement research assistant. Find the EXACT product the user is looking for and return its complete Supplement Facts label data.

SEARCH QUERY: "${query}"
ALTERNATE SEARCH: "${normalized}"

SEARCH STRATEGY:
1. Search for the exact product name + "supplement facts"
2. Try manufacturer website, Amazon, iHerb, or Examine.com
3. If brand has special characters, try normalized version: "${normalized}"
4. For proprietary blends, look for third-party lab analyses

RETURN FORMAT (JSON only, no markdown, no preamble):
{
  "found": true,
  "product": {
    "name": "product name without brand",
    "brand": "manufacturer/brand name",
    "fullName": "brand + product name",
    "servingSize": "e.g., 1 capsule",
    "servingsPerContainer": null,
    "recommendedDose": "e.g., Take 1 capsule daily with food",
    "recommendedFrequency": "once_daily",
    "ingredients": [
      { "name": "full ingredient name with form", "amount": 0, "unit": "mg", "dailyValuePercent": null, "activeForm": "", "category": "standard_actives" }
    ],
    "otherIngredients": [],
    "allergenWarnings": [],
    "confidence": 0.85
  }
}

CATEGORY OPTIONS: standard_actives, liposomal_delivery, micellar_delivery, methylated_vitamins, minerals_cofactors, amino_acids, peptides, plant_extracts_botanicals, enzymes_probiotics, specialty_compounds

CRITICAL: Be EXACT with amounts. Cross-reference at least 2 sources. If not found return {"found":false,"error":"Could not find product"}
Return ONLY valid JSON.`;
}

export async function POST(request: Request) {
  const { query } = await request.json();

  if (!query || query.length < 3) {
    return NextResponse.json({ found: false, error: "Query too short" });
  }

  // Check cache first
  const supabase = createClient();
  const normalized = query.toLowerCase().trim();
  const { data: cached } = await supabase
    .from("product_lookup_cache")
    .select("product_data")
    .eq("query_normalized", normalized)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (cached?.product_data) {
    return NextResponse.json(cached.product_data);
  }

  // No API key — return mock for development
  if (!ANTHROPIC_API_KEY) {
    const brandMatch = query.match(/^(thorne|now foods?|garden of life|nature made|solgar|ag1|athletic greens|con.?cr[eē]t|life extension|jarrow|nordic naturals|pure encapsulations|metagenics|designs for health|klaire labs|seeking health|orthomolecular)/i);
    const brand = brandMatch?.[1] || "Unknown Brand";
    const name = query.replace(new RegExp(`^${brand}\\s*`, "i"), "").trim() || query;

    const mockResult = {
      found: true,
      product: {
        name,
        brand,
        fullName: query,
        servingSize: "1 capsule",
        servingsPerContainer: 60,
        recommendedDose: "1 capsule daily with food",
        recommendedFrequency: "once_daily",
        ingredients: [
          { name: `${name} (Active Form)`, amount: 500, unit: "mg", dailyValuePercent: null, activeForm: "", category: "standard_actives" },
        ],
        otherIngredients: ["Vegetable capsule", "Silicon dioxide"],
        allergenWarnings: [],
        confidence: 0.5,
      },
    };
    return NextResponse.json(mockResult);
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: buildPrompt(query) }],
      }),
    });

    const data = await response.json();
    const textContent = data.content
      ?.filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("") || "";

    const cleaned = textContent.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleaned);

    // Cache the result
    await supabase.from("product_lookup_cache").upsert({
      query_normalized: normalized,
      product_data: result,
      confidence: result.product?.confidence || 0,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "query_normalized" }).catch(() => {});

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({
      found: false,
      error: "Failed to look up product. Try a more specific search.",
    });
  }
}
