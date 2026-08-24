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
  it('returns every category and product when the query is empty', () => {
    const out = filterCatalogCategories(fixture, '');
    expect(out).toHaveLength(2);
    expect(out.reduce((n, c) => n + c.products.length, 0)).toBe(3);
  });

  it('filters products by name prefix and drops empty categories', () => {
    const out = filterCatalogCategories(fixture, 'epit');
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('longevity');
    expect(out[0].products.map((p) => p.id)).toEqual(['epitalon']);
  });

  it('matches another category by peptide name prefix', () => {
    const out = filterCatalogCategories(fixture, 'adreno');
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('adrenal');
  });

  it('does not mid-word match category labels (reta vs Secretagogues)', () => {
    const withSecretagogue: TestCategory[] = [
      {
        id: 'gh',
        label: 'GH Axis and Secretagogues',
        products: [
          {
            id: 'cjc',
            name: 'CJC-1295 without DAC',
            type: 'Peptide',
            mechanism: 'GHRH analogue',
            category: 'GH Axis and Secretagogues',
            targetVariants: [],
          },
        ],
      },
    ];
    expect(filterCatalogCategories(withSecretagogue, 'reta')).toHaveLength(0);
  });

  it('returns no categories when nothing matches', () => {
    const out = filterCatalogCategories(fixture, 'zzzznope');
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
