/**
 * CAQ_REPLACEMENT_MAP.md encoded as exact pairs then category matches.
 * ViaCura SKU names are catalog names already on file.
 * Unmapped (greens / all-in-one / store-brand without nutrient SSOT) → no SKU.
 * GeneX360 / SNP Soft is out of this map.
 */

import type { CaqMapCategory, CaqMapMatch, WhyViacuraPillarId } from "./types";

export interface CaqReplacementMapRow {
  id: string;
  kind: "exact" | "category";
  category: CaqMapCategory;
  via_cura_skus: readonly string[];
  why_pillar_ids: readonly WhyViacuraPillarId[];
}

export const CAQ_EXACT_PAIR_ROWS: readonly CaqReplacementMapRow[] = [
  {
    id: "exact:thorne_mg_bisglycinate",
    kind: "exact",
    category: "thorne_mg_bisglycinate",
    via_cura_skus: ["Magnesium Synergy Matrix"],
    why_pillar_ids: ["thorne_displacement_pairs", "dual_delivery"],
  },
  {
    id: "exact:thorne_nac",
    kind: "exact",
    category: "thorne_nac",
    via_cura_skus: ["Clean+"],
    why_pillar_ids: ["thorne_displacement_pairs"],
  },
  {
    id: "exact:thorne_coq10",
    kind: "exact",
    category: "thorne_coq10",
    via_cura_skus: ["Replenish NAD+"],
    why_pillar_ids: ["thorne_displacement_pairs"],
  },
  {
    id: "exact:thorne_glutathione_sr",
    kind: "exact",
    category: "thorne_glutathione_sr",
    via_cura_skus: ["Clean+"],
    why_pillar_ids: ["thorne_displacement_pairs"],
  },
  {
    id: "exact:thorne_ashwagandha",
    kind: "exact",
    category: "thorne_ashwagandha",
    via_cura_skus: ["RISE+"],
    why_pillar_ids: ["thorne_displacement_pairs", "micellar_vs_standard_extracts_rise"],
  },
  {
    id: "exact:thorne_5mthf",
    kind: "exact",
    category: "thorne_5mthf",
    via_cura_skus: ["MTHFR+"],
    why_pillar_ids: ["thorne_displacement_pairs", "methylated_forms"],
  },
] as const;

export const CAQ_CATEGORY_ROWS: readonly CaqReplacementMapRow[] = [
  {
    id: "category:practitioner_nad_nmn",
    kind: "category",
    category: "practitioner_nad_nmn",
    via_cura_skus: ["Replenish NAD+"],
    why_pillar_ids: [
      "dual_delivery",
      "liposomal_process_nad",
      "manufacturing_grade_nad",
      "ingredient_purity_grades",
    ],
  },
  {
    id: "category:standard_folate_b_complex",
    kind: "category",
    category: "standard_folate_b_complex",
    via_cura_skus: ["MTHFR+", "MethylB Complete+"],
    why_pillar_ids: ["methylated_forms"],
  },
  {
    id: "category:sports_creatine_amino",
    kind: "category",
    category: "sports_creatine_amino",
    via_cura_skus: ["CREATINE HCL+", "Amino Acid Matrix+"],
    why_pillar_ids: ["dual_delivery", "methylated_forms"],
  },
  {
    id: "category:sleep_stress",
    kind: "category",
    category: "sleep_stress",
    via_cura_skus: ["RELAX+"],
    why_pillar_ids: ["dual_delivery"],
  },
  {
    id: "category:male_vitality_tongkat",
    kind: "category",
    category: "male_vitality_tongkat",
    via_cura_skus: ["RISE+"],
    why_pillar_ids: ["micellar_vs_standard_extracts_rise"],
  },
  {
    id: "category:joint",
    kind: "category",
    category: "joint",
    via_cura_skus: ["FLEX+"],
    why_pillar_ids: ["curcumin_delivery_flex"],
  },
  {
    id: "category:prenatal",
    kind: "category",
    category: "prenatal",
    via_cura_skus: ["GROW+"],
    why_pillar_ids: ["methylated_forms", "dual_delivery"],
  },
  {
    id: "category:gut_enzymes",
    kind: "category",
    category: "gut_enzymes",
    via_cura_skus: ["DigestiZorb+", "Balance+"],
    why_pillar_ids: ["dual_delivery"],
  },
  {
    id: "category:greens_all_in_one",
    kind: "category",
    category: "greens_all_in_one",
    via_cura_skus: [],
    why_pillar_ids: [],
  },
  {
    id: "category:store_brand_mass",
    kind: "category",
    category: "store_brand_mass",
    via_cura_skus: [],
    why_pillar_ids: ["methylated_forms", "dual_delivery"],
  },
] as const;

const UNMAPPED: CaqMapMatch = {
  kind: "unmapped",
  via_cura_skus: [],
  why_pillar_ids: [],
};

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+]+/g, " ").trim();
}

function haystack(brand: string | undefined, productName: string): string {
  return norm(`${brand ?? ""} ${productName}`);
}

function hasThorne(hay: string): boolean {
  return /\bthorne\b/.test(hay);
}

function rowToMatch(row: CaqReplacementMapRow): CaqMapMatch {
  return {
    kind: row.kind,
    category: row.category,
    via_cura_skus: row.via_cura_skus,
    why_pillar_ids: row.why_pillar_ids,
    map_row_id: row.id,
  };
}

function matchGreens(hay: string): CaqReplacementMapRow | undefined {
  if (/\b(ag1|athletic greens|im8|bloom|greens|all in one|all-in-one)\b/.test(hay)) {
    return CAQ_CATEGORY_ROWS.find((row) => row.category === "greens_all_in_one");
  }
  return undefined;
}

function matchStoreBrand(hay: string): CaqReplacementMapRow | undefined {
  if (/\b(kirkland|equate|spring valley)\b/.test(hay)) {
    return CAQ_CATEGORY_ROWS.find((row) => row.category === "store_brand_mass");
  }
  return undefined;
}

function matchExactThorne(hay: string): CaqReplacementMapRow | undefined {
  if (!hasThorne(hay)) return undefined;
  if (/\b(mg|magnesium)\s+bisglycinate\b/.test(hay)) {
    return CAQ_EXACT_PAIR_ROWS.find((row) => row.category === "thorne_mg_bisglycinate");
  }
  if (/\bglutathione(\s+sr)?\b/.test(hay)) {
    return CAQ_EXACT_PAIR_ROWS.find((row) => row.category === "thorne_glutathione_sr");
  }
  if (/\bashwagandha\b/.test(hay)) {
    return CAQ_EXACT_PAIR_ROWS.find((row) => row.category === "thorne_ashwagandha");
  }
  if (/\b(5-?mthf|methylfolate)\b/.test(hay)) {
    return CAQ_EXACT_PAIR_ROWS.find((row) => row.category === "thorne_5mthf");
  }
  if (/\bcoq10\b/.test(hay)) {
    return CAQ_EXACT_PAIR_ROWS.find((row) => row.category === "thorne_coq10");
  }
  if (/\bnac\b/.test(hay)) {
    return CAQ_EXACT_PAIR_ROWS.find((row) => row.category === "thorne_nac");
  }
  return undefined;
}

function matchCategory(hay: string): CaqReplacementMapRow | undefined {
  if (/\bprenatal\b/.test(hay)) {
    return CAQ_CATEGORY_ROWS.find((row) => row.category === "prenatal");
  }
  if (/\b(melatonin|sleep)\b/.test(hay) || (/\b(olly|natrol|ritual)\b/.test(hay) && /\b(sleep|melatonin)\b/.test(hay))) {
    return CAQ_CATEGORY_ROWS.find((row) => row.category === "sleep_stress");
  }
  if (/\b(glucosamine|msm|ar-?encap|joint)\b/.test(hay)) {
    return CAQ_CATEGORY_ROWS.find((row) => row.category === "joint");
  }
  if (/\b(tongkat|onnit)\b/.test(hay)) {
    return CAQ_CATEGORY_ROWS.find((row) => row.category === "male_vitality_tongkat");
  }
  if (
    /\b(enzyme|probiotic|digest)\b/.test(hay) ||
    /\b(enzymedica|renew life|culturelle)\b/.test(hay)
  ) {
    return CAQ_CATEGORY_ROWS.find((row) => row.category === "gut_enzymes");
  }
  if (
    /\b(creatine|amino complex|amino acid)\b/.test(hay) ||
    (/\b(transparent labs|legion)\b/.test(hay) && /\b(creatine|amino)\b/.test(hay))
  ) {
    return CAQ_CATEGORY_ROWS.find((row) => row.category === "sports_creatine_amino");
  }
  if (
    /\b(nad\+?|nmn)\b/.test(hay) ||
    /\brenue( by science)?\b/.test(hay) ||
    (/\b(life extension|codeage)\b/.test(hay) && /\b(nad|nmn|longevity)\b/.test(hay))
  ) {
    return CAQ_CATEGORY_ROWS.find((row) => row.category === "practitioner_nad_nmn");
  }
  if (
    /\b(folic acid|folate|5-?mthf|methylfolate|b-?complex|b complex)\b/.test(hay) ||
    (/\b(nature made|centrum|one a day)\b/.test(hay) && /\b(folate|folic|b-?complex|vitamin b)\b/.test(hay)) ||
    (/\bnow\b/.test(hay) && /\b(folate|folic|b-?complex|vitamin b)\b/.test(hay))
  ) {
    return CAQ_CATEGORY_ROWS.find((row) => row.category === "standard_folate_b_complex");
  }
  return undefined;
}

/**
 * Exact Thorne pairs first after honesty unmapped lanes, then category.
 * Greens / store-brand never invent a ViaCura SKU.
 */
export function matchCaqReplacement(
  brand: string | undefined,
  productName: string
): CaqMapMatch {
  const hay = haystack(brand, productName);
  if (!hay) return UNMAPPED;

  const greens = matchGreens(hay);
  if (greens) return rowToMatch(greens);

  const store = matchStoreBrand(hay);
  if (store) return rowToMatch(store);

  const exact = matchExactThorne(hay);
  if (exact) return rowToMatch(exact);

  const category = matchCategory(hay);
  if (category) return rowToMatch(category);

  return UNMAPPED;
}

export const VIA_CURA_MAP_SKUS: readonly string[] = [
  ...new Set(
    [...CAQ_EXACT_PAIR_ROWS, ...CAQ_CATEGORY_ROWS].flatMap((row) => [...row.via_cura_skus])
  ),
];
