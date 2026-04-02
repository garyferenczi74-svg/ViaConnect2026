// Product Router: determines if an identified product is a supplement or peptide
// Routes to the appropriate protocol section

import { createClient } from "@/lib/supabase/client";

const PEPTIDE_KEYWORDS = [
  "BPC-157", "TB-500", "Thymosin", "Epitalon", "Selank", "Semax",
  "GHK-Cu", "Bioactive Peptide", "Peptide Complex", "SLU-PP-332",
  "SS-31", "Elamipretide", "Pinealon", "Vesugen", "Bronchogen",
  "MitoPeptide", "EnergyCore", "CoQ10-Peptide", "ATP-Regen",
  "AdrenoPeptide", "HPA-Balance", "StressShield", "RecoveryPulse",
  "ImmuneGuard", "RegenBPC", "AntiInflam", "Vilon",
  "NeuroShield", "CerebroPeptide", "MoodLift",
  "OvaPeptide", "ThyroReg", "ProgestoBalance", "EndoHarmonize",
  "GutRepair", "DetoxPeptide", "HistamineBalance", "Retatrutide",
];

const PEPTIDE_BRANDS = [
  "FarmCeutica", "Integrative Peptides", "Peptide Sciences",
  "Tailor Made Compounding", "Empower Pharmacy",
];

export type ProductRoute = "supplement" | "peptide";

export function detectProductType(brand: string, productName: string, ingredients?: string[]): ProductRoute {
  const combined = `${brand} ${productName}`.toLowerCase();

  // Check product name against peptide keywords
  for (const kw of PEPTIDE_KEYWORDS) {
    if (combined.includes(kw.toLowerCase())) return "peptide";
  }

  // Check brand against known peptide brands
  for (const pb of PEPTIDE_BRANDS) {
    if (brand.toLowerCase().includes(pb.toLowerCase())) return "peptide";
  }

  // Check ingredients for peptide components
  if (ingredients) {
    for (const ing of ingredients) {
      for (const kw of PEPTIDE_KEYWORDS) {
        if (ing.toLowerCase().includes(kw.toLowerCase())) return "peptide";
      }
    }
  }

  return "supplement";
}

export async function routeProductToSection(
  brand: string,
  productName: string,
  ingredients?: string[]
): Promise<{ route: ProductRoute; peptideId?: string }> {
  const route = detectProductType(brand, productName, ingredients);

  if (route === "peptide") {
    // Try to find matching peptide in registry
    const supabase = createClient();
    const normalized = productName.toLowerCase().replace(/[^a-z0-9]/g, "");

    const { data } = await supabase
      .from("peptide_registry")
      .select("peptide_id, name")
      .or(`peptide_id.ilike.%${normalized}%,name.ilike.%${productName}%`)
      .limit(1)
      .maybeSingle();

    return { route: "peptide", peptideId: data?.peptide_id || undefined };
  }

  return { route: "supplement" };
}
