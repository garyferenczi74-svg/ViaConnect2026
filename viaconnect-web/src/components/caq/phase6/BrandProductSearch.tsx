'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, ChevronRight, Check, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface BrandResult {
  brand_id: string;
  brand_name: string;
  tier: number;
  tier_label: string | null;
  product_count: number;
}

interface ProductResult {
  product_id: string;
  product_name: string;
  brand_id?: string;
  brand_name?: string;
  product_category: string | null;
  delivery_method: string | null;
}

interface BrandProductSearchProps {
  onProductSelect: (product: {
    brand_name: string;
    product_name: string;
    product_category: string | null;
    delivery_method: string | null;
    seed_product_id: string;
  }) => void;
  onManualEntry: (searchText: string) => void;
  placeholder?: string;
  darkMode?: boolean;
}

export default function BrandProductSearch({
  onProductSelect,
  onManualEntry,
  placeholder = 'Search your current vitamins and minerals by brand or ingredient...',
  darkMode = true,
}: BrandProductSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<BrandResult | null>(null);
  const [brandResults, setBrandResults] = useState<BrandResult[]>([]);
  const [productResults, setProductResults] = useState<ProductResult[]>([]);
  const [globalResults, setGlobalResults] = useState<ProductResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setBrandResults([]); setProductResults([]); setGlobalResults([]);
      if (!selectedBrand) setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setShowDropdown(true);
      if (selectedBrand) {
        const { data } = await supabase.rpc('product_autocomplete', {
          selected_brand_id: selectedBrand.brand_id, search_query: query, result_limit: 20,
        });
        setProductResults(data || []); setBrandResults([]); setGlobalResults([]);
      } else {
        const [brandsRes, productsRes] = await Promise.all([
          supabase.rpc('brand_autocomplete', { search_query: query, result_limit: 5 }),
          supabase.rpc('global_product_search', { search_query: query, result_limit: 10 }),
        ]);
        setBrandResults(brandsRes.data || []); setGlobalResults(productsRes.data || []); setProductResults([]);
      }
      setIsLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, selectedBrand]);

  // Load all products when brand selected
  useEffect(() => {
    if (!selectedBrand) return;
    (async () => {
      setIsLoading(true);
      const { data } = await supabase.rpc('product_autocomplete', {
        selected_brand_id: selectedBrand.brand_id, search_query: '', result_limit: 20,
      });
      setProductResults(data || []); setShowDropdown(true); setIsLoading(false);
    })();
  }, [selectedBrand]);

  const handleBrandSelect = (brand: BrandResult) => {
    setSelectedBrand(brand); setQuery(''); inputRef.current?.focus();
  };

  const handleProductSelect = (product: ProductResult) => {
    onProductSelect({
      brand_name: selectedBrand?.brand_name || product.brand_name || '',
      product_name: product.product_name,
      product_category: product.product_category,
      delivery_method: product.delivery_method,
      seed_product_id: product.product_id,
    });
    setQuery(''); setSelectedBrand(null); setShowDropdown(false);
    setBrandResults([]); setProductResults([]); setGlobalResults([]);
  };

  const handleClearBrand = () => {
    setSelectedBrand(null); setQuery(''); setProductResults([]); inputRef.current?.focus();
  };

  const tierColors: Record<number, string> = darkMode
    ? { 1: 'text-amber-400 bg-amber-400/10 border-amber-400/20', 2: 'text-blue-400 bg-blue-400/10 border-blue-400/20', 3: 'text-white/40 bg-white/5 border-white/10' }
    : { 1: 'text-amber-700 bg-amber-50 border-amber-200', 2: 'text-blue-700 bg-blue-50 border-blue-200', 3: 'text-gray-600 bg-gray-50 border-gray-200' };

  const hasResults = brandResults.length > 0 || productResults.length > 0 || globalResults.length > 0;

  // Style classes
  const inputBg = darkMode ? 'bg-white/5 border-teal-400/30 focus-within:border-teal-400/60 focus-within:ring-1 focus-within:ring-teal-400/30' : 'bg-white/60 border-gray-200 focus-within:border-[#2DA5A0] focus-within:ring-1 focus-within:ring-[#2DA5A0]/30';
  const dropBg = darkMode ? 'bg-[#1E2D4A] border-white/10' : 'bg-white/95 border-gray-200';
  const sectionBg = darkMode ? 'bg-white/[0.03]' : 'bg-gray-50/80';
  const sectionText = darkMode ? 'text-teal-400/40' : 'text-gray-400';
  const hoverBg = darkMode ? 'hover:bg-white/5' : 'hover:bg-[#2DA5A0]/5';
  const textP = darkMode ? 'text-white/90' : 'text-[#1A2744]';
  const textS = darkMode ? 'text-white/40' : 'text-gray-400';
  const placeholderC = darkMode ? 'placeholder:text-white/30' : 'placeholder-gray-400';

  return (
    <div ref={containerRef} className="relative w-full">
      <div className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl backdrop-blur-sm transition-all ${inputBg}`}>
        <Search className={`w-4 h-4 shrink-0 ${darkMode ? 'text-teal-400/50' : 'text-gray-400'}`} strokeWidth={1.5} />
        {selectedBrand && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-[#2DA5A0]/10 text-[#2DA5A0] rounded-full text-xs font-medium shrink-0">
            <Check className="w-3 h-3" strokeWidth={1.5} />
            {selectedBrand.brand_name}
            <button onClick={handleClearBrand} className="ml-0.5 hover:text-white transition-colors">
              <X className="w-3 h-3" strokeWidth={1.5} />
            </button>
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.length >= 2 || selectedBrand) setShowDropdown(true); }}
          placeholder={selectedBrand ? `Search ${selectedBrand.brand_name} products...` : placeholder}
          className={`flex-1 bg-transparent outline-none text-sm min-w-0 ${textP} ${placeholderC}`}
          autoComplete="off"
          spellCheck={false}
        />
        {isLoading && <Loader2 className="w-4 h-4 text-[#2DA5A0] animate-spin shrink-0" strokeWidth={1.5} />}
      </div>

      {showDropdown && (hasResults || query.length >= 2) && (
        <div className={`absolute z-50 w-full mt-1 backdrop-blur-md border rounded-xl shadow-lg max-h-72 overflow-y-auto ${dropBg}`}>
          {/* Brand results */}
          {brandResults.length > 0 && (
            <div>
              <div className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider ${sectionBg} ${sectionText}`}>Brands</div>
              {brandResults.map((brand) => (
                <button key={brand.brand_id} onClick={() => handleBrandSelect(brand)}
                  className={`w-full px-3 py-2 flex items-center gap-3 ${hoverBg} transition-colors text-left`}>
                  <Package className="w-4 h-4 text-[#2DA5A0] shrink-0" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${textP}`}>{brand.brand_name}</span>
                    <span className={`text-xs ml-1.5 ${textS}`}>({brand.product_count} products)</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${tierColors[brand.tier] || tierColors[3]}`}>
                    {brand.tier_label || `Tier ${brand.tier}`}
                  </span>
                  <ChevronRight className={`w-3 h-3 shrink-0 ${textS}`} strokeWidth={1.5} />
                </button>
              ))}
            </div>
          )}

          {/* Product results */}
          {(productResults.length > 0 || globalResults.length > 0) && (
            <div>
              <div className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider ${sectionBg} ${sectionText}`}>
                {selectedBrand ? `${selectedBrand.brand_name} Products` : 'Products'}
              </div>
              {(selectedBrand ? productResults : globalResults).map((product, i) => (
                <button key={`${product.product_id}-${i}`} onClick={() => handleProductSelect(product)}
                  className={`w-full px-3 py-2 flex items-center gap-3 ${hoverBg} transition-colors text-left`}>
                  <div className="w-4 h-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm block truncate ${textP}`}>{product.product_name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {product.brand_name && !selectedBrand && (
                        <span className={`text-xs ${textS}`}>{product.brand_name}</span>
                      )}
                      {product.product_category && (
                        <span className={`text-xs ${textS}`}>{product.product_category}</span>
                      )}
                    </div>
                  </div>
                  {product.delivery_method && (
                    <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${darkMode ? 'bg-white/5 text-white/30' : 'bg-gray-50 text-gray-500'}`}>
                      {product.delivery_method}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No results + manual entry */}
          {!hasResults && query.length >= 2 && !isLoading && (
            <button onClick={() => onManualEntry(query)}
              className={`w-full px-3 py-3 flex items-center gap-3 ${hoverBg} transition-colors text-left`}>
              <Search className={`w-4 h-4 shrink-0 ${textS}`} strokeWidth={1.5} />
              <span className={`text-sm ${textS}`}>
                Not found? Enter manually: <span className={`font-medium ${textP}`}>&quot;{query}&quot;</span>
              </span>
            </button>
          )}

          {/* Manual entry always at bottom */}
          {hasResults && (
            <button onClick={() => onManualEntry(query)}
              className={`w-full px-3 py-2 flex items-center gap-3 ${hoverBg} transition-colors text-left border-t ${darkMode ? 'border-white/10' : 'border-gray-100'}`}>
              <Search className={`w-4 h-4 shrink-0 ${textS}`} strokeWidth={1.5} />
              <span className={`text-xs ${textS}`}>Can&apos;t find it? Enter manually</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
