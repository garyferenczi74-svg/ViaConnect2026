/**
 * Prompt 221 Phase 2 C1: curated allowlisted product detail URLs that
 * typically embed Supplement Facts (or clear dose labels). Used to raise
 * ingredient coverage beyond marketing/hub pages from open web search.
 * All hosts must already be on competitive_sources.
 */

export interface CompetitiveSkuSeed {
  url: string;
  category: string;
  brandHint: string;
  productHint: string;
}

/**
 * If productHint lacks a dose but the URL slug encodes one
 * (zinc-picolinate-50-mg, vitamin-d-3-softgels-5000-iu, zinc-15),
 * append that dose. Never invents — only digits present in the URL.
 */
export function augmentProductHintWithUrlDose(
  url: string,
  productHint: string
): string {
  const hint = (productHint || "").trim();
  if (/\b\d{1,5}(?:\.\d{1,3})?\s*(mg|mcg|ug|iu|IU|g|ml|mL)\b/.test(hint)) {
    return hint;
  }
  try {
    const path = new URL(url).pathname.toLowerCase();
    const explicit = path.match(
      /(?:^|[-_/])(\d{2,5})[-_]?((?:mg|mcg|iu|g))(?:[-_/.\?]|$)/i
    );
    if (explicit) {
      const unit =
        explicit[2].toLowerCase() === "iu" ? "IU" : explicit[2].toLowerCase();
      return `${hint} ${explicit[1]} ${unit}`.trim();
    }
    // Brand slug patterns: zinc-15, zinc-30, vitamin-d-5000 (IU implied for D)
    const zincIron = path.match(
      /(?:zinc|iron)[-_](\d{1,3})(?:\.html)?(?:\/|$)/i
    );
    if (zincIron) return `${hint} ${zincIron[1]} mg`.trim();
    const vitD = path.match(
      /(?:vitamin[-_]?d(?:3)?|d3?)[-_](\d{3,5})(?:\.html)?(?:\/|$)/i
    );
    if (vitD) return `${hint} ${vitD[1]} IU`.trim();
    const folate = path.match(/folate[-_](\d{2,4})(?:\.html)?(?:\/|$)/i);
    if (folate) return `${hint} ${folate[1]} mcg`.trim();
  } catch {
    /* open */
  }
  return hint;
}

/** Prefer /products/ paths; facts-only targets. */
export const COMPETITIVE_SKU_SEEDS: readonly CompetitiveSkuSeed[] = [
  {
    url: "https://www.quicksilverscientific.com/products/liposomal-glutathione",
    category: "advanced-formulas",
    brandHint: "Quicksilver Scientific",
    productHint: "Liposomal Glutathione 450 mg",
  },
  {
    url: "https://www.quicksilverscientific.com/products/liposomal-vitamin-c",
    category: "advanced-formulas",
    brandHint: "Quicksilver Scientific",
    productHint: "Liposomal Vitamin C 1000 mg",
  },
  {
    url: "https://www.pureencapsulations.com/b-complex-plus.html",
    category: "methylation-snp",
    brandHint: "Pure Encapsulations",
    productHint: "B-Complex Plus",
  },
  {
    url: "https://www.pureencapsulations.com/magnesium-glycinate.html",
    category: "base-formulations",
    brandHint: "Pure Encapsulations",
    productHint: "Magnesium Glycinate 120 mg",
  },
  {
    url: "https://www.seekinghealth.com/products/optimal-folate-lozenges",
    category: "methylation-snp",
    brandHint: "Seeking Health",
    productHint: "Optimal Folate 800 mcg",
  },
  {
    url: "https://www.seekinghealth.com/products/active-b12-with-l-5-mthf",
    category: "methylation-snp",
    brandHint: "Seeking Health",
    productHint: "Active B12 1000 mcg with L-5-MTHF",
  },
  {
    url: "https://www.nordicnaturals.com/consumers/ultimate-omega",
    category: "base-formulations",
    brandHint: "Nordic Naturals",
    productHint: "Ultimate Omega",
  },
  {
    url: "https://www.nordicnaturals.com/consumers/ultimate-omega-2x",
    category: "base-formulations",
    brandHint: "Nordic Naturals",
    productHint: "Ultimate Omega 2X",
  },
  {
    url: "https://www.nowfoods.com/products/minerals/magnesium-citrate-softgels",
    category: "base-formulations",
    brandHint: "NOW Foods",
    productHint: "Magnesium Citrate 400 mg",
  },
  {
    url: "https://www.nowfoods.com/products/vitamins/vitamin-d-3-softgels-5000-iu",
    category: "base-formulations",
    brandHint: "NOW Foods",
    productHint: "Vitamin D-3 5000 IU",
  },
  {
    url: "https://www.lifeextension.com/vitamins-supplements/item01253/super-omega-3-epa-dha-fish-oil-sesame-lignans-olive-extract",
    category: "advanced-formulas",
    brandHint: "Life Extension",
    productHint: "Super Omega-3",
  },
  {
    url: "https://www.lifeextension.com/vitamins-supplements/item00407/super-bio-curcumin-turmeric-extract",
    category: "advanced-formulas",
    brandHint: "Life Extension",
    productHint: "Super Bio-Curcumin Curcumin 400 mg",
  },
  {
    url: "https://bodybio.com/products/pc-phosphatidylcholine",
    category: "advanced-formulas",
    brandHint: "BodyBio",
    productHint: "PC Phosphatidylcholine",
  },
  {
    url: "https://www.designsforhealth.com/products/magnegel",
    category: "base-formulations",
    brandHint: "Designs for Health",
    productHint: "MagneGel Magnesium",
  },
  {
    url: "https://ritual.com/products/essential-for-women-18",
    category: "womens-health",
    brandHint: "Ritual",
    productHint: "Essential for Women 18+",
  },
  {
    url: "https://hostdefense.com/products/lions-mane",
    category: "functional-mushrooms",
    brandHint: "Host Defense",
    productHint: "Lion's Mane",
  },
  {
    url: "https://hostdefense.com/products/reishi",
    category: "functional-mushrooms",
    brandHint: "Host Defense",
    productHint: "Reishi",
  },
  {
    url: "https://hostdefense.com/products/turkey-tail",
    category: "functional-mushrooms",
    brandHint: "Host Defense",
    productHint: "Turkey Tail",
  },
  {
    url: "https://www.pureencapsulations.com/methylfolate.html",
    category: "methylation-snp",
    brandHint: "Pure Encapsulations",
    productHint: "Methylfolate 1000 mcg",
  },
  {
    url: "https://www.pureencapsulations.com/zinc-15.html",
    category: "base-formulations",
    brandHint: "Pure Encapsulations",
    productHint: "Zinc 15 mg",
  },
  {
    url: "https://www.pureencapsulations.com/vitamin-d3-5000-iu.html",
    category: "base-formulations",
    brandHint: "Pure Encapsulations",
    productHint: "Vitamin D3 5000 IU",
  },
  {
    url: "https://www.pureencapsulations.com/omega-3.html",
    category: "base-formulations",
    brandHint: "Pure Encapsulations",
    productHint: "O.N.E. Omega",
  },
  {
    url: "https://www.seekinghealth.com/products/histaminx",
    category: "advanced-formulas",
    brandHint: "Seeking Health",
    productHint: "HistaminX",
  },
  {
    url: "https://www.seekinghealth.com/products/optimal-multivitamin",
    category: "base-formulations",
    brandHint: "Seeking Health",
    productHint: "Optimal Multivitamin",
  },
  {
    url: "https://www.seekinghealth.com/products/homocysteex-plus",
    category: "methylation-snp",
    brandHint: "Seeking Health",
    productHint: "HomocysteX Plus",
  },
  {
    url: "https://www.nowfoods.com/products/minerals/zinc-picolinate-50-mg-veg-capsules",
    category: "base-formulations",
    brandHint: "NOW Foods",
    productHint: "Zinc Picolinate 50 mg",
  },
  {
    url: "https://www.nowfoods.com/products/vitamins/vitamin-c-1000-mg-with-rose-hips-tablets",
    category: "base-formulations",
    brandHint: "NOW Foods",
    productHint: "Vitamin C 1000 mg",
  },
  {
    url: "https://www.nowfoods.com/products/herbs/curcumin-turmeric-root-extract",
    category: "advanced-formulas",
    brandHint: "NOW Foods",
    productHint: "Curcumin Turmeric Root Extract",
  },
  {
    url: "https://www.lifeextension.com/vitamins-supplements/item01713/two-per-day-capsules",
    category: "base-formulations",
    brandHint: "Life Extension",
    productHint: "Two-Per-Day Capsules",
  },
  {
    url: "https://www.lifeextension.com/vitamins-supplements/item01936/magnesium-caps",
    category: "base-formulations",
    brandHint: "Life Extension",
    productHint: "Magnesium Caps 500 mg",
  },
  {
    url: "https://www.lifeextension.com/vitamins-supplements/item01718/vitamin-d3",
    category: "base-formulations",
    brandHint: "Life Extension",
    productHint: "Vitamin D3 5000 IU",
  },
  {
    url: "https://www.nordicnaturals.com/consumers/algae-omega",
    category: "base-formulations",
    brandHint: "Nordic Naturals",
    productHint: "Algae Omega",
  },
  {
    url: "https://www.nordicnaturals.com/consumers/proomega-2000",
    category: "base-formulations",
    brandHint: "Nordic Naturals",
    productHint: "ProOmega 2000",
  },
  {
    url: "https://www.quicksilverscientific.com/products/ultra-binder",
    category: "advanced-formulas",
    brandHint: "Quicksilver Scientific",
    productHint: "Ultra Binder",
  },
  {
    url: "https://www.quicksilverscientific.com/products/methyl-b-complex",
    category: "methylation-snp",
    brandHint: "Quicksilver Scientific",
    productHint: "Methyl B Complex",
  },
  {
    url: "https://www.momentous.com/products/creatine",
    category: "advanced-formulas",
    brandHint: "Momentous",
    productHint: "Creapure Creatine 5000 mg",
  },
  {
    url: "https://www.momentous.com/products/omega-3",
    category: "base-formulations",
    brandHint: "Momentous",
    productHint: "Omega-3",
  },
  {
    url: "https://www.jarrow.com/product/b-right",
    category: "methylation-snp",
    brandHint: "Jarrow Formulas",
    productHint: "B-Right",
  },
  {
    url: "https://www.jarrow.com/product/methyl-b-12",
    category: "methylation-snp",
    brandHint: "Jarrow Formulas",
    productHint: "Methyl B-12 1000 mcg",
  },
  {
    url: "https://www.gardenoflife.com/products/vitamin-code-raw-d3",
    category: "base-formulations",
    brandHint: "Garden of Life",
    productHint: "Vitamin Code RAW D3 2000 IU",
  },
  {
    url: "https://us.foursigmatic.com/products/mushroom-coffee-lions-mane-chaga",
    category: "functional-mushrooms",
    brandHint: "Four Sigmatic",
    productHint: "Mushroom Coffee Lion's Mane Chaga",
  },
  {
    url: "https://www.designsforhealth.com/products/vitamin-d-supreme",
    category: "base-formulations",
    brandHint: "Designs for Health",
    productHint: "Vitamin D Supreme 5000 IU",
  },
  {
    url: "https://www.designsforhealth.com/products/omegavail-ultra",
    category: "base-formulations",
    brandHint: "Designs for Health",
    productHint: "OmegAvail Ultra",
  },
  {
    url: "https://ritual.com/products/essential-prenatal",
    category: "womens-health",
    brandHint: "Ritual",
    productHint: "Essential Prenatal",
  },
  {
    url: "https://www.livonlabs.com/products/lypo-spheric-vitamin-c",
    category: "advanced-formulas",
    brandHint: "LivOn Labs",
    productHint: "Lypo-Spheric Vitamin C 1000 mg",
  },
  {
    url: "https://www.lifeextension.com/vitamins-supplements/item01803/super-k",
    category: "base-formulations",
    brandHint: "Life Extension",
    productHint: "Super K",
  },
  {
    url: "https://www.lifeextension.com/vitamins-supplements/item01561/super-ubiquinol-coq10-with-enhanced-mitochondrial-support",
    category: "advanced-formulas",
    brandHint: "Life Extension",
    productHint: "Super Ubiquinol CoQ10 100 mg",
  },
  {
    url: "https://www.pureencapsulations.com/vitamin-d3-10000-iu.html",
    category: "base-formulations",
    brandHint: "Pure Encapsulations",
    productHint: "Vitamin D3 10,000 IU",
  },
  {
    url: "https://www.pureencapsulations.com/zinc-30.html",
    category: "base-formulations",
    brandHint: "Pure Encapsulations",
    productHint: "Zinc 30 mg",
  },
  {
    url: "https://www.seekinghealth.com/products/optimal-magnesium",
    category: "base-formulations",
    brandHint: "Seeking Health",
    productHint: "Optimal Magnesium 150 mg",
  },
  {
    url: "https://www.seekinghealth.com/products/optimal-vitamin-d3-k2-drops",
    category: "base-formulations",
    brandHint: "Seeking Health",
    productHint: "Optimal Vitamin D3 K2 Drops",
  },
  {
    url: "https://www.lifeextension.com/vitamins-supplements/item02334/bioactive-complete-b-complex",
    category: "methylation-snp",
    brandHint: "Life Extension",
    productHint: "BioActive Complete B-Complex",
  },
  {
    url: "https://www.lifeextension.com/vitamins-supplements/item01913/magnesium-caps",
    category: "base-formulations",
    brandHint: "Life Extension",
    productHint: "Magnesium Caps 500 mg",
  },
  {
    url: "https://www.nowfoods.com/products/supplements/magnesium-citrate-pure-powder",
    category: "base-formulations",
    brandHint: "NOW Foods",
    productHint: "Magnesium Citrate Pure Powder",
  },
  {
    url: "https://www.nordicnaturals.com/consumers/vitamin-d3-1000",
    category: "base-formulations",
    brandHint: "Nordic Naturals",
    productHint: "Vitamin D3 1000 IU",
  },
  {
    url: "https://www.quicksilverscientific.com/products/liposomal-coq10",
    category: "advanced-formulas",
    brandHint: "Quicksilver Scientific",
    productHint: "Liposomal CoQ10",
  },
  {
    url: "https://www.quicksilverscientific.com/products/liposomal-vitamin-d3-k2",
    category: "base-formulations",
    brandHint: "Quicksilver Scientific",
    productHint: "Liposomal Vitamin D3 K2",
  },
  {
    url: "https://www.quicksilverscientific.com/products/liposomal-curcumin",
    category: "advanced-formulas",
    brandHint: "Quicksilver Scientific",
    productHint: "Liposomal Curcumin",
  },
  {
    url: "https://www.quicksilverscientific.com/products/liposomal-ashwagandha",
    category: "advanced-formulas",
    brandHint: "Quicksilver Scientific",
    productHint: "Liposomal Ashwagandha",
  },
  {
    url: "https://www.quicksilverscientific.com/products/liposomal-berberine",
    category: "advanced-formulas",
    brandHint: "Quicksilver Scientific",
    productHint: "Liposomal Berberine",
  },
  {
    url: "https://www.quicksilverscientific.com/products/liver-sauce",
    category: "advanced-formulas",
    brandHint: "Quicksilver Scientific",
    productHint: "Liver Sauce",
  },
  {
    url: "https://www.quicksilverscientific.com/products/imd-intestinal-cleanse",
    category: "advanced-formulas",
    brandHint: "Quicksilver Scientific",
    productHint: "IMD Intestinal Cleanse",
  },
  {
    url: "https://www.quicksilverscientific.com/products/nad-gold",
    category: "advanced-formulas",
    brandHint: "Quicksilver Scientific",
    productHint: "NAD+ Gold",
  },
  {
    url: "https://www.quicksilverscientific.com/products/nad-platinum",
    category: "advanced-formulas",
    brandHint: "Quicksilver Scientific",
    productHint: "NAD+ Platinum",
  },
  {
    url: "https://www.quicksilverscientific.com/products/nmn",
    category: "advanced-formulas",
    brandHint: "Quicksilver Scientific",
    productHint: "NMN",
  },
  {
    url: "https://www.quicksilverscientific.com/products/quinton-hypertonic",
    category: "advanced-formulas",
    brandHint: "Quicksilver Scientific",
    productHint: "Quinton Hypertonic",
  },
  {
    url: "https://www.quicksilverscientific.com/products/phosphatidylcholine",
    category: "advanced-formulas",
    brandHint: "Quicksilver Scientific",
    productHint: "Phosphatidylcholine",
  },
  {
    url: "https://www.pureencapsulations.com/o-n-e-multivitamin.html",
    category: "base-formulations",
    brandHint: "Pure Encapsulations",
    productHint: "O.N.E. Multivitamin",
  },
  {
    url: "https://www.pureencapsulations.com/ubiquinol-qh-100-mg.html",
    category: "advanced-formulas",
    brandHint: "Pure Encapsulations",
    productHint: "Ubiquinol-QH 100 mg",
  },
  {
    url: "https://www.pureencapsulations.com/curcumasorb.html",
    category: "advanced-formulas",
    brandHint: "Pure Encapsulations",
    productHint: "CurcumaSorb",
  },
  {
    url: "https://www.pureencapsulations.com/epa-dha-essentials.html",
    category: "base-formulations",
    brandHint: "Pure Encapsulations",
    productHint: "EPA DHA essentials",
  },
  {
    url: "https://www.pureencapsulations.com/n-acetyl-l-cysteine.html",
    category: "advanced-formulas",
    brandHint: "Pure Encapsulations",
    productHint: "N-Acetyl-L-Cysteine 600 mg",
  },
  {
    url: "https://www.pureencapsulations.com/liposomal-glutathione.html",
    category: "advanced-formulas",
    brandHint: "Pure Encapsulations",
    productHint: "Liposomal Glutathione",
  },
  {
    url: "https://ritual.com/products/essential-for-women-50",
    category: "womens-health",
    brandHint: "Ritual",
    productHint: "Essential for Women 50+",
  },
  {
    url: "https://ritual.com/products/essential-for-men-18",
    category: "base-formulations",
    brandHint: "Ritual",
    productHint: "Essential for Men 18+",
  },
  {
    url: "https://ritual.com/products/essential-for-men-50",
    category: "base-formulations",
    brandHint: "Ritual",
    productHint: "Essential for Men 50+",
  },
  {
    url: "https://ritual.com/products/synbiotic-plus",
    category: "advanced-formulas",
    brandHint: "Ritual",
    productHint: "Synbiotic+",
  },
  {
    url: "https://ritual.com/products/essential-postnatal",
    category: "womens-health",
    brandHint: "Ritual",
    productHint: "Essential Postnatal",
  },
  {
    url: "https://ritual.com/products/natal-duo",
    category: "womens-health",
    brandHint: "Ritual",
    productHint: "Natal Duo",
  },
  {
    url: "https://ritual.com/products/dha",
    category: "base-formulations",
    brandHint: "Ritual",
    productHint: "DHA+",
  },
  {
    url: "https://drinkag1.com/products/ag1",
    category: "base-formulations",
    brandHint: "AG1",
    productHint: "AG1",
  },
  {
    url: "https://drinkag1.com/products/ag1-travel-packs",
    category: "base-formulations",
    brandHint: "AG1",
    productHint: "AG1 Travel Packs",
  },

  // --- Allowlist expand 2026-08-17 (Gary-approved) ---
  {
    url: "https://www.codeage.com/products/liposomal-glutathione",
    category: "advanced-formulas",
    brandHint: "Codeage",
    productHint: "Liposomal Glutathione",
  },
  {
    url: "https://www.codeage.com/products/liposomal-vitamin-c",
    category: "advanced-formulas",
    brandHint: "Codeage",
    productHint: "Liposomal Vitamin C",
  },
  {
    url: "https://www.codeage.com/products/nad",
    category: "advanced-formulas",
    brandHint: "Codeage",
    productHint: "NAD+",
  },
  {
    url: "https://www.metagenics.com/products/omega-genics-epa-dha-1000",
    category: "base-formulations",
    brandHint: "Metagenics",
    productHint: "OmegaGenics EPA-DHA 1000",
  },
  {
    url: "https://www.metagenics.com/products/d3-5000",
    category: "base-formulations",
    brandHint: "Metagenics",
    productHint: "D3 5000 IU",
  },
  {
    url: "https://www.metagenics.com/products/magnesium-glycinate",
    category: "base-formulations",
    brandHint: "Metagenics",
    productHint: "Magnesium Glycinate",
  },
  {
    url: "https://organika.com/products/enhanced-collagen",
    category: "base-formulations",
    brandHint: "Organika",
    productHint: "Enhanced Collagen",
  },
  {
    url: "https://organika.com/products/magnesium-bisglycinate",
    category: "base-formulations",
    brandHint: "Organika",
    productHint: "Magnesium Bisglycinate",
  },
  {
    url: "https://www.aor.ca/products/magnesium-glycinate",
    category: "base-formulations",
    brandHint: "AOR",
    productHint: "Magnesium Glycinate",
  },
  {
    url: "https://www.aor.ca/products/ortho-core",
    category: "base-formulations",
    brandHint: "AOR",
    productHint: "Ortho Core",
  },
  {
    url: "https://canprev.ca/products/magnesium-bis-glycinate-200",
    category: "base-formulations",
    brandHint: "CanPrev",
    productHint: "Magnesium Bis-Glycinate 200 mg",
  },
  {
    url: "https://canprev.ca/products/iron-bis-glycinate-20",
    category: "base-formulations",
    brandHint: "CanPrev",
    productHint: "Iron Bis-Glycinate 20 mg",
  },
  {
    url: "https://www.solgar.com/products/vitamin-d3-5000-iu",
    category: "base-formulations",
    brandHint: "Solgar",
    productHint: "Vitamin D3 5000 IU",
  },
  {
    url: "https://www.solgar.com/products/earth-source-multi-nutrient",
    category: "base-formulations",
    brandHint: "Solgar",
    productHint: "Earth Source Multi-Nutrient",
  },
  {
    url: "https://www.orthomolecularproducts.com/product/reacted-magnesium",
    category: "base-formulations",
    brandHint: "Ortho Molecular Products",
    productHint: "Reacted Magnesium",
  },
  {
    url: "https://www.orthomolecularproducts.com/product/vitamin-d-k2",
    category: "base-formulations",
    brandHint: "Ortho Molecular Products",
    productHint: "Vitamin D + K2",
  },
  {
    url: "https://www.integrativepro.com/products/cortisol-manager",
    category: "advanced-formulas",
    brandHint: "Integrative Therapeutics",
    productHint: "Cortisol Manager",
  },
  {
    url: "https://www.integrativepro.com/products/theracurmin-hp",
    category: "advanced-formulas",
    brandHint: "Integrative Therapeutics",
    productHint: "Theracurmin HP",
  },
  {
    url: "https://www.doctorsbest.com/products/high-absorption-magnesium",
    category: "base-formulations",
    brandHint: "Doctor's Best",
    productHint: "High Absorption Magnesium",
  },
  {
    url: "https://www.doctorsbest.com/products/vitamin-d3-5000-iu",
    category: "base-formulations",
    brandHint: "Doctor's Best",
    productHint: "Vitamin D3 5000 IU",
  },
  {
    url: "https://renuebyscience.com/products/pure-nmn-sublingual-powder",
    category: "advanced-formulas",
    brandHint: "Renue by Science",
    productHint: "Pure NMN Sublingual Powder",
  },
  {
    url: "https://renuebyscience.com/products/liposomal-nad",
    category: "advanced-formulas",
    brandHint: "Renue by Science",
    productHint: "Liposomal NAD+",
  },
  {
    url: "https://seed.com/products/ds-01",
    category: "advanced-formulas",
    brandHint: "Seed Health",
    productHint: "DS-01 Daily Synbiotic",
  },
  {
    url: "https://seed.com/products/pds-08",
    category: "advanced-formulas",
    brandHint: "Seed Health",
    productHint: "PDS-08 Pediatric Synbiotic",
  },
  {
    url: "https://www.sisu.com/products/ester-c",
    category: "base-formulations",
    brandHint: "SISU",
    productHint: "Ester-C",
  },
  {
    url: "https://im8health.com/products/daily-ultimate-essentials",
    category: "base-formulations",
    brandHint: "IM8 Health",
    productHint: "Daily Ultimate Essentials",
  },
  {
    url: "https://www.innosupps.com/products/glp-1",
    category: "advanced-formulas",
    brandHint: "Inno Supps",
    productHint: "GLP-1 Support",
  },

  // Cymbiotika Canada (https://cymbiotika.ca/pages/supplement-guide)
  {
    url: "https://cymbiotika.ca/products/b12",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Vitamin B12 + B6",
  },
  {
    url: "https://cymbiotika.ca/products/brain-complex",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Brain Complex",
  },
  {
    url: "https://cymbiotika.ca/products/creatine",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Advanced Creatine",
  },
  {
    url: "https://cymbiotika.ca/products/d3",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Vitamin D3 + K2 + CoQ10",
  },
  {
    url: "https://cymbiotika.ca/products/glutathione",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Glutathione",
  },
  {
    url: "https://cymbiotika.ca/products/golden-mind",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Golden Mind",
  },
  {
    url: "https://cymbiotika.ca/products/inflammatory-health",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Inflammatory Health",
  },
  {
    url: "https://cymbiotika.ca/products/irish-sea-moss",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Irish Sea Moss",
  },
  {
    url: "https://cymbiotika.ca/products/liposomal-elderberry-defense",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Elderberry",
  },
  {
    url: "https://cymbiotika.ca/products/liquid-colostrum",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liquid Colostrum",
  },
  {
    url: "https://cymbiotika.ca/products/magnesium-complex",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Magnesium Complex",
  },
  {
    url: "https://cymbiotika.ca/products/metabolic-health",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Metabolic Health",
  },
  {
    url: "https://cymbiotika.ca/products/molecular-hydrogen",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Molecular Hydrogen",
  },
  {
    url: "https://cymbiotika.ca/products/nad",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal NAD+",
  },
  {
    url: "https://cymbiotika.ca/products/organic-longevity-mushrooms",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Longevity Mushrooms",
  },
  {
    url: "https://cymbiotika.ca/products/parax",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "ParaX",
  },
  {
    url: "https://cymbiotika.ca/products/shilajit-liquid-complex",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Shilajit Liquid Complex",
  },
  {
    url: "https://cymbiotika.ca/products/shilajit-normal-jar",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Mineral Shilajit",
  },
  {
    url: "https://cymbiotika.ca/products/sleep",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Sleep",
  },
  {
    url: "https://cymbiotika.ca/products/supergreens",
    category: "base-formulations",
    brandHint: "Cymbiotika",
    productHint: "Super Greens",
  },
  {
    url: "https://cymbiotika.ca/products/the-omega",
    category: "base-formulations",
    brandHint: "Cymbiotika",
    productHint: "The Omega",
  },
  {
    url: "https://cymbiotika.ca/products/vitamin-c",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Vitamin C",
  },

  // Cymbiotika US (https://cymbiotika.com/pages/supplement-guide)
  {
    url: "https://cymbiotika.com/products/b12",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Vitamin B12 + B6",
  },
  {
    url: "https://cymbiotika.com/products/brain-complex",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Brain Complex",
  },
  {
    url: "https://cymbiotika.com/products/creatine",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Advanced Creatine",
  },
  {
    url: "https://cymbiotika.com/products/d3",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Vitamin D3 + K2 + CoQ10",
  },
  {
    url: "https://cymbiotika.com/products/glutathione",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Glutathione",
  },
  {
    url: "https://cymbiotika.com/products/inflammatory-health",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Inflammatory Health",
  },
  {
    url: "https://cymbiotika.com/products/irish-sea-moss",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Irish Sea Moss",
  },
  {
    url: "https://cymbiotika.com/products/liposomal-elderberry-defense",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Elderberry",
  },
  {
    url: "https://cymbiotika.com/products/liquid-colostrum",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liquid Colostrum",
  },
  {
    url: "https://cymbiotika.com/products/liver-health",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liver Health+",
  },
  {
    url: "https://cymbiotika.com/products/magnesium-complex",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Magnesium Complex",
  },
  {
    url: "https://cymbiotika.com/products/metabolic-health",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Metabolic Health",
  },
  {
    url: "https://cymbiotika.com/products/molecular-hydrogen",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Molecular Hydrogen",
  },
  {
    url: "https://cymbiotika.com/products/nad",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal NAD+",
  },
  {
    url: "https://cymbiotika.com/products/parax",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "ParaX",
  },
  {
    url: "https://cymbiotika.com/products/shilajit-liquid-complex",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Shilajit Liquid Complex",
  },
  {
    url: "https://cymbiotika.com/products/shilajit-normal-jar",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Mineral Shilajit",
  },
  {
    url: "https://cymbiotika.com/products/sleep",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Sleep",
  },
  {
    url: "https://cymbiotika.com/products/supergreens",
    category: "base-formulations",
    brandHint: "Cymbiotika",
    productHint: "Super Greens",
  },
  {
    url: "https://cymbiotika.com/products/the-omega",
    category: "base-formulations",
    brandHint: "Cymbiotika",
    productHint: "The Omega",
  },
  {
    url: "https://cymbiotika.com/products/vitamin-c",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Vitamin C",
  },

  // Thorne catalog from https://www.thorne.com/products (+ methylation/multi categories)

  // Thorne catalog from https://www.thorne.com/products (+ methylation/multi categories)

  // Thorne catalog from https://www.thorne.com/products (+ methylation/multi categories)

  // Thorne catalog from https://www.thorne.com/products (+ methylation/multi categories)

  {
    url: "https://www.thorne.com/products/dp/3-k-complete",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "3 K Complete",
  },
  {
    url: "https://www.thorne.com/products/dp/5-hydroxytryptophan",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "5 Hydroxytryptophan",
  },
  {
    url: "https://www.thorne.com/products/dp/5-mthf-1-mg",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "5 Mthf 1 Mg",
  },
  {
    url: "https://www.thorne.com/products/dp/5-mthf-1mg-90",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "5 Mthf 1Mg 90",
  },
  {
    url: "https://www.thorne.com/products/dp/5-mthf-5-mg",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "5 Mthf 5 Mg",
  },
  {
    url: "https://www.thorne.com/products/dp/adrenal-cortex",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Adrenal Cortex",
  },
  {
    url: "https://www.thorne.com/products/dp/advanced-dha",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Advanced Dha",
  },
  {
    url: "https://www.thorne.com/products/dp/advanced-pre-workout-rainbow-sherbet-flavor",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Advanced Pre Workout Rainbow Sherbet Flavor",
  },
  {
    url: "https://www.thorne.com/products/dp/advanced-testosterone-support",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Advanced Testosterone Support",
  },
  {
    url: "https://www.thorne.com/products/dp/amino-complex-berry",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Amino Complex Berry",
  },
  {
    url: "https://www.thorne.com/products/dp/amino-complex-berry-sp641p",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Amino Complex Berry Sp641P",
  },
  {
    url: "https://www.thorne.com/products/dp/amino-complex-lemon",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Amino Complex Lemon",
  },
  {
    url: "https://www.thorne.com/products/dp/amino-complex-lemon-sp637p",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Amino Complex Lemon Sp637P",
  },
  {
    url: "https://www.thorne.com/products/dp/ar-encap-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Ar Encap Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/ascorbic-acid",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Ascorbic Acid",
  },
  {
    url: "https://www.thorne.com/products/dp/ashwagandha",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Ashwagandha",
  },
  {
    url: "https://www.thorne.com/products/dp/b-complex-12",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "B Complex 12",
  },
  {
    url: "https://www.thorne.com/products/dp/b-complex-6",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "B Complex 6",
  },
  {
    url: "https://www.thorne.com/products/dp/bacillus-coagulans",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Bacillus Coagulans",
  },
  {
    url: "https://www.thorne.com/products/dp/basic-b-complex",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "Basic B Complex",
  },
  {
    url: "https://www.thorne.com/products/dp/basic-nutrients-2-day",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Basic Nutrients 2 Day",
  },
  {
    url: "https://www.thorne.com/products/dp/basic-nutrients-2-day-120",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Basic Nutrients 2 Day 120",
  },
  {
    url: "https://www.thorne.com/products/dp/basic-nutrients-2-day-vm2nc",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Basic Nutrients 2 Day Vm2Nc",
  },
  {
    url: "https://www.thorne.com/products/dp/basic-prenatal",
    category: "womens-health",
    brandHint: "Thorne",
    productHint: "Basic Prenatal",
  },
  {
    url: "https://www.thorne.com/products/dp/berbercap-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Berbercap Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/berberine-500",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Berberine 500",
  },
  {
    url: "https://www.thorne.com/products/dp/beta-alanine-sr",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Beta Alanine Sr",
  },
  {
    url: "https://www.thorne.com/products/dp/betaine-hcl-pepsin-225-s",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Betaine Hcl Pepsin 225 S",
  },
  {
    url: "https://www.thorne.com/products/dp/bio-gest-reg-60-s-1",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Bio Gest Reg 60 S 1",
  },
  {
    url: "https://www.thorne.com/products/dp/biotin-8",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Biotin 8",
  },
  {
    url: "https://www.thorne.com/products/dp/boswellia-phytosome",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Boswellia Phytosome",
  },
  {
    url: "https://www.thorne.com/products/dp/brain-factors",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Brain Factors",
  },
  {
    url: "https://www.thorne.com/products/dp/buffered-c-powder",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Buffered C Powder",
  },
  {
    url: "https://www.thorne.com/products/dp/calcium-magnesium-malate",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Calcium Magnesium Malate",
  },
  {
    url: "https://www.thorne.com/products/dp/carnityl-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Carnityl Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/cdn-dipan",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Cdn Dipan",
  },
  {
    url: "https://www.thorne.com/products/dp/choleast-900",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Choleast 900",
  },
  {
    url: "https://www.thorne.com/products/dp/choleast-trade",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Choleast Trade",
  },
  {
    url: "https://www.thorne.com/products/dp/chromium-picolinate",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Chromium Picolinate",
  },
  {
    url: "https://www.thorne.com/products/dp/clear-focus",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Clear Focus",
  },
  {
    url: "https://www.thorne.com/products/dp/cognitive-vitality",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Cognitive Vitality",
  },
  {
    url: "https://www.thorne.com/products/dp/collagen-fit",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Collagen Fit",
  },
  {
    url: "https://www.thorne.com/products/dp/collagen-plus",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Collagen Plus",
  },
  {
    url: "https://www.thorne.com/products/dp/complete-biotic",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Complete Biotic",
  },
  {
    url: "https://www.thorne.com/products/dp/copper-bisglycinate",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Copper Bisglycinate",
  },
  {
    url: "https://www.thorne.com/products/dp/creatine",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Creatine",
  },
  {
    url: "https://www.thorne.com/products/dp/creatine-alpha-gpc",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Creatine Alpha Gpc",
  },
  {
    url: "https://www.thorne.com/products/dp/creatine-bcaas-peach-mango-flavored",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Creatine Bcaas Peach Mango Flavored",
  },
  {
    url: "https://www.thorne.com/products/dp/creatine-pineapple-orange-flavored",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Creatine Pineapple Orange Flavored",
  },
  {
    url: "https://www.thorne.com/products/dp/creatine-sf903p",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Creatine Sf903P",
  },
  {
    url: "https://www.thorne.com/products/dp/creatine-sf904",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Creatine Sf904",
  },
  {
    url: "https://www.thorne.com/products/dp/creatine-strawberry-flavored",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Creatine Strawberry Flavored",
  },
  {
    url: "https://www.thorne.com/products/dp/crucera-sgs",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Crucera Sgs",
  },
  {
    url: "https://www.thorne.com/products/dp/cysteplus-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Cysteplus Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/d-1-000-180",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "D 1 000 180",
  },
  {
    url: "https://www.thorne.com/products/dp/d-10-000",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "D 10 000",
  },
  {
    url: "https://www.thorne.com/products/dp/d-1000-vitamin-d-capsule",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "D 1000 Vitamin D Capsule",
  },
  {
    url: "https://www.thorne.com/products/dp/d-5-000-120",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "D 5 000 120",
  },
  {
    url: "https://www.thorne.com/products/dp/d-5-000-vitamin-d-capsule",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "D 5 000 Vitamin D Capsule",
  },
  {
    url: "https://www.thorne.com/products/dp/daily-electrolytes-blackberry-flavored-drink-mix",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Daily Electrolytes Blackberry Flavored Drink Mix",
  },
  {
    url: "https://www.thorne.com/products/dp/daily-electrolytes-blood-orange-flavored-drink-mix",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Daily Electrolytes Blood Orange Flavored Drink Mix",
  },
  {
    url: "https://www.thorne.com/products/dp/daily-electrolytes-grapefruit-flavored-drink-mix",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Daily Electrolytes Grapefruit Flavored Drink Mix",
  },
  {
    url: "https://www.thorne.com/products/dp/daily-electrolytes-mangolimeade-flavored-drink-mix",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Daily Electrolytes Mangolimeade Flavored Drink Mix",
  },
  {
    url: "https://www.thorne.com/products/dp/daily-electrolytes-strawberry-lem-flavor-drink-mix",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Daily Electrolytes Strawberry Lem Flavor Drink Mix",
  },
  {
    url: "https://www.thorne.com/products/dp/daily-electrolytes-watermelon-flavored-drink-mix",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Daily Electrolytes Watermelon Flavored Drink Mix",
  },
  {
    url: "https://www.thorne.com/products/dp/daily-greens-plus",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Daily Greens Plus",
  },
  {
    url: "https://www.thorne.com/products/dp/deep-sleep-complex",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Deep Sleep Complex",
  },
  {
    url: "https://www.thorne.com/products/dp/deproloft-hf",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Deproloft Hf",
  },
  {
    url: "https://www.thorne.com/products/dp/dicalcium-malate",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Dicalcium Malate",
  },
  {
    url: "https://www.thorne.com/products/dp/dim-crucera",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Dim Crucera",
  },
  {
    url: "https://www.thorne.com/products/dp/dipan-9-reg-60-s-2",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Dipan 9 Reg 60 S 2",
  },
  {
    url: "https://www.thorne.com/products/dp/double-strength-zinc-picolinate-60-s",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Double Strength Zinc Picolinate 60 S",
  },
  {
    url: "https://www.thorne.com/products/dp/double-strength-zinc-picolinate-60-s-1",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Double Strength Zinc Picolinate 60 S 1",
  },
  {
    url: "https://www.thorne.com/products/dp/enteromend",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Enteromend",
  },
  {
    url: "https://www.thorne.com/products/dp/extra-nutrients",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Extra Nutrients",
  },
  {
    url: "https://www.thorne.com/products/dp/ferrasorb-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Ferrasorb Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/fibermend-trade",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Fibermend Trade",
  },
  {
    url: "https://www.thorne.com/products/dp/floramend-prime-probiotic",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Floramend Prime Probiotic",
  },
  {
    url: "https://www.thorne.com/products/dp/florasport-20b",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Florasport 20B",
  },
  {
    url: "https://www.thorne.com/products/dp/formula-sf722-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Formula Sf722 Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/gi-encap-reg-1",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Gi Encap Reg 1",
  },
  {
    url: "https://www.thorne.com/products/dp/gingerpro",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Gingerpro",
  },
  {
    url: "https://www.thorne.com/products/dp/ginseng-plus",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Ginseng Plus",
  },
  {
    url: "https://www.thorne.com/products/dp/glucosamine-chondroitin",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Glucosamine Chondroitin",
  },
  {
    url: "https://www.thorne.com/products/dp/glutathione-sr",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Glutathione Sr",
  },
  {
    url: "https://www.thorne.com/products/dp/glycine",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Glycine",
  },
  {
    url: "https://www.thorne.com/products/dp/green-tea-phytosome",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Green Tea Phytosome",
  },
  {
    url: "https://www.thorne.com/products/dp/iron-bisglycinate",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Iron Bisglycinate",
  },
  {
    url: "https://www.thorne.com/products/dp/iso-phos-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Iso Phos Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/l-glutamine",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "L Glutamine",
  },
  {
    url: "https://www.thorne.com/products/dp/l-glutamine-powder",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "L Glutamine Powder",
  },
  {
    url: "https://www.thorne.com/products/dp/l-lysine",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "L Lysine",
  },
  {
    url: "https://www.thorne.com/products/dp/liver-cleanse",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Liver Cleanse",
  },
  {
    url: "https://www.thorne.com/products/dp/magnesium-bisglycinate",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Magnesium Bisglycinate",
  },
  {
    url: "https://www.thorne.com/products/dp/magnesium-bisglycinate-m204p",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Magnesium Bisglycinate M204P",
  },
  {
    url: "https://www.thorne.com/products/dp/magnesium-citramate",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Magnesium Citramate",
  },
  {
    url: "https://www.thorne.com/products/dp/magnesium-citrate-m286",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Magnesium Citrate M286",
  },
  {
    url: "https://www.thorne.com/products/dp/magnesium-glycinate",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Magnesium Glycinate",
  },
  {
    url: "https://www.thorne.com/products/dp/magnesium-glycinate-180",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Magnesium Glycinate 180",
  },
  {
    url: "https://www.thorne.com/products/dp/mediclear-plus-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Mediclear Plus Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/mediclear-sgs-trade",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Mediclear Sgs Trade",
  },
  {
    url: "https://www.thorne.com/products/dp/mediclear-sgs-vanilla",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Mediclear Sgs Vanilla",
  },
  {
    url: "https://www.thorne.com/products/dp/melaton-3-trade",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Melaton 3 Trade",
  },
  {
    url: "https://www.thorne.com/products/dp/melaton-5-trade",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Melaton 5 Trade",
  },
  {
    url: "https://www.thorne.com/products/dp/memoractiv-trade",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Memoractiv Trade",
  },
  {
    url: "https://www.thorne.com/products/dp/mens-multi-50",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Mens Multi 50",
  },
  {
    url: "https://www.thorne.com/products/dp/meriva-500-sf-120",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Meriva 500 Sf 120",
  },
  {
    url: "https://www.thorne.com/products/dp/meriva-500-sf-60",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Meriva 500 Sf 60",
  },
  {
    url: "https://www.thorne.com/products/dp/meriva-500-sf-nsf",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Meriva 500 Sf Nsf",
  },
  {
    url: "https://www.thorne.com/products/dp/meriva-sf",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Meriva Sf",
  },
  {
    url: "https://www.thorne.com/products/dp/metabolic-health",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Metabolic Health",
  },
  {
    url: "https://www.thorne.com/products/dp/methyl-guard-plus-reg",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "Methyl Guard Plus Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/methyl-guard-reg",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "Methyl Guard Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/methylcobalamin",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "Methylcobalamin",
  },
  {
    url: "https://www.thorne.com/products/dp/multi-vitamin-elite",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Multi Vitamin Elite",
  },
  {
    url: "https://www.thorne.com/products/dp/multi-vitamin-elite-vm114nc",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Multi Vitamin Elite Vm114Nc",
  },
  {
    url: "https://www.thorne.com/products/dp/nac-180",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Nac 180",
  },
  {
    url: "https://www.thorne.com/products/dp/niacel-400",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Niacel 400",
  },
  {
    url: "https://www.thorne.com/products/dp/niacinamide",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Niacinamide",
  },
  {
    url: "https://www.thorne.com/products/dp/omega-3-w-coq10",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Omega 3 W Coq10",
  },
  {
    url: "https://www.thorne.com/products/dp/omega-superb-ndash-lemon-berry",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Omega Superb Ndash Lemon Berry",
  },
  {
    url: "https://www.thorne.com/products/dp/oscap",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Oscap",
  },
  {
    url: "https://www.thorne.com/products/dp/ovarian-care",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Ovarian Care",
  },
  {
    url: "https://www.thorne.com/products/dp/perfusia-plus-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Perfusia Plus Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/perfusia-sr-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Perfusia Sr Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/perimenopause-complete",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Perimenopause Complete",
  },
  {
    url: "https://www.thorne.com/products/dp/pharmagaba-100",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Pharmagaba 100",
  },
  {
    url: "https://www.thorne.com/products/dp/pharmagaba-250",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Pharmagaba 250",
  },
  {
    url: "https://www.thorne.com/products/dp/phosphatidyl-choline",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Phosphatidyl Choline",
  },
  {
    url: "https://www.thorne.com/products/dp/phytisone-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Phytisone Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/phytoprofen-reg-60-s",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Phytoprofen Reg 60 S",
  },
  {
    url: "https://www.thorne.com/products/dp/phytoprofenvet",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Phytoprofenvet",
  },
  {
    url: "https://www.thorne.com/products/dp/plant-protein-chocolate-flavored",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Plant Protein Chocolate Flavored",
  },
  {
    url: "https://www.thorne.com/products/dp/plant-protein-vanilla",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Plant Protein Vanilla",
  },
  {
    url: "https://www.thorne.com/products/dp/polyresveratrol-sr-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Polyresveratrol Sr Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/potassium-citrate",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Potassium Citrate",
  },
  {
    url: "https://www.thorne.com/products/dp/prenatal-dha",
    category: "womens-health",
    brandHint: "Thorne",
    productHint: "Prenatal Dha",
  },
  {
    url: "https://www.thorne.com/products/dp/pro-resolving-mediators",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Pro Resolving Mediators",
  },
  {
    url: "https://www.thorne.com/products/dp/protein-optimizer",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Protein Optimizer",
  },
  {
    url: "https://www.thorne.com/products/dp/pyridoxal-5-phosphate-60-s-1",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Pyridoxal 5 Phosphate 60 S 1",
  },
  {
    url: "https://www.thorne.com/products/dp/q-best-100",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Q Best 100",
  },
  {
    url: "https://www.thorne.com/products/dp/q10-plus-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Q10 Plus Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/quercenase-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Quercenase Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/quercetin-phytosome",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Quercetin Phytosome",
  },
  {
    url: "https://www.thorne.com/products/dp/radiant-skin-complex",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Radiant Skin Complex",
  },
  {
    url: "https://www.thorne.com/products/dp/rapid-relief-saffron",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Rapid Relief Saffron",
  },
  {
    url: "https://www.thorne.com/products/dp/recoverypro-sp114",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Recoverypro Sp114",
  },
  {
    url: "https://www.thorne.com/products/dp/resveracel",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Resveracel",
  },
  {
    url: "https://www.thorne.com/products/dp/rhodiola",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Rhodiola",
  },
  {
    url: "https://www.thorne.com/products/dp/riboflavin-5-phosphate",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "Riboflavin 5 Phosphate",
  },
  {
    url: "https://www.thorne.com/products/dp/s-a-t-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "S A T Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/sacro-b-trade",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Sacro B Trade",
  },
  {
    url: "https://www.thorne.com/products/dp/selenomethionine",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Selenomethionine",
  },
  {
    url: "https://www.thorne.com/products/dp/siliphos-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Siliphos Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/sleep",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Sleep",
  },
  {
    url: "https://www.thorne.com/products/dp/stress-b-complex",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "Stress B Complex",
  },
  {
    url: "https://www.thorne.com/products/dp/super-epa",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Super Epa",
  },
  {
    url: "https://www.thorne.com/products/dp/super-epa-180",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Super Epa 180",
  },
  {
    url: "https://www.thorne.com/products/dp/super-epa-pro-60-s-1",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Super Epa Pro 60 S 1",
  },
  {
    url: "https://www.thorne.com/products/dp/super-epa-sp608nc",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Super Epa Sp608Nc",
  },
  {
    url: "https://www.thorne.com/products/dp/synaquell",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Synaquell",
  },
  {
    url: "https://www.thorne.com/products/dp/synaquell-plus",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Synaquell Plus",
  },
  {
    url: "https://www.thorne.com/products/dp/theanine",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Theanine",
  },
  {
    url: "https://www.thorne.com/products/dp/thiocid-300-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Thiocid 300 Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/thyrocsin-trade-60-s-1",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Thyrocsin Trade 60 S 1",
  },
  {
    url: "https://www.thorne.com/products/dp/trace-minerals",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Trace Minerals",
  },
  {
    url: "https://www.thorne.com/products/dp/ubiquinol",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Ubiquinol",
  },
  {
    url: "https://www.thorne.com/products/dp/ultimate-e-reg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Ultimate E Reg",
  },
  {
    url: "https://www.thorne.com/products/dp/valerian-root",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Valerian Root",
  },
  {
    url: "https://www.thorne.com/products/dp/vit-c-w-flavonoids",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Vit C W Flavonoids",
  },
  {
    url: "https://www.thorne.com/products/dp/vitamin-b12-90",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "Vitamin B12 90",
  },
  {
    url: "https://www.thorne.com/products/dp/vitamin-d-k2-liquid",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Vitamin D K2 Liquid",
  },
  {
    url: "https://www.thorne.com/products/dp/vitamin-d3",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Vitamin D3",
  },
  {
    url: "https://www.thorne.com/products/dp/vitamin-k2-liquid",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Vitamin K2 Liquid",
  },
  {
    url: "https://www.thorne.com/products/dp/whey-protein-isolate-chocolate",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Whey Protein Isolate Chocolate",
  },
  {
    url: "https://www.thorne.com/products/dp/whey-protein-isolate-chocolate-sp110p",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Whey Protein Isolate Chocolate Sp110P",
  },
  {
    url: "https://www.thorne.com/products/dp/whey-protein-isolate-vanilla",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Whey Protein Isolate Vanilla",
  },
  {
    url: "https://www.thorne.com/products/dp/whey-protein-isolate-vanilla-sp111p",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Whey Protein Isolate Vanilla Sp111P",
  },
  {
    url: "https://www.thorne.com/products/dp/women-s-daily-probiotic",
    category: "womens-health",
    brandHint: "Thorne",
    productHint: "Women S Daily Probiotic",
  },
  {
    url: "https://www.thorne.com/products/dp/womens-libido-boost",
    category: "womens-health",
    brandHint: "Thorne",
    productHint: "Womens Libido Boost",
  },
  {
    url: "https://www.thorne.com/products/dp/womens-multi-50",
    category: "womens-health",
    brandHint: "Thorne",
    productHint: "Womens Multi 50",
  },
  {
    url: "https://www.thorne.com/products/dp/zinc-bisglycinate-15-mg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Zinc Bisglycinate 15 Mg",
  },
  {
    url: "https://www.thorne.com/products/dp/zinc-bisglycinate-30-mg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Zinc Bisglycinate 30 Mg",
  },
  {
    url: "https://www.thorne.com/products/dp/zinc-picolinate",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Zinc Picolinate",
  },
  {
    url: "https://www.thorne.com/products/dp/zinc-picolinate-30mg",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Zinc Picolinate 30Mg",
  },
] as const;

/** True when URL looks like a product detail page (not blog/hub/cart). */
export function looksLikeProductDetailUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (
      /\/(blog|article|learn|education|about|cart|account|search|collection|category|categories|news|support|faq|login|signup)(\/|$)/i.test(
        path
      )
    ) {
      return false;
    }
    // Strong product path signals
    if (
      /\/(products?|product|dp|p|item|vitamins-supplements|consumers)\//i.test(
        path
      )
    ) {
      return true;
    }
    // Brand pages ending in .html product files
    if (/\.html?$/i.test(path) && path.split("/").filter(Boolean).length >= 1) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
