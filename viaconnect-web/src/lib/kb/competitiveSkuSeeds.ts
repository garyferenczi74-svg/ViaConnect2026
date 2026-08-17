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
    url: "https://www.thorne.com/products/dp/basic-nutrients-2-day",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Basic Nutrients 2/Day",
  },
  {
    url: "https://www.thorne.com/products/dp/vitamin-c-with-flavonoids",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Vitamin C 500 mg with Flavonoids",
  },
  {
    url: "https://www.thorne.com/products/dp/magnesium-bisglycinate",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Magnesium Bisglycinate 200 mg",
  },
  {
    url: "https://www.thorne.com/products/dp/methyl-guard-plus",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "Methyl-Guard Plus",
  },
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
    url: "https://www.thorne.com/products/dp/basic-b-complex",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "Basic B Complex",
  },
  {
    url: "https://www.thorne.com/products/dp/omega-3-w-coqs",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Omega-3 with CoQ10",
  },
  {
    url: "https://www.thorne.com/products/dp/buffered-c-powder",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Buffered C Powder Vitamin C 230 mg",
  },
  {
    url: "https://www.thorne.com/products/dp/ferrasorb",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Ferrasorb Iron",
  },
  {
    url: "https://www.thorne.com/products/dp/5-mthf",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "5-MTHF 1 mg",
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
    url: "https://www.thorne.com/products/dp/multi-vitamin-elite-am",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Multi-Vitamin Elite AM",
  },
  {
    url: "https://www.thorne.com/products/dp/vitamin-d-5000",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Vitamin D 5000 IU",
  },
  {
    url: "https://www.thorne.com/products/dp/zinc-picolinate-30",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Zinc Picolinate 30 mg",
  },
  {
    url: "https://www.thorne.com/products/dp/iron-bisglycinate",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Iron Bisglycinate 25 mg",
  },
  {
    url: "https://www.thorne.com/products/dp/b-complex-12",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "B-Complex #12",
  },
  {
    url: "https://www.thorne.com/products/dp/curcumin-phytosome",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Curcumin Phytosome 500 mg",
  },
  {
    url: "https://www.thorne.com/products/dp/omega-3-w-coq10",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Omega-3 w/ CoQ10",
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
    url: "https://www.thorne.com/products/dp/vitamin-d-k2",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Vitamin D 1000 IU + K2",
  },
  {
    url: "https://www.thorne.com/products/dp/creatine",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Creatine 5000 mg",
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
    url: "https://www.thorne.com/products/dp/quercetin-phytosome",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Quercetin Phytosome",
  },
  {
    url: "https://www.thorne.com/products/dp/super-epa",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Super EPA",
  },
  {
    url: "https://www.thorne.com/products/dp/nac",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "N-Acetylcysteine NAC",
  },
  {
    url: "https://www.thorne.com/products/dp/glutathione-sr",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Glutathione-SR",
  },
  {
    url: "https://www.thorne.com/products/dp/phosphatidylserine",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Phosphatidylserine",
  },
  {
    url: "https://www.thorne.com/products/dp/lions-mane",
    category: "functional-mushrooms",
    brandHint: "Thorne",
    productHint: "Lion's Mane",
  },
  {
    url: "https://www.thorne.com/products/dp/beta-alanine",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Beta Alanine",
  },
  {
    url: "https://www.thorne.com/products/dp/amino-complex",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Amino Complex",
  },
  {
    url: "https://www.thorne.com/products/dp/catalyte",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Catalyte",
  },
  {
    url: "https://www.thorne.com/products/dp/p5p",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "P5P",
  },
  {
    url: "https://www.thorne.com/products/dp/trace-minerals",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Trace Minerals",
  },
  {
    url: "https://www.thorne.com/products/dp/enteromend",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "EnteroMend",
  },
  {
    url: "https://www.thorne.com/products/dp/fibermend",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "FiberMend",
  },
  {
    url: "https://www.thorne.com/products/dp/bio-gest",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Bio-Gest",
  },
  {
    url: "https://www.thorne.com/products/dp/liver-cleanse",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Liver Cleanse",
  },
  {
    url: "https://www.thorne.com/products/dp/zinc-carnosine",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Zinc Carnosine",
  },
  {
    url: "https://www.thorne.com/products/dp/ashwagandha",
    category: "advanced-formulas",
    brandHint: "Thorne",
    productHint: "Ashwagandha",
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
    url: "https://cymbiotika.com/products/liposomal-vitamin-c",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Vitamin C",
  },
  {
    url: "https://cymbiotika.com/products/liposomal-glutathione",
    category: "advanced-formulas",
    brandHint: "Cymbiotika",
    productHint: "Liposomal Glutathione",
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
