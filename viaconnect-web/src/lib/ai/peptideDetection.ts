// Detect peptide ingredients hidden inside supplement products
// Offers routing to Peptides Protocol for enhanced tracking

import type { IngredientBreakdownEntry } from "@/types/supplements";

const PEPTIDE_KEYWORDS = [
  "BPC-157", "TB-500", "Thymosin", "Epitalon", "Selank", "Semax",
  "GHK-Cu", "Bioactive Peptide", "Peptide Complex", "SLU-PP-332",
  "SS-31", "Elamipretide", "Collagen Peptide", "Pinealon", "Vesugen",
];

export interface PeptideDetection {
  detected: boolean;
  peptideKeyword: string;
  ingredientName: string;
  suggestion: string;
}

export function detectPeptideInIngredients(
  ingredientBreakdown: IngredientBreakdownEntry[]
): PeptideDetection | null {
  for (const ingredient of ingredientBreakdown) {
    const combined = `${ingredient.name} ${ingredient.form || ""}`.toLowerCase();
    const match = PEPTIDE_KEYWORDS.find((kw) => combined.includes(kw.toLowerCase()));

    if (match) {
      return {
        detected: true,
        peptideKeyword: match,
        ingredientName: ingredient.name,
        suggestion: `This product contains ${match}, which is in the FarmCeutica peptide database. Would you like to also add it to your Peptides Protocol for enhanced tracking and interaction monitoring?`,
      };
    }
  }
  return null;
}
