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

/** Prefer /products/ paths; facts-only targets. */
export const COMPETITIVE_SKU_SEEDS: readonly CompetitiveSkuSeed[] = [
  // Thorne
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
    productHint: "Vitamin C with Flavonoids",
  },
  {
    url: "https://www.thorne.com/products/dp/magnesium-bisglycinate",
    category: "base-formulations",
    brandHint: "Thorne",
    productHint: "Magnesium Bisglycinate",
  },
  {
    url: "https://www.thorne.com/products/dp/methyl-guard-plus",
    category: "methylation-snp",
    brandHint: "Thorne",
    productHint: "Methyl-Guard Plus",
  },
  // Quicksilver
  {
    url: "https://www.quicksilverscientific.com/products/liposomal-glutathione",
    category: "advanced-formulas",
    brandHint: "Quicksilver Scientific",
    productHint: "Liposomal Glutathione",
  },
  {
    url: "https://www.quicksilverscientific.com/products/liposomal-vitamin-c",
    category: "advanced-formulas",
    brandHint: "Quicksilver Scientific",
    productHint: "Liposomal Vitamin C",
  },
  // Pure Encapsulations
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
    productHint: "Magnesium Glycinate",
  },
  // Seeking Health
  {
    url: "https://www.seekinghealth.com/products/optimal-folate-lozenges",
    category: "methylation-snp",
    brandHint: "Seeking Health",
    productHint: "Optimal Folate",
  },
  {
    url: "https://www.seekinghealth.com/products/active-b12-with-l-5-mthf",
    category: "methylation-snp",
    brandHint: "Seeking Health",
    productHint: "Active B12 with L-5-MTHF",
  },
  // Nordic Naturals
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
  // NOW
  {
    url: "https://www.nowfoods.com/products/minerals/magnesium-citrate-softgels",
    category: "base-formulations",
    brandHint: "NOW Foods",
    productHint: "Magnesium Citrate Softgels",
  },
  {
    url: "https://www.nowfoods.com/products/vitamins/vitamin-d-3-softgels-5000-iu",
    category: "base-formulations",
    brandHint: "NOW Foods",
    productHint: "Vitamin D-3 5000 IU",
  },
  // Life Extension
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
    productHint: "Super Bio-Curcumin",
  },
  // BodyBio
  {
    url: "https://bodybio.com/products/pc-phosphatidylcholine",
    category: "advanced-formulas",
    brandHint: "BodyBio",
    productHint: "PC Phosphatidylcholine",
  },
  // Designs for Health
  {
    url: "https://www.designsforhealth.com/products/magnegel",
    category: "base-formulations",
    brandHint: "Designs for Health",
    productHint: "MagneGel",
  },
  // Ritual
  {
    url: "https://ritual.com/products/essential-for-women-18",
    category: "womens-health",
    brandHint: "Ritual",
    productHint: "Essential for Women 18+",
  },
  // Host Defense
  {
    url: "https://hostdefense.com/products/lions-mane",
    category: "functional-mushrooms",
    brandHint: "Host Defense",
    productHint: "Lion's Mane",
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
