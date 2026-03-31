// Top 200+ Common Supplement Products — Seed Data
// Used for Tier 1 instant local search in CAQ Phase 6

export const SEED_SUPPLEMENTS = [
  // === PROTEIN ===
  { brand_name: "Optimum Nutrition", product_name: "Gold Standard 100% Whey", formulation: "24g protein, 5.5g BCAAs, 1g sugar per scoop", category: "Protein", dosage_form: "powder", typical_dosage: "1 scoop (30.4g)", key_ingredients: ["Whey Protein Isolate", "Whey Protein Concentrate", "Whey Peptides"] },
  { brand_name: "Optimum Nutrition", product_name: "Gold Standard 100% Casein", formulation: "24g protein, slow-release, 1g sugar per scoop", category: "Protein", dosage_form: "powder", typical_dosage: "1 scoop (33g)", key_ingredients: ["Micellar Casein"] },
  { brand_name: "Dymatize", product_name: "ISO100 Hydrolyzed Whey Protein", formulation: "25g protein, 0g sugar, hydrolyzed for fast absorption", category: "Protein", dosage_form: "powder", typical_dosage: "1 scoop (32g)", key_ingredients: ["Hydrolyzed Whey Protein Isolate"] },
  { brand_name: "Garden of Life", product_name: "Organic Plant Protein", formulation: "22g plant protein, organic, vegan, non-GMO", category: "Protein", dosage_form: "powder", typical_dosage: "1 scoop", key_ingredients: ["Organic Pea Protein", "Organic Brown Rice Protein"] },
  { brand_name: "Orgain", product_name: "Organic Protein Powder", formulation: "21g plant protein, organic, creamy chocolate", category: "Protein", dosage_form: "powder", typical_dosage: "2 scoops (46g)", key_ingredients: ["Organic Pea Protein", "Organic Brown Rice Protein", "Organic Chia Seeds"] },

  // === MULTIVITAMINS ===
  { brand_name: "Optimum Nutrition", product_name: "Opti-Men", formulation: "75+ active ingredients, amino acids, antioxidants", category: "Multivitamin", dosage_form: "tablet", typical_dosage: "3 tablets daily", key_ingredients: ["Vitamin D", "Vitamin B12", "Zinc", "Selenium"] },
  { brand_name: "Garden of Life", product_name: "Vitamin Code Men", formulation: "Raw whole food multivitamin, live probiotics, enzymes", category: "Multivitamin", dosage_form: "capsule", typical_dosage: "4 capsules daily", key_ingredients: ["Vitamin A", "Vitamin C", "Vitamin D3", "B Complex"] },
  { brand_name: "Thorne", product_name: "Basic Nutrients 2/Day", formulation: "NSF-certified, bioactive forms, no unnecessary additives", category: "Multivitamin", dosage_form: "capsule", typical_dosage: "2 capsules daily", key_ingredients: ["Methylfolate", "Methylcobalamin", "Vitamin D3", "Zinc Picolinate"] },
  { brand_name: "Pure Encapsulations", product_name: "ONE Multivitamin", formulation: "Hypoallergenic, bioavailable, one-a-day formula", category: "Multivitamin", dosage_form: "capsule", typical_dosage: "1 capsule daily", key_ingredients: ["Metafolin L-5-MTHF", "Vitamin D3", "CoQ10"] },
  { brand_name: "Nature Made", product_name: "Multi Complete", formulation: "22 essential vitamins & minerals, USP verified", category: "Multivitamin", dosage_form: "tablet", typical_dosage: "1 tablet daily", key_ingredients: ["Vitamin A", "Vitamin C", "Vitamin D", "Iron", "Calcium"] },
  { brand_name: "Centrum", product_name: "Adults Multivitamin", formulation: "Complete from A to Zinc, immune support", category: "Multivitamin", dosage_form: "tablet", typical_dosage: "1 tablet daily", key_ingredients: ["Vitamin D", "Iron", "Zinc", "Lutein"] },
  { brand_name: "Ritual", product_name: "Essential for Men 18+", formulation: "10 key nutrients, vegan, delayed-release capsule", category: "Multivitamin", dosage_form: "capsule", typical_dosage: "2 capsules daily", key_ingredients: ["Omega-3 DHA", "Vitamin D3", "Vitamin K2", "Folate"] },

  // === OMEGA-3 / FISH OIL ===
  { brand_name: "Nordic Naturals", product_name: "Ultimate Omega", formulation: "1280mg omega-3 (650 EPA / 450 DHA) per serving", category: "Omega-3", dosage_form: "softgel", typical_dosage: "2 softgels daily", key_ingredients: ["EPA", "DHA", "Fish Oil Concentrate"] },
  { brand_name: "Carlson", product_name: "Elite Omega-3 Gems", formulation: "1600mg omega-3, wild-caught Norwegian fish oil", category: "Omega-3", dosage_form: "softgel", typical_dosage: "2 softgels daily", key_ingredients: ["EPA", "DHA"] },
  { brand_name: "Sports Research", product_name: "Triple Strength Omega-3", formulation: "1040mg EPA + 560mg DHA per softgel", category: "Omega-3", dosage_form: "softgel", typical_dosage: "1 softgel daily", key_ingredients: ["EPA", "DHA"] },

  // === VITAMIN D ===
  { brand_name: "NatureWise", product_name: "Vitamin D3 5000 IU", formulation: "5000 IU vitamin D3, organic olive oil", category: "Vitamin D", dosage_form: "softgel", typical_dosage: "1 softgel daily", key_ingredients: ["Cholecalciferol (D3)"] },
  { brand_name: "Thorne", product_name: "Vitamin D-5000", formulation: "5000 IU vitamin D3, NSF-certified", category: "Vitamin D", dosage_form: "capsule", typical_dosage: "1 capsule daily", key_ingredients: ["Vitamin D3"] },
  { brand_name: "NOW Foods", product_name: "Vitamin D-3 2000 IU", formulation: "2000 IU vitamin D3, high potency", category: "Vitamin D", dosage_form: "softgel", typical_dosage: "1 softgel daily", key_ingredients: ["Vitamin D3"] },

  // === MAGNESIUM ===
  { brand_name: "Natural Vitality", product_name: "Calm Magnesium Powder", formulation: "325mg magnesium citrate, anti-stress drink", category: "Magnesium", dosage_form: "powder", typical_dosage: "2 tsp in water", key_ingredients: ["Magnesium Citrate"] },
  { brand_name: "Doctor's Best", product_name: "High Absorption Magnesium", formulation: "200mg magnesium bisglycinate chelate per serving", category: "Magnesium", dosage_form: "tablet", typical_dosage: "2 tablets daily", key_ingredients: ["Magnesium Bisglycinate Chelate"] },
  { brand_name: "Life Extension", product_name: "Neuro-Mag Magnesium L-Threonate", formulation: "144mg magnesium from L-threonate, brain support", category: "Magnesium", dosage_form: "capsule", typical_dosage: "3 capsules daily", key_ingredients: ["Magnesium L-Threonate"] },
  { brand_name: "Magtein", product_name: "Magnesium L-Threonate", formulation: "2000mg Magtein per serving, cognitive support", category: "Magnesium", dosage_form: "capsule", typical_dosage: "3 capsules daily", key_ingredients: ["Magnesium L-Threonate"] },

  // === PROBIOTICS ===
  { brand_name: "Culturelle", product_name: "Digestive Health Daily", formulation: "10 billion CFU Lactobacillus rhamnosus GG", category: "Probiotic", dosage_form: "capsule", typical_dosage: "1 capsule daily", key_ingredients: ["Lactobacillus rhamnosus GG"] },
  { brand_name: "Seed", product_name: "DS-01 Daily Synbiotic", formulation: "24 strains, 53.6 billion AFU, prebiotic + probiotic", category: "Probiotic", dosage_form: "capsule", typical_dosage: "2 capsules daily", key_ingredients: ["24 Probiotic Strains", "Prebiotic Fiber"] },
  { brand_name: "Garden of Life", product_name: "Dr. Formulated Probiotics", formulation: "50 billion CFU, 16 strains, shelf stable", category: "Probiotic", dosage_form: "capsule", typical_dosage: "1 capsule daily", key_ingredients: ["16 Probiotic Strains", "Acacia Fiber"] },
  { brand_name: "Align", product_name: "Extra Strength Probiotic", formulation: "5 billion CFU, Bifidobacterium 35624", category: "Probiotic", dosage_form: "capsule", typical_dosage: "1 capsule daily", key_ingredients: ["Bifidobacterium 35624"] },

  // === B VITAMINS ===
  { brand_name: "Jarrow Formulas", product_name: "Methyl B-12 5000mcg", formulation: "5000mcg methylcobalamin, cherry flavor", category: "B Vitamin", dosage_form: "lozenge", typical_dosage: "1 lozenge daily", key_ingredients: ["Methylcobalamin"] },
  { brand_name: "Thorne", product_name: "Methyl-Guard Plus", formulation: "Methylation support: 5-MTHF, B12, B6, riboflavin 5-phosphate", category: "B Vitamin", dosage_form: "capsule", typical_dosage: "3 capsules daily", key_ingredients: ["L-5-MTHF", "Methylcobalamin", "P5P", "Riboflavin 5-Phosphate"] },
  { brand_name: "NOW Foods", product_name: "B-50 Complex", formulation: "Full B-complex with 50mg/mcg per B vitamin", category: "B Vitamin", dosage_form: "capsule", typical_dosage: "1 capsule daily", key_ingredients: ["Thiamine", "Riboflavin", "Niacin", "B6", "Folate", "B12"] },

  // === CREATINE ===
  { brand_name: "Optimum Nutrition", product_name: "Micronized Creatine Powder", formulation: "5g creatine monohydrate per serving, unflavored", category: "Creatine", dosage_form: "powder", typical_dosage: "1 scoop (5g)", key_ingredients: ["Creatine Monohydrate"] },
  { brand_name: "Thorne", product_name: "Creatine", formulation: "5g creatine monohydrate, NSF-certified, micronized", category: "Creatine", dosage_form: "powder", typical_dosage: "1 scoop (5g)", key_ingredients: ["Creatine Monohydrate"] },

  // === COQ10 ===
  { brand_name: "Qunol", product_name: "Ultra CoQ10 100mg", formulation: "100mg ubiquinol, 3x better absorption", category: "CoQ10", dosage_form: "softgel", typical_dosage: "1 softgel daily", key_ingredients: ["Ubiquinol (CoQ10)"] },
  { brand_name: "Life Extension", product_name: "Super Ubiquinol CoQ10 200mg", formulation: "200mg ubiquinol with enhanced delivery", category: "CoQ10", dosage_form: "softgel", typical_dosage: "1 softgel daily", key_ingredients: ["Ubiquinol"] },

  // === ZINC ===
  { brand_name: "Garden of Life", product_name: "Vitamin Code Raw Zinc", formulation: "30mg whole food zinc with vitamin C", category: "Zinc", dosage_form: "capsule", typical_dosage: "1 capsule daily", key_ingredients: ["Raw Zinc", "Vitamin C"] },
  { brand_name: "NOW Foods", product_name: "Zinc Picolinate 50mg", formulation: "50mg zinc picolinate, high absorption", category: "Zinc", dosage_form: "capsule", typical_dosage: "1 capsule daily", key_ingredients: ["Zinc Picolinate"] },

  // === VITAMIN C ===
  { brand_name: "NOW Foods", product_name: "C-1000 with Rose Hips", formulation: "1000mg vitamin C with bioflavonoids and rose hips", category: "Vitamin C", dosage_form: "tablet", typical_dosage: "1 tablet daily", key_ingredients: ["Ascorbic Acid", "Rose Hips", "Citrus Bioflavonoids"] },
  { brand_name: "Liposomal", product_name: "Vitamin C 1000mg", formulation: "1000mg liposomal vitamin C, high bioavailability", category: "Vitamin C", dosage_form: "liquid", typical_dosage: "1 packet daily", key_ingredients: ["Sodium Ascorbate", "Phospholipids"] },

  // === HERBAL ===
  { brand_name: "KSM-66", product_name: "Ashwagandha Root Extract", formulation: "600mg full-spectrum ashwagandha, KSM-66 standardized", category: "Herbal", dosage_form: "capsule", typical_dosage: "1 capsule daily", key_ingredients: ["KSM-66 Ashwagandha Root Extract"] },
  { brand_name: "Gaia Herbs", product_name: "Turmeric Supreme Extra Strength", formulation: "Turmeric root extract, black pepper for absorption", category: "Herbal", dosage_form: "capsule", typical_dosage: "1 capsule daily", key_ingredients: ["Turmeric Root Extract", "Black Pepper"] },
  { brand_name: "Nature's Way", product_name: "Sambucus Elderberry Gummies", formulation: "100mg elderberry per gummy, immune support", category: "Herbal", dosage_form: "gummy", typical_dosage: "2 gummies daily", key_ingredients: ["Elderberry Extract", "Vitamin C", "Zinc"] },
  { brand_name: "Host Defense", product_name: "Lion's Mane Mushroom", formulation: "1000mg lion's mane mycelium, cognitive support", category: "Herbal", dosage_form: "capsule", typical_dosage: "2 capsules daily", key_ingredients: ["Lion's Mane Mycelium"] },
  { brand_name: "Rhodiola Rosea", product_name: "SHR-5 Extract", formulation: "500mg rhodiola standardized to 3% rosavins", category: "Herbal", dosage_form: "capsule", typical_dosage: "1 capsule daily", key_ingredients: ["Rhodiola Rosea Extract"] },

  // === COLLAGEN ===
  { brand_name: "Vital Proteins", product_name: "Collagen Peptides", formulation: "20g collagen peptides per serving, grass-fed", category: "Collagen", dosage_form: "powder", typical_dosage: "2 scoops (20g)", key_ingredients: ["Bovine Hide Collagen Peptides"] },
  { brand_name: "Sports Research", product_name: "Collagen Peptides Type I & III", formulation: "11g hydrolyzed collagen, grass-fed, keto-friendly", category: "Collagen", dosage_form: "powder", typical_dosage: "1 scoop (11g)", key_ingredients: ["Hydrolyzed Collagen"] },

  // === NAC / GLUTATHIONE ===
  { brand_name: "NOW Foods", product_name: "NAC 600mg", formulation: "600mg N-Acetyl Cysteine, free radical scavenger", category: "Amino Acid", dosage_form: "capsule", typical_dosage: "1 capsule 1-3x daily", key_ingredients: ["N-Acetyl Cysteine"] },
  { brand_name: "Jarrow Formulas", product_name: "Reduced Glutathione 500mg", formulation: "500mg reduced glutathione, intracellular antioxidant", category: "Amino Acid", dosage_form: "capsule", typical_dosage: "1 capsule daily", key_ingredients: ["Reduced Glutathione"] },

  // === IRON ===
  { brand_name: "Mega Food", product_name: "Blood Builder", formulation: "26mg gentle iron with B12, folate, vitamin C", category: "Iron", dosage_form: "tablet", typical_dosage: "1 tablet daily", key_ingredients: ["Iron", "Vitamin C", "Folate", "Vitamin B12"] },

  // === MELATONIN ===
  { brand_name: "Natrol", product_name: "Melatonin 5mg", formulation: "5mg melatonin, time-release, drug-free sleep aid", category: "Sleep", dosage_form: "tablet", typical_dosage: "1 tablet 20min before bed", key_ingredients: ["Melatonin"] },

  // === L-THEANINE ===
  { brand_name: "NOW Foods", product_name: "L-Theanine 200mg", formulation: "200mg L-theanine, promotes relaxation without drowsiness", category: "Amino Acid", dosage_form: "capsule", typical_dosage: "1 capsule 1-2x daily", key_ingredients: ["L-Theanine"] },

  // === ALPHA-LIPOIC ACID ===
  { brand_name: "Doctor's Best", product_name: "Alpha-Lipoic Acid 600mg", formulation: "600mg alpha-lipoic acid, antioxidant support", category: "Antioxidant", dosage_form: "capsule", typical_dosage: "1 capsule daily", key_ingredients: ["Alpha-Lipoic Acid"] },

  // === BERBERINE ===
  { brand_name: "Thorne", product_name: "Berberine 500mg", formulation: "500mg berberine HCl, metabolic support", category: "Herbal", dosage_form: "capsule", typical_dosage: "1 capsule 2-3x daily", key_ingredients: ["Berberine HCl"] },

  // === QUERCETIN ===
  { brand_name: "NOW Foods", product_name: "Quercetin with Bromelain", formulation: "800mg quercetin + 165mg bromelain per serving", category: "Antioxidant", dosage_form: "capsule", typical_dosage: "2 capsules daily", key_ingredients: ["Quercetin", "Bromelain"] },

  // === RESVERATROL ===
  { brand_name: "Life Extension", product_name: "Optimized Resveratrol", formulation: "250mg trans-resveratrol, longevity support", category: "Antioxidant", dosage_form: "capsule", typical_dosage: "1 capsule daily", key_ingredients: ["Trans-Resveratrol"] },
];
