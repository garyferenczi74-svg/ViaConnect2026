// Chip definitions and the pure catalog search filter for the unified Search
// Peptides module (Prompts 195a, 195b). Kept separate from the component so
// the filter logic and the chip-to-category mapping can be unit tested.

export interface CategoryChip {
  catId: string;
  label: string;
  color: string;
}

// Chips keep their existing short labels and colors; catId is the real
// ALL_CATEGORIES id so a chip opens the right catalog category. Three ids are
// remapped from the former Supabase chip ids: stress -> adrenal,
// energy -> mitochondrial, gut -> gut_detox.
export const CATEGORY_CHIPS: CategoryChip[] = [
  { catId: 'all', label: 'All', color: '#2DA5A0' },
  { catId: 'longevity', label: 'Longevity', color: '#7C3AED' },
  { catId: 'adrenal', label: 'Stress / HPA', color: '#DC2626' },
  { catId: 'mitochondrial', label: 'Energy / Mito', color: '#D97706' },
  { catId: 'immune', label: 'Immune', color: '#059669' },
  { catId: 'neuro', label: 'Cognitive', color: '#2563EB' },
  { catId: 'hormonal', label: 'Hormonal', color: '#DB2777' },
  { catId: 'gut_detox', label: 'Gut / Repair', color: '#16A34A' },
  { catId: 'metabolic', label: 'Metabolic', color: '#B75E18' },
];

export interface FilterablePeptide {
  name: string;
  type: string;
  mechanism: string;
  category: string;
  targetVariants: readonly string[];
}

export interface FilterableCategory<P extends FilterablePeptide> {
  id: string;
  products: P[];
}

// Narrows each category's products to those matching the query and drops
// categories left empty. An empty query returns the categories unchanged.
// Generic so it preserves the caller's concrete category type for rendering.
export function filterCatalogCategories<
  P extends FilterablePeptide,
  C extends FilterableCategory<P>,
>(categories: C[], query: string): C[] {
  const q = query.trim().toLowerCase();
  if (q === '') return categories;
  return categories
    .map((cat) => {
      const products = cat.products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q) ||
          p.mechanism.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.targetVariants.some((v) => v.toLowerCase().includes(q)),
      );
      return { ...cat, products } as C;
    })
    .filter((cat) => cat.products.length > 0);
}
