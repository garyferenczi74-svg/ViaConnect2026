// Client-side brand search index for Phase 6 supplement search
// Extracted from the 110-brand seed registry for instant local matching

export interface BrandSearchEntry {
  brand: string;
  aliases: string[];
  products: { name: string; category: string; servingSize: string }[];
}

export const BRAND_SEARCH_INDEX: BrandSearchEntry[] = [
  // Tier 1: Premium Practitioner
  { brand: "Thorne Research", aliases: ["Thorne", "Thorne Supplements"], products: [
    { name: "Basic Nutrients 2/Day", category: "Multivitamin", servingSize: "2 capsules" },
    { name: "Magnesium Bisglycinate", category: "Mineral", servingSize: "2 capsules" },
    { name: "Super EPA", category: "Omega-3", servingSize: "2 softgels" },
    { name: "Vitamin D/K2 Liquid", category: "Vitamin", servingSize: "2 drops" },
    { name: "Methyl-Guard Plus", category: "B Vitamin", servingSize: "3 capsules" },
    { name: "Creatine", category: "Sports", servingSize: "1 scoop" },
  ]},
  { brand: "Pure Encapsulations", aliases: ["Pure Encap"], products: [
    { name: "ONE Multivitamin", category: "Multivitamin", servingSize: "1 capsule" },
    { name: "Magnesium Glycinate", category: "Mineral", servingSize: "1 capsule" },
    { name: "O.N.E. Omega", category: "Omega-3", servingSize: "1 softgel" },
  ]},
  { brand: "NOW Foods", aliases: ["NOW", "NOW Supplements"], products: [
    { name: "Adam Superior Men's Multi", category: "Multivitamin", servingSize: "2 softgels" },
    { name: "Magnesium Citrate 200mg", category: "Mineral", servingSize: "1 tablet" },
    { name: "Vitamin D-3 5000 IU", category: "Vitamin D", servingSize: "1 softgel" },
    { name: "Ultra Omega-3", category: "Omega-3", servingSize: "2 softgels" },
    { name: "CoQ10 200mg", category: "CoQ10", servingSize: "1 softgel" },
    { name: "L-Theanine 200mg", category: "Amino Acid", servingSize: "1 capsule" },
  ]},
  { brand: "Garden of Life", aliases: ["GOL"], products: [
    { name: "Vitamin Code Men", category: "Multivitamin", servingSize: "4 capsules" },
    { name: "Dr. Formulated Probiotics", category: "Probiotic", servingSize: "1 capsule" },
    { name: "Organic Plant Protein", category: "Protein", servingSize: "1 scoop" },
  ]},
  { brand: "Nordic Naturals", aliases: [], products: [
    { name: "Ultimate Omega", category: "Omega-3", servingSize: "2 softgels" },
    { name: "Prenatal DHA", category: "Omega-3", servingSize: "2 softgels" },
  ]},
  { brand: "Life Extension", aliases: ["LEF"], products: [
    { name: "Super Ubiquinol CoQ10 200mg", category: "CoQ10", servingSize: "1 softgel" },
    { name: "Neuro-Mag Magnesium L-Threonate", category: "Magnesium", servingSize: "3 capsules" },
    { name: "Optimized Resveratrol", category: "Antioxidant", servingSize: "1 capsule" },
  ]},
  // Tier 2: DTC
  { brand: "AG1", aliases: ["Athletic Greens"], products: [
    { name: "AG1 Next Gen Original", category: "Greens Powder", servingSize: "1 scoop" },
  ]},
  { brand: "Ritual", aliases: ["Ritual Vitamins"], products: [
    { name: "Essential for Men 18+", category: "Multivitamin", servingSize: "2 capsules" },
    { name: "Essential for Women 18+", category: "Multivitamin", servingSize: "2 capsules" },
  ]},
  { brand: "Seed", aliases: ["Seed Health"], products: [
    { name: "DS-01 Daily Synbiotic", category: "Probiotic", servingSize: "2 capsules" },
  ]},
  { brand: "Vital Proteins", aliases: [], products: [
    { name: "Collagen Peptides", category: "Collagen", servingSize: "2 scoops" },
  ]},
  // Tier 3: Mass Market
  { brand: "Nature Made", aliases: [], products: [
    { name: "Multi Complete", category: "Multivitamin", servingSize: "1 tablet" },
    { name: "Vitamin D3 5000 IU", category: "Vitamin D", servingSize: "1 softgel" },
    { name: "Fish Oil 1200mg", category: "Omega-3", servingSize: "1 softgel" },
  ]},
  { brand: "Centrum", aliases: ["Centrum Vitamins"], products: [
    { name: "Adults Multivitamin", category: "Multivitamin", servingSize: "1 tablet" },
    { name: "Silver Adults 50+", category: "Multivitamin", servingSize: "1 tablet" },
  ]},
  { brand: "Nature's Bounty", aliases: ["Natures Bounty"], products: [
    { name: "Vitamin D3 2000 IU", category: "Vitamin D", servingSize: "1 softgel" },
    { name: "Fish Oil 1200mg", category: "Omega-3", servingSize: "1 softgel" },
  ]},
  { brand: "Solgar", aliases: ["Solgar Vitamins"], products: [
    { name: "Vitamin D3 5000 IU", category: "Vitamin D", servingSize: "1 softgel" },
    { name: "Magnesium Citrate", category: "Mineral", servingSize: "2 tablets" },
  ]},
  { brand: "MegaFood", aliases: ["Mega Food"], products: [
    { name: "One Daily", category: "Multivitamin", servingSize: "1 tablet" },
    { name: "Blood Builder", category: "Iron", servingSize: "1 tablet" },
  ]},
  { brand: "Kirkland Signature", aliases: ["Kirkland", "Costco"], products: [
    { name: "Daily Multi", category: "Multivitamin", servingSize: "1 tablet" },
    { name: "Fish Oil 1000mg", category: "Omega-3", servingSize: "1 softgel" },
  ]},
  { brand: "Metagenics", aliases: [], products: [
    { name: "PhytoMulti", category: "Multivitamin", servingSize: "2 tablets" },
    { name: "UltraFlora Balance", category: "Probiotic", servingSize: "1 capsule" },
  ]},
  { brand: "Codeage", aliases: [], products: [
    { name: "Multi Collagen Peptides", category: "Collagen", servingSize: "5 capsules" },
    { name: "Liposomal Vitamin C", category: "Vitamin C", servingSize: "2 capsules" },
  ]},
  // Tier 5: Canadian
  { brand: "Organika", aliases: ["Organika Health"], products: [
    { name: "8-in-1 Magnesium", category: "Magnesium", servingSize: "2 vegetarian capsules" },
    { name: "Enhanced Collagen", category: "Collagen", servingSize: "1 scoop" },
    { name: "Ashwagandha", category: "Herbal", servingSize: "1 capsule" },
    { name: "Lion's Mane Mushroom", category: "Mushroom", servingSize: "2 capsules" },
    { name: "Vitamin D3 1000 IU", category: "Vitamin D", servingSize: "1 softgel" },
  ]},
  { brand: "Natural Factors", aliases: ["NF"], products: [
    { name: "Vitamin D3 1000 IU", category: "Vitamin D", servingSize: "1 softgel" },
    { name: "RxOmega-3", category: "Omega-3", servingSize: "2 softgels" },
    { name: "Magnesium Citrate 150mg", category: "Mineral", servingSize: "1 capsule" },
  ]},
  { brand: "Jamieson", aliases: ["Jamieson Vitamins"], products: [
    { name: "Vitamin D3 1000 IU", category: "Vitamin D", servingSize: "1 tablet" },
    { name: "Omega-3 Select", category: "Omega-3", servingSize: "1 softgel" },
    { name: "Probiotic 10 Billion", category: "Probiotic", servingSize: "1 capsule" },
  ]},
  { brand: "Webber Naturals", aliases: ["Webber"], products: [
    { name: "Vitamin D3 1000 IU", category: "Vitamin D", servingSize: "1 softgel" },
    { name: "Magnesium Citrate 150mg", category: "Mineral", servingSize: "1 capsule" },
  ]},
  { brand: "CanPrev", aliases: [], products: [
    { name: "Magnesium Bis-Glycinate 200", category: "Magnesium", servingSize: "1 capsule" },
    { name: "Synergy C", category: "Vitamin C", servingSize: "1 capsule" },
  ]},
];

// Flatten for fast search
export function searchBrandsAndProducts(query: string): { brand: string; productName: string; category: string; servingSize: string; matchType: "brand" | "product" }[] {
  if (query.length < 2) return [];
  const q = query.toLowerCase();
  const results: { brand: string; productName: string; category: string; servingSize: string; matchType: "brand" | "product" }[] = [];

  for (const entry of BRAND_SEARCH_INDEX) {
    const brandMatch = entry.brand.toLowerCase().includes(q) || entry.aliases.some((a) => a.toLowerCase().includes(q));

    if (brandMatch) {
      // Show all products for matching brand
      for (const p of entry.products) {
        results.push({ brand: entry.brand, productName: p.name, category: p.category, servingSize: p.servingSize, matchType: "brand" });
      }
    } else {
      // Check individual products
      for (const p of entry.products) {
        if (p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) {
          results.push({ brand: entry.brand, productName: p.name, category: p.category, servingSize: p.servingSize, matchType: "product" });
        }
      }
    }
  }

  return results.slice(0, 15);
}
