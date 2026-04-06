'use client';

import React, { useState, useEffect } from 'react';
import { Search, Package, ChevronRight, Check, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface BrandResult {
  brand_id: string;
  brand_name: string;
  tier: number;
  tier_label: string;
  match_source: string;
  product_count: number;
}

interface ProductResult {
  product_id: string;
  product_name: string;
  product_category: string;
  is_enriched: boolean;
  delivery_method: string | null;
}

interface BrandProductAutocompleteProps {
  onProductSelect: (brand: BrandResult, product: ProductResult) => void;
  onManualEntry: (brandName: string, productName: string) => void;
}

export default function BrandProductAutocomplete({ onProductSelect, onManualEntry }: BrandProductAutocompleteProps) {
  const [step, setStep] = useState<'brand' | 'product'>('brand');
  const [brandQuery, setBrandQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [brandResults, setBrandResults] = useState<BrandResult[]>([]);
  const [productResults, setProductResults] = useState<ProductResult[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<BrandResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  // Debounced brand search
  useEffect(() => {
    if (brandQuery.length < 2) { setBrandResults([]); return; }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      const { data } = await supabase.rpc('brand_autocomplete', { search_query: brandQuery, result_limit: 10 });
      setBrandResults(data || []);
      setIsLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [brandQuery]);

  // Debounced product search
  useEffect(() => {
    if (!selectedBrand) return;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      const { data } = await supabase.rpc('product_autocomplete', {
        selected_brand_id: selectedBrand.brand_id,
        search_query: productQuery,
        result_limit: 20,
      });
      setProductResults(data || []);
      setIsLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [productQuery, selectedBrand]);

  useEffect(() => {
    if (selectedBrand) { setProductQuery(''); setStep('product'); }
  }, [selectedBrand]);

  const tierColors: Record<number, string> = {
    1: 'text-amber-600 bg-amber-50',
    2: 'text-blue-600 bg-blue-50',
    3: 'text-gray-600 bg-gray-50',
  };

  return (
    <div className="space-y-3">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className={step === 'brand' ? 'text-[#2DA5A0] font-medium' : ''}>1. Select Brand</span>
        <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
        <span className={step === 'product' ? 'text-[#2DA5A0] font-medium' : ''}>2. Select Product</span>
      </div>

      {/* Brand search */}
      {step === 'brand' && (
        <div className="relative">
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white/60 backdrop-blur-sm">
            <Search className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              value={brandQuery}
              onChange={(e) => setBrandQuery(e.target.value)}
              placeholder="Type brand name (e.g., Thorne, Organika, AG1)..."
              className="flex-1 bg-transparent outline-none text-sm text-[#1A2744] placeholder-gray-400"
              autoFocus
            />
            {isLoading && <Loader2 className="w-4 h-4 text-[#2DA5A0] animate-spin" strokeWidth={1.5} />}
          </div>

          {brandResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {brandResults.map((brand) => (
                <button
                  key={brand.brand_id}
                  onClick={() => setSelectedBrand(brand)}
                  className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <Package className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-[#1A2744]">{brand.brand_name}</span>
                    <span className="text-xs text-gray-400 ml-2">({brand.product_count} products)</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${tierColors[brand.tier] || tierColors[3]}`}>
                    {brand.tier_label || `Tier ${brand.tier}`}
                  </span>
                </button>
              ))}
              <button
                onClick={() => onManualEntry(brandQuery, '')}
                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-100"
              >
                <Search className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                <span className="text-sm text-gray-500">
                  Not listed? Enter manually: <span className="font-medium text-[#1A2744]">&quot;{brandQuery}&quot;</span>
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Product search */}
      {step === 'product' && selectedBrand && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-1 bg-[#2DA5A0]/10 text-[#2DA5A0] rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" strokeWidth={1.5} />
              {selectedBrand.brand_name}
            </span>
            <button
              onClick={() => { setStep('brand'); setSelectedBrand(null); setBrandQuery(''); }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Change
            </button>
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white/60 backdrop-blur-sm">
              <Search className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
              <input
                type="text"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder={`Search ${selectedBrand.brand_name} products...`}
                className="flex-1 bg-transparent outline-none text-sm text-[#1A2744] placeholder-gray-400"
                autoFocus
              />
              {isLoading && <Loader2 className="w-4 h-4 text-[#2DA5A0] animate-spin" strokeWidth={1.5} />}
            </div>

            {productResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {productResults.map((product) => (
                  <button
                    key={product.product_id}
                    onClick={() => onProductSelect(selectedBrand, product)}
                    className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex-1">
                      <span className="text-sm text-[#1A2744]">{product.product_name}</span>
                      {product.product_category && (
                        <span className="text-xs text-gray-400 ml-2">{product.product_category}</span>
                      )}
                    </div>
                    {product.is_enriched && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-50 text-green-600 rounded">enriched</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
