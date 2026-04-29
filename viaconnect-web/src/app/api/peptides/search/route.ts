import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.toLowerCase().trim();
  const category = searchParams.get("category");

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createClient();

  try {
    const { data, error } = await withTimeout(
      (async () => supabase.rpc("search_peptides", {
        search_query: query,
        result_limit: 8,
      }))(),
      8000,
      "api.peptides.search.rpc",
    );

    if (error) {
      safeLog.warn("api.peptides.search", "RPC error", { query, error });
      return NextResponse.json({ results: [] });
    }

    let results = data || [];

    // Apply category filter if provided
    if (category) {
      const catId = parseInt(category);
      results = results.filter((r: Record<string, unknown>) => r.category_id === catId);
    }

    // Fetch delivery options for each result
    const enriched = await Promise.all(
      results.map(async (peptide: Record<string, unknown>) => {
        const { data: options } = await supabase
          .from("peptide_delivery_options")
          .select("delivery_form, dose_amount, dose_unit, dose_frequency, bioavailability_estimate, price_range_low, price_range_high, onset_timeline")
          .eq("peptide_id", peptide.peptide_id as string)
          .eq("is_available", true);

        return {
          ...peptide,
          deliveryOptions: options || [],
          availableForms: (options || []).map((d: Record<string, unknown>) => d.delivery_form),
        };
      })
    );

    return NextResponse.json({ results: enriched });
  } catch (err) {
    if (isTimeoutError(err)) safeLog.warn("api.peptides.search", "timeout", { query, error: err });
    else safeLog.error("api.peptides.search", "unexpected error", { query, error: err });
    return NextResponse.json({ results: [] });
  }
}
