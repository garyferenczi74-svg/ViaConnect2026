import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const brandId = searchParams.get("brand_id") ?? undefined;

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], grouped: { brands: [], products: [], ingredients: [] }, total: 0 });
  }

  const supabase = createClient();

  try {
    const { data, error } = await withTimeout(
      (async () => supabase.rpc("search_supplements_v2", {
        query_text: query,
        result_limit: limit,
        brand_filter: brandId,
      }))(),
      8000,
      "api.supplements.search.v2",
    );

    if (error) {
      safeLog.warn("api.supplements.search", "v2 RPC error, falling back to v1", { query, error });
      try {
        const { data: fallback } = await withTimeout(
          (async () => supabase.rpc("search_supplements", {
            search_query: query.toLowerCase(),
            result_limit: limit,
          }))(),
          8000,
          "api.supplements.search.v1-fallback",
        );
        return NextResponse.json({
          results: fallback || [],
          grouped: { brands: [], products: fallback || [], ingredients: [] },
          total: (fallback || []).length,
          stale: true,
        });
      } catch (fbErr) {
        safeLog.error("api.supplements.search", "v1 fallback also failed", { query, error: fbErr });
        return NextResponse.json({ results: [], grouped: { brands: [], products: [], ingredients: [] }, total: 0, stale: true });
      }
    }

    const results = data || [];
    const grouped = {
      brands: results.filter((r: any) => r.result_type === "brand"),
      products: results.filter((r: any) => r.result_type === "product"),
      ingredients: results.filter((r: any) => r.result_type === "ingredient"),
    };

    return NextResponse.json({ results, grouped, total: results.length, query });
  } catch (err) {
    if (isTimeoutError(err)) safeLog.warn("api.supplements.search", "timeout", { query, error: err });
    else safeLog.error("api.supplements.search", "unexpected error", { query, error: err });
    return NextResponse.json({ results: [], grouped: { brands: [], products: [], ingredients: [] }, total: 0, stale: true });
  }
}
