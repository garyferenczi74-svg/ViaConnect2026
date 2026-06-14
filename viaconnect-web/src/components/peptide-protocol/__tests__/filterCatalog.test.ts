import { describe, it, expect } from 'vitest';
import { ALL_CATEGORIES } from '@/config/peptide-database/registry';
import { CATEGORY_CHIPS, filterCatalogCategories } from '../filterCatalog';

interface TestPeptide {
  id: string;
  name: string;
  type: string;
  mechanism: string;
  category: string;
  targetVariants: string[];
}
interface TestCategory {
  id: string;
  label: string;
  products: TestPeptide[];
}

const fixture: TestCategory[] = [
  {
    id: 'longevity',
    label: 'Longevity & Core Bioregulator',
    products: [
      { id: 'epitalon', name: 'Epitalon', type: 'Bioregulator', mechanism: 'Telomerase activation', category: 'Longevity & Core Bioregulator', targetVariants: ['TERT'] },
      { id: 'vesugen', name: 'Vesugen', type: 'Peptide', mechanism: 'Vascular support', category: 'Longevity & Core Bioregulator', targetVariants: [] },
    ],
  },
  {
    id: 'adrenal',
    label: 'Adrenal/HPA Axis & Stress',
    products: [
      { id: 'adrenopeptide', name: 'Adrenopeptide', type: 'Peptide', mechanism: 'Cortisol regulation', category: 'Adrenal/HPA Axis & Stress', targetVariants: ['NR3C1'] },
    ],
  },
];

describe('filterCatalogCategories', () => {
  it('returns all categories and products for All + empty query', () => {
    const out = filterCatalogCategories(fixture, '', 'all');
    expect(out).toHaveLength(2);
    expect(out.reduce((n, c) => n + c.products.length, 0)).toBe(3);
  });

  it('keeps only the selected category, including remapped ids like adrenal', () => {
    const out = filterCatalogCategories(fixture, '', 'adrenal');
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('adrenal');
  });

  it('filters products by a case-insensitive query across fields', () => {
    const out = filterCatalogCategories(fixture, 'TELOMERASE', 'all');
    expect(out).toHaveLength(1);
    expect(out[0].products.map((p) => p.id)).toEqual(['epitalon']);
  });

  it('combines query and category and drops empty categories', () => {
    const out = filterCatalogCategories(fixture, 'cortisol', 'longevity');
    expect(out).toHaveLength(0);
  });
});

describe('CATEGORY_CHIPS', () => {
  it('has All plus eight categories', () => {
    expect(CATEGORY_CHIPS).toHaveLength(9);
    expect(CATEGORY_CHIPS[0].catId).toBe('all');
  });

  it('maps every chip except All to a real catalog category id', () => {
    const realIds = new Set(ALL_CATEGORIES.map((c) => c.id));
    const bad = CATEGORY_CHIPS.filter((c) => c.catId !== 'all' && !realIds.has(c.catId));
    expect(bad).toEqual([]);
  });
});
