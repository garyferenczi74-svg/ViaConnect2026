// FarmCeutica Master Ingredient Database — Representative seed (replace with full 427 from Excel)
// Categories and sample ingredients across all 9 categories

export const FARMCEUTICA_CATEGORIES = [
  "Liposomal Delivery",
  "Micellar Delivery",
  "Methylated B-Vitamins",
  "Minerals & Cofactors",
  "Amino Acids & Peptides",
  "Plant Extracts & Botanicals",
  "Enzymes & Probiotics",
  "Specialty Compounds",
  "Standard Actives",
] as const;

export type FarmceuticaCategory = (typeof FARMCEUTICA_CATEGORIES)[number];

export interface FarmceuticaIngredient {
  name: string;
  search_name: string;
  category: FarmceuticaCategory;
  delivery_method: string;
  notes?: string;
}

export function normalizeIngredientName(rawName: string): string {
  return rawName
    .replace(/^Liposomal\s+/i, "")
    .replace(/^Micellar\s+/i, "")
    .replace(/^Methylated\s+/i, "")
    .trim();
}

// Helper to build ingredient with auto-computed search_name
function ing(name: string, category: FarmceuticaCategory, delivery_method: string): FarmceuticaIngredient {
  return { name, search_name: normalizeIngredientName(name), category, delivery_method };
}

// Seed data — representative sample across all 9 categories
// Full 427-item list to be imported from FarmCeutica_Ingrediants_master_2026.xlsx
export const SEED_INGREDIENTS: FarmceuticaIngredient[] = [
  // ═══ Liposomal Delivery ═══
  ing("Liposomal Glutathione (Reduced)","Liposomal Delivery","Liposomal"),
  ing("Liposomal CoQ10 (Ubiquinol)","Liposomal Delivery","Liposomal"),
  ing("Liposomal Vitamin C (Ascorbic Acid)","Liposomal Delivery","Liposomal"),
  ing("Liposomal Vitamin D3 (Cholecalciferol)","Liposomal Delivery","Liposomal"),
  ing("Liposomal Vitamin D3 + K2 (MK-7)","Liposomal Delivery","Liposomal"),
  ing("Liposomal Magnesium L-Threonate","Liposomal Delivery","Liposomal"),
  ing("Liposomal Magnesium Bisglycinate","Liposomal Delivery","Liposomal"),
  ing("Liposomal Curcumin (95% Curcuminoids)","Liposomal Delivery","Liposomal"),
  ing("Liposomal NAC (N-Acetyl Cysteine)","Liposomal Delivery","Liposomal"),
  ing("Liposomal Iron Bisglycinate","Liposomal Delivery","Liposomal"),
  ing("Liposomal Zinc Carnosine","Liposomal Delivery","Liposomal"),
  ing("Liposomal Resveratrol","Liposomal Delivery","Liposomal"),
  ing("Liposomal Berberine HCl","Liposomal Delivery","Liposomal"),
  ing("Liposomal Alpha-Lipoic Acid (R-ALA)","Liposomal Delivery","Liposomal"),
  ing("Liposomal Quercetin Phytosome","Liposomal Delivery","Liposomal"),
  ing("Liposomal PQQ (Pyrroloquinoline Quinone)","Liposomal Delivery","Liposomal"),
  ing("Liposomal NMN (Nicotinamide Mononucleotide)","Liposomal Delivery","Liposomal"),
  ing("Liposomal Omega-3 DHA/EPA","Liposomal Delivery","Liposomal"),
  ing("Liposomal Melatonin","Liposomal Delivery","Liposomal"),
  ing("Liposomal GABA","Liposomal Delivery","Liposomal"),
  ing("Liposomal Astaxanthin","Liposomal Delivery","Liposomal"),
  ing("Liposomal Sulforaphane","Liposomal Delivery","Liposomal"),
  ing("Liposomal Fisetin","Liposomal Delivery","Liposomal"),
  ing("Liposomal Apigenin","Liposomal Delivery","Liposomal"),
  ing("BioB Fusion\u2122 Methylated and Liposomal B Complex","Liposomal Delivery","Liposomal"),

  // ═══ Micellar Delivery ═══
  ing("Micellar Ashwagandha (KSM-66\u00ae)","Micellar Delivery","Micellar"),
  ing("Micellar Lion's Mane (Hericium erinaceus)","Micellar Delivery","Micellar"),
  ing("Micellar Rhodiola Rosea","Micellar Delivery","Micellar"),
  ing("Micellar Cordyceps Militaris","Micellar Delivery","Micellar"),
  ing("Micellar Reishi (Ganoderma lucidum)","Micellar Delivery","Micellar"),
  ing("Micellar Turkey Tail (Trametes versicolor)","Micellar Delivery","Micellar"),
  ing("Micellar Chaga (Inonotus obliquus)","Micellar Delivery","Micellar"),
  ing("Micellar Bacopa Monnieri","Micellar Delivery","Micellar"),
  ing("Micellar Holy Basil (Tulsi)","Micellar Delivery","Micellar"),
  ing("Micellar Tongkat Ali (Eurycoma longifolia)","Micellar Delivery","Micellar"),
  ing("Micellar Shilajit (Purified)","Micellar Delivery","Micellar"),
  ing("Micellar Maca Root (Gelatinized)","Micellar Delivery","Micellar"),
  ing("Micellar Saw Palmetto","Micellar Delivery","Micellar"),
  ing("Micellar Milk Thistle (Silymarin)","Micellar Delivery","Micellar"),
  ing("Micellar Boswellia Serrata","Micellar Delivery","Micellar"),

  // ═══ Methylated B-Vitamins ═══
  ing("Methylcobalamin (Vitamin B12)","Methylated B-Vitamins","Standard"),
  ing("Methylfolate (5-MTHF / L-Methylfolate)","Methylated B-Vitamins","Standard"),
  ing("Pyridoxal-5-Phosphate (Active B6 / P5P)","Methylated B-Vitamins","Standard"),
  ing("Thiamine (Benfotiamine / B1)","Methylated B-Vitamins","Standard"),
  ing("Riboflavin-5-Phosphate (Active B2)","Methylated B-Vitamins","Standard"),
  ing("Niacinamide (Vitamin B3)","Methylated B-Vitamins","Standard"),
  ing("Pantothenic Acid (Vitamin B5)","Methylated B-Vitamins","Standard"),
  ing("Biotin (Vitamin B7)","Methylated B-Vitamins","Standard"),
  ing("Adenosylcobalamin (Active B12)","Methylated B-Vitamins","Standard"),
  ing("Inositol (Myo-Inositol)","Methylated B-Vitamins","Standard"),
  ing("Choline Bitartrate","Methylated B-Vitamins","Standard"),

  // ═══ Minerals & Cofactors ═══
  ing("Magnesium Bisglycinate","Minerals & Cofactors","Standard"),
  ing("Magnesium L-Threonate","Minerals & Cofactors","Standard"),
  ing("Magnesium Taurate","Minerals & Cofactors","Standard"),
  ing("Zinc Carnosine","Minerals & Cofactors","Standard"),
  ing("Zinc Picolinate","Minerals & Cofactors","Standard"),
  ing("Selenium (Selenomethionine)","Minerals & Cofactors","Standard"),
  ing("Chromium Picolinate","Minerals & Cofactors","Standard"),
  ing("Potassium Citrate","Minerals & Cofactors","Standard"),
  ing("Calcium D-Glucarate","Minerals & Cofactors","Standard"),
  ing("Boron (as Boron Glycinate)","Minerals & Cofactors","Standard"),
  ing("Iodine (as Potassium Iodide)","Minerals & Cofactors","Standard"),
  ing("Molybdenum (as Molybdenum Glycinate)","Minerals & Cofactors","Standard"),
  ing("Copper Bisglycinate","Minerals & Cofactors","Standard"),
  ing("Manganese Bisglycinate","Minerals & Cofactors","Standard"),

  // ═══ Amino Acids & Peptides ═══
  ing("BPC-157 (Body Protection Compound)","Amino Acids & Peptides","Standard"),
  ing("L-Glutamine","Amino Acids & Peptides","Standard"),
  ing("NAC (N-Acetyl Cysteine)","Amino Acids & Peptides","Standard"),
  ing("Creatine HCl","Amino Acids & Peptides","Standard"),
  ing("L-Citrulline Malate","Amino Acids & Peptides","Standard"),
  ing("L-Theanine","Amino Acids & Peptides","Standard"),
  ing("Glycine","Amino Acids & Peptides","Standard"),
  ing("Taurine","Amino Acids & Peptides","Standard"),
  ing("L-Tyrosine","Amino Acids & Peptides","Standard"),
  ing("Beta-Alanine","Amino Acids & Peptides","Standard"),
  ing("Collagen Peptides (Types I & III)","Amino Acids & Peptides","Standard"),

  // ═══ Plant Extracts & Botanicals ═══
  ing("Apigenin","Plant Extracts & Botanicals","Standard"),
  ing("5-HTP (Griffonia simplicifolia)","Plant Extracts & Botanicals","Standard"),
  ing("Bacopa Monnieri (50% Bacosides)","Plant Extracts & Botanicals","Standard"),
  ing("Holy Basil (Tulsi)","Plant Extracts & Botanicals","Standard"),
  ing("Maca Root (Gelatinized)","Plant Extracts & Botanicals","Standard"),
  ing("Ashwagandha (KSM-66\u00ae)","Plant Extracts & Botanicals","Standard"),
  ing("Rhodiola Rosea (3% Rosavins)","Plant Extracts & Botanicals","Standard"),
  ing("Turmeric (95% Curcuminoids)","Plant Extracts & Botanicals","Standard"),
  ing("Ginkgo Biloba (24% Flavone Glycosides)","Plant Extracts & Botanicals","Standard"),
  ing("Saw Palmetto (320mg)","Plant Extracts & Botanicals","Standard"),
  ing("Elderberry (Sambucus nigra)","Plant Extracts & Botanicals","Standard"),
  ing("Echinacea Purpurea","Plant Extracts & Botanicals","Standard"),
  ing("Valerian Root","Plant Extracts & Botanicals","Standard"),
  ing("Passionflower (Passiflora incarnata)","Plant Extracts & Botanicals","Standard"),
  ing("Black Seed Oil (Nigella sativa)","Plant Extracts & Botanicals","Standard"),

  // ═══ Enzymes & Probiotics ═══
  ing("DAO Enzyme (Diamine Oxidase)","Enzymes & Probiotics","Standard"),
  ing("DigestiZorb+\u2122 Enzyme Complex","Enzymes & Probiotics","Standard"),
  ing("Probiotic Blend 50B CFU (10 Strains)","Enzymes & Probiotics","Standard"),
  ing("Probiotic Blend 100B CFU (15 Strains)","Enzymes & Probiotics","Standard"),
  ing("Saccharomyces boulardii","Enzymes & Probiotics","Standard"),
  ing("Lactobacillus rhamnosus GG","Enzymes & Probiotics","Standard"),
  ing("Bifidobacterium longum","Enzymes & Probiotics","Standard"),
  ing("Bromelain (2400 GDU/g)","Enzymes & Probiotics","Standard"),
  ing("Serrapeptase (120,000 SPU)","Enzymes & Probiotics","Standard"),
  ing("Nattokinase (2000 FU)","Enzymes & Probiotics","Standard"),
  ing("Pancreatin 10X","Enzymes & Probiotics","Standard"),

  // ═══ Specialty Compounds ═══
  ing("NMN (Nicotinamide Mononucleotide)","Specialty Compounds","Standard"),
  ing("PQQ (Pyrroloquinoline Quinone)","Specialty Compounds","Standard"),
  ing("Urolithin A","Specialty Compounds","Standard"),
  ing("Spermidine","Specialty Compounds","Standard"),
  ing("Quercetin Phytosome","Specialty Compounds","Standard"),
  ing("Pterostilbene","Specialty Compounds","Standard"),
  ing("Dihydroberberine (GlucoVantage\u00ae)","Specialty Compounds","Standard"),
  ing("Palmitoylethanolamide (PEA)","Specialty Compounds","Standard"),
  ing("Phosphatidylserine (PS)","Specialty Compounds","Standard"),
  ing("SAMe (S-Adenosyl Methionine)","Specialty Compounds","Standard"),

  // ═══ Standard Actives ═══
  ing("CoQ10 (Ubiquinone)","Standard Actives","Standard"),
  ing("Omega-3 DHA/EPA (Fish Oil)","Standard Actives","Standard"),
  ing("Algal Omega-3 DHA/EPA (Vegan)","Standard Actives","Standard"),
  ing("Astaxanthin (12mg)","Standard Actives","Standard"),
  ing("Berberine HCl","Standard Actives","Standard"),
  ing("Alpha-Lipoic Acid (R-ALA)","Standard Actives","Standard"),
  ing("Vitamin E (Mixed Tocopherols)","Standard Actives","Standard"),
  ing("Vitamin A (Retinyl Palmitate)","Standard Actives","Standard"),
  ing("Vitamin K2 (MK-7)","Standard Actives","Standard"),
  ing("DIM (Diindolylmethane)","Standard Actives","Standard"),
  ing("Lutein + Zeaxanthin","Standard Actives","Standard"),
  ing("Resveratrol (Trans-Resveratrol)","Standard Actives","Standard"),
  ing("Melatonin (Extended Release)","Standard Actives","Standard"),
  ing("DHEA (Micronized)","Standard Actives","Standard"),
  ing("Pregnenolone","Standard Actives","Standard"),
];
