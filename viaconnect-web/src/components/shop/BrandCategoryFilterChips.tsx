'use client';

// Prompt #103 Phase 6: Reusable brand + category filter chips.
//
// Used by the Revenue Intelligence page (#99) and the master /shop
// filter UI. Emits the selected brand + category ids up; the parent
// decides how to apply the filter.

import { useEffect, useState } from 'react';

interface BrandOption {
  brand_id: string;
  brand_slug: string;
  display_name: string;
}

interface CategoryOption {
  product_category_id: string;
  category_slug: string;
  display_name: string;
  brand_id: string;
}

interface Props {
  selectedBrandId: string | null;
  selectedCategoryId: string | null;
  onChange: (next: { brandId: string | null; categoryId: string | null }) => void;
}

export function BrandCategoryFilterChips({
  selectedBrandId,
  selectedCategoryId,
  onChange,
}: Props): JSX.Element {
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    (async () => {
      // Hitting the public brand-storefront endpoint for each known
      // brand once. Cached by the browser.
      const slugs = ['viacura', 'sproutables', 'viacura-snp'];
      const brandList: BrandOption[] = [];
      const catList: CategoryOption[] = [];
      for (const slug of slugs) {
        const r = await fetch(`/api/public/brand-storefront/${slug}`);
        if (!r.ok) continue;
        const json = await r.json();
        if (json.brand) {
          brandList.push({
            brand_id: json.brand.brand_id,
            brand_slug: json.brand.brand_slug,
            display_name: json.brand.display_name,
          });
        }
        for (const c of (json.categories ?? [])) {
          catList.push({
            product_category_id: c.product_category_id,
            category_slug: c.category_slug,
            display_name: c.display_name,
            brand_id: json.brand?.brand_id,
          });
        }
      }
      setBrands(brandList);
      setCategories(catList);
    })();
  }, []);

  const visibleCategories = selectedBrandId
    ? categories.filter((c) => c.brand_id === selectedBrandId)
    : categories;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] uppercase tracking-wide text-white/50 self-center mr-1">Brand</span>
        <button
          className={`text-xs px-2.5 py-1 rounded border ${
            selectedBrandId === null ? 'border-copper text-copper bg-copper/10' : 'border-white/10 text-gray-300 hover:text-white'
          }`}
          onClick={() => onChange({ brandId: null, categoryId: null })}
        >
          All
        </button>
        {brands.map((b) => (
          <button
            key={b.brand_id}
            className={`text-xs px-2.5 py-1 rounded border ${
              selectedBrandId === b.brand_id ? 'border-copper text-copper bg-copper/10' : 'border-white/10 text-gray-300 hover:text-white'
            }`}
            onClick={() => onChange({ brandId: b.brand_id, categoryId: null })}
          >
            {b.display_name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] uppercase tracking-wide text-white/50 self-center mr-1">Category</span>
        <button
          className={`text-xs px-2.5 py-1 rounded border ${
            selectedCategoryId === null ? 'border-copper text-copper bg-copper/10' : 'border-white/10 text-gray-300 hover:text-white'
          }`}
          onClick={() => onChange({ brandId: selectedBrandId, categoryId: null })}
        >
          All
        </button>
        {visibleCategories.map((c) => (
          <button
            key={c.product_category_id}
            className={`text-xs px-2.5 py-1 rounded border ${
              selectedCategoryId === c.product_category_id ? 'border-copper text-copper bg-copper/10' : 'border-white/10 text-gray-300 hover:text-white'
            }`}
            onClick={() => onChange({ brandId: selectedBrandId, categoryId: c.product_category_id })}
          >
            {c.display_name}
          </button>
        ))}
      </div>
    </div>
  );
}
