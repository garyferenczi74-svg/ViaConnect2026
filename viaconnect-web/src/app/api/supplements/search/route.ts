import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createClient();

  try {
    // Use the search_supplements RPC function (searches brands, products, aliases)
    const { data, error } = await supabase.rpc("search_supplements", {
      search_query: query.toLowerCase(),
      result_limit: 8,
    });

    if (error) {
      console.error("Search RPC error:", error);
      // Fallback: simple ILIKE on brand registry
      const { data: fallback } = await supabase
        .from("supplement_brand_registry")
        .select("id, brand_name, tier, key_categories")
        .ilike("brand_name", `%${query}%`)
        .limit(8);

      return NextResponse.json({
        results: (fallback || []).map((b) => ({
          resultType: "brand",
          brandName: b.brand_name,
          productName: null,
          category: (b.key_categories as string[])?.[0] || "Supplement",
          isEnriched: false,
          ingredientBreakdown: null,
          matchScore: 50,
        })),
      });
    }

    return NextResponse.json({
      results: (data || []).map((r: Record<string, unknown>) => ({
        resultType: r.result_type,
        brandId: r.brand_id,
        brandName: r.brand_name,
        productId: r.product_id,
        productName: r.product_name,
        category: r.product_category || "Supplement",
        isEnriched: r.is_enriched || false,
        ingredientBreakdown: r.ingredient_breakdown,
        matchScore: r.match_score,
      })),
    });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ results: [] });
  }
}
