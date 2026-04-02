import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.toLowerCase().trim();
  const category = searchParams.get("category");

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc("search_peptides", {
      search_query: query,
      result_limit: 8,
    });

    if (error) {
      console.error("Peptide search RPC error:", error);
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
    console.error("Peptide search error:", err);
    return NextResponse.json({ results: [] });
  }
}
