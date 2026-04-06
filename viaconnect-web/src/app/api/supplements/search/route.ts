import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const brandId = searchParams.get("brand_id") ?? null;

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], grouped: { brands: [], products: [], ingredients: [] }, total: 0 });
  }

  const supabase = createClient();

  try {
    // Use the enhanced v2 search RPC
    const { data, error } = await supabase.rpc("search_supplements_v2", {
      query_text: query,
      result_limit: limit,
      brand_filter: brandId,
    });

    if (error) {
      console.error("Search RPC error:", error);
      // Fallback to old search_supplements
      const { data: fallback } = await supabase.rpc("search_supplements", {
        search_query: query.toLowerCase(),
        result_limit: limit,
      });
      return NextResponse.json({
        results: fallback || [],
        grouped: { brands: [], products: fallback || [], ingredients: [] },
        total: (fallback || []).length,
      });
    }

    const results = data || [];
    const grouped = {
      brands: results.filter((r: any) => r.result_type === "brand"),
      products: results.filter((r: any) => r.result_type === "product"),
      ingredients: results.filter((r: any) => r.result_type === "ingredient"),
    };

    return NextResponse.json({ results, grouped, total: results.length, query });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ results: [], grouped: { brands: [], products: [], ingredients: [] }, total: 0 });
  }
}
