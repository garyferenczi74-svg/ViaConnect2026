import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createClient();

  // Try full-text search first
  const { data, error } = await supabase
    .from("supplement_products")
    .select("*")
    .textSearch("search_vector", query, { type: "websearch" })
    .limit(8);

  if (!error && data && data.length > 0) {
    return NextResponse.json({ results: data.map(mapToSuggestion) });
  }

  // Fallback: ILIKE prefix match
  const { data: fallback } = await supabase
    .from("supplement_products")
    .select("*")
    .or(`brand_name.ilike.%${query}%,product_name.ilike.%${query}%`)
    .limit(8);

  return NextResponse.json({ results: (fallback || []).map(mapToSuggestion) });
}

function mapToSuggestion(row: Record<string, unknown>) {
  return {
    brandName: row.brand_name as string,
    productName: row.product_name as string,
    formulation: (row.formulation as string) || "",
    category: (row.category as string) || "Supplement",
    dosageForm: (row.dosage_form as string) || "capsule",
    typicalDosage: (row.typical_dosage as string) || "",
    keyIngredients: (row.key_ingredients as string[]) || [],
  };
}
