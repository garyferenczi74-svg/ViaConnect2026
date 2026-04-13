'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Plus, Loader2, Pill, Tag, Building2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  result_type: 'product' | 'brand' | 'ingredient';
  id: string;
  name: string;
  brand_id: string;
  brand_name: string;
  category: string | null;
  delivery_method: string | null;
  image_url: string | null;
  is_enriched: boolean | null;
  rank: number;
  similarity_score: number;
}

interface SupplementSearchBarProps {
  onAddSupplement: (result: SearchResult) => void;
  placeholder?: string;
  disabled?: boolean;
  darkMode?: boolean;
}

const TYPE_ICON = { product: Pill, brand: Building2, ingredient: Tag };

export default function SupplementSearchBar({
  onAddSupplement,
  placeholder = 'Search vitamins, minerals, supplements, and peptides by brand or ingredient',
  disabled = false,
  darkMode = false,
}: SupplementSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 250);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults([]); setIsOpen(false); return; }
    const controller = new AbortController();
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/supplements/search?q=${encodeURIComponent(debouncedQuery)}&limit=15`, { signal: controller.signal });
        if (!res.ok) throw new Error();
        const { results: data } = await res.json();
        setResults(data ?? []);
        setIsOpen(true);
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== 'AbortError') setResults([]);
      } finally {
        setIsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [debouncedQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = useCallback((result: SearchResult) => {
    if (result.result_type === 'brand') {
      setQuery(result.name);
    } else {
      onAddSupplement(result);
      setQuery('');
      setResults([]);
      setIsOpen(false);
    }
  }, [onAddSupplement]);

  const grouped = {
    brands: results.filter(r => r.result_type === 'brand'),
    products: results.filter(r => r.result_type === 'product'),
    ingredients: results.filter(r => r.result_type === 'ingredient'),
  };

  const bgClass = darkMode ? 'bg-white/5 border-teal-400/30 text-white placeholder:text-white/30' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400';
  const dropdownBg = darkMode ? 'bg-[#1E2D4A] border-white/10' : 'bg-white border-gray-200';
  const hoverBg = darkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50';
  const textPrimary = darkMode ? 'text-white/90' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-white/40' : 'text-gray-500';
  const sectionHeader = darkMode ? 'text-teal-400/40' : 'text-gray-500';

  return (
    <div ref={containerRef} className="relative w-full">
      <div className={`relative flex items-center rounded-xl border-2 transition-all ${bgClass} ${isOpen || query ? (darkMode ? 'border-teal-400/60 shadow-md' : 'border-[#2DA5A0] shadow-md') : ''}`}>
        <div className="absolute left-3">
          {isLoading
            ? <Loader2 className="w-5 h-5 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />
            : <Search className={`w-5 h-5 ${darkMode ? 'text-teal-400/50' : 'text-gray-400'}`} strokeWidth={1.5} />}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3.5 bg-transparent rounded-xl text-sm focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setIsOpen(false); inputRef.current?.focus(); }}
            className={`absolute right-3 p-1 rounded-full ${darkMode ? 'text-white/40 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className={`absolute top-full mt-2 left-0 right-0 z-50 rounded-xl border shadow-xl max-h-96 overflow-y-auto ${dropdownBg}`}>
          {grouped.brands.length > 0 && (
            <div>
              <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b ${darkMode ? 'border-white/10' : 'border-gray-100'} ${sectionHeader}`}>Brands</div>
              {grouped.brands.map(r => (
                <button key={`b-${r.id}`} onClick={() => handleSelect(r)}
                  className={`w-full flex items-center gap-3 px-4 py-3 ${hoverBg} transition-colors text-left border-b ${darkMode ? 'border-white/[0.03]' : 'border-gray-50'} last:border-0`}>
                  <Building2 className="w-4 h-4 text-[#2DA5A0] flex-shrink-0" strokeWidth={1.5} />
                  <span className={`text-sm font-medium flex-1 ${textPrimary}`}>{r.name}</span>
                  <Search className={`w-3.5 h-3.5 ${textSecondary}`} strokeWidth={1.5} />
                </button>
              ))}
            </div>
          )}

          {grouped.products.length > 0 && (
            <div>
              <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b ${darkMode ? 'border-white/10' : 'border-gray-100'} ${sectionHeader}`}>
                Products ({grouped.products.length})
              </div>
              {grouped.products.map((r, i) => (
                <button key={`p-${r.id}-${i}`} onClick={() => handleSelect(r)}
                  className={`w-full flex items-center gap-3 px-4 py-3 ${hoverBg} transition-colors text-left group border-b ${darkMode ? 'border-white/[0.03]' : 'border-gray-50'} last:border-0`}>
                  <Pill className={`w-4 h-4 ${darkMode ? 'text-teal-400/60' : 'text-gray-400'} flex-shrink-0`} strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium block truncate ${textPrimary}`}>
                      {highlightMatch(r.name, query)}
                    </span>
                    <span className={`text-xs ${textSecondary}`}>{r.brand_name}{r.category ? ` · ${r.category}` : ''}</span>
                  </div>
                  <div className={`w-7 h-7 rounded-full bg-[#2DA5A0]/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0`}>
                    <Plus className="w-3.5 h-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
                  </div>
                </button>
              ))}
            </div>
          )}

          {grouped.ingredients.length > 0 && (
            <div>
              <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b ${darkMode ? 'border-white/10' : 'border-gray-100'} ${sectionHeader}`}>
                <Tag className="w-3 h-3 inline mr-1" strokeWidth={1.5} /> Ingredients
              </div>
              {grouped.ingredients.map((r, i) => (
                <button key={`i-${r.id}-${i}`} onClick={() => handleSelect(r)}
                  className={`w-full flex items-center gap-3 px-4 py-3 ${hoverBg} transition-colors text-left group border-b ${darkMode ? 'border-white/[0.03]' : 'border-gray-50'} last:border-0`}>
                  <Tag className={`w-4 h-4 ${darkMode ? 'text-orange-400/60' : 'text-orange-400'} flex-shrink-0`} strokeWidth={1.5} />
                  <span className={`text-sm flex-1 ${textPrimary}`}>{r.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-orange-400/10 text-orange-400/60' : 'bg-orange-50 text-orange-600'}`}>{r.delivery_method || 'Ingredient'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="bg-[#2DA5A0]/20 text-inherit rounded-sm">{part}</mark> : part
  );
}
