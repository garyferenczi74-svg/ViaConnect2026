'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FlaskConical, ShieldAlert, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createBrowserClient } from '@supabase/ssr';

const CATEGORIES = [
  { id: 'all',        label: 'All',           color: '#2DA5A0' },
  { id: 'longevity',  label: 'Longevity',     color: '#7C3AED' },
  { id: 'stress',     label: 'Stress / HPA',  color: '#DC2626' },
  { id: 'energy',     label: 'Energy / Mito', color: '#D97706' },
  { id: 'immune',     label: 'Immune',        color: '#059669' },
  { id: 'neuro',      label: 'Cognitive',     color: '#2563EB' },
  { id: 'hormonal',   label: 'Hormonal',      color: '#DB2777' },
  { id: 'gut',        label: 'Gut / Repair',  color: '#16A34A' },
  { id: 'metabolic',  label: 'Metabolic',     color: '#B75E18' },
];

interface PeptideResult {
  id: string;
  name: string;
  category_name: string;
  delivery_form: string;
  tier: string;
  requires_practitioner_consult: boolean;
  indication: string;
}

export function PeptideSearchBar() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [results, setResults] = useState<PeptideResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q: string, category: string) => {
    const hasQuery = q.length >= 2;
    const hasCategory = category !== 'all';
    if (!hasQuery && !hasCategory) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      let dbQuery = supabase
        .from('peptide_registry')
        .select('id, product_name, category_name, delivery_form, tier, requires_practitioner_consult, mechanism_of_action')
        .limit(8);

      if (hasQuery) dbQuery = dbQuery.ilike('product_name', `%${q}%`);
      if (hasCategory) dbQuery = dbQuery.ilike('category_name', `%${category}%`);

      const { data } = await dbQuery;

      const mapped: PeptideResult[] = (data || []).map((r: any) => ({
        id: r.id,
        name: r.product_name,
        category_name: r.category_name,
        delivery_form: r.delivery_form || '',
        tier: r.tier || '',
        requires_practitioner_consult: r.requires_practitioner_consult,
        indication: r.mechanism_of_action || '',
      }));

      setResults(mapped);
      setShowDropdown(mapped.length > 0 || hasQuery);
    } finally {
      setIsSearching(false);
    }
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => search(query, activeCategory), 300);
    return () => clearTimeout(timer);
  }, [query, activeCategory, search]);

  const handleCategoryClick = (id: string) => {
    setActiveCategory(id);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="space-y-3">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
        <span className="text-sm font-semibold text-white">Search Peptides</span>
        <span className="text-xs text-[rgba(255,255,255,0.40)]">· Browse peptides</span>
      </div>

      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => handleCategoryClick(c.id)}
            className={`px-2 py-1 rounded-full text-[10px] font-medium transition-all border whitespace-nowrap ${
              activeCategory === c.id
                ? 'text-white border-transparent shadow-sm'
                : 'bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.55)] border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.80)]'
            }`}
            style={activeCategory === c.id ? { backgroundColor: c.color, borderColor: c.color } : {}}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#172542]/60 backdrop-blur-md border border-[rgba(255,255,255,0.15)] focus-within:border-[#2DA5A0] focus-within:ring-2 focus-within:ring-[#2DA5A0]/15 transition-all">
          {isSearching
            ? <Loader2 className="w-4 h-4 text-[#2DA5A0] animate-spin shrink-0" strokeWidth={1.5} />
            : <Search className="w-4 h-4 text-[rgba(255,255,255,0.35)] shrink-0" strokeWidth={1.5} />
          }
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Search peptide information"
            className="flex-1 text-sm text-white placeholder:text-[rgba(255,255,255,0.30)] outline-none bg-transparent"
          />
          {query && (
            <button onClick={handleClear}>
              <X className="w-4 h-4 text-[rgba(255,255,255,0.35)] hover:text-[rgba(255,255,255,0.70)]" strokeWidth={1.5} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#1E3054]/90 backdrop-blur-md rounded-2xl border border-[rgba(255,255,255,0.10)] shadow-2xl overflow-hidden"
            >
              {results.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-[rgba(255,255,255,0.35)]">
                  No peptides found matching "{query}"
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-[rgba(255,255,255,0.06)]">
                  {results.map(peptide => (
                    <div
                      key={peptide.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.05)] cursor-pointer transition-colors"
                    >
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1A2744] to-[#2DA5A0] flex items-center justify-center shrink-0 mt-0.5">
                        <FlaskConical className="w-4 h-4 text-white" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">{peptide.name}</span>
                          {peptide.requires_practitioner_consult && (
                            <span className="flex items-center gap-1 text-xs bg-[rgba(183,94,24,0.15)] text-[#FB923C] border border-[rgba(183,94,24,0.30)] px-1.5 py-0.5 rounded-full">
                              <ShieldAlert className="w-3 h-3" strokeWidth={1.5} />
                              Supervision
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[rgba(255,255,255,0.45)]">
                          <span>{peptide.category_name}</span>
                          <span>·</span>
                          <span>{peptide.delivery_form}</span>
                          {peptide.tier && (
                            <>
                              <span>·</span>
                              <span className={`font-medium ${
                                peptide.tier.includes('1') ? 'text-[#2DA5A0]' :
                                peptide.tier.includes('2') ? 'text-[#F59E0B]' : 'text-[#F87171]'
                              }`}>
                                {peptide.tier.replace('Tier ', '').replace(': ', '. ')}
                              </span>
                            </>
                          )}
                        </div>
                        {peptide.indication && (
                          <p className="text-xs text-[rgba(255,255,255,0.35)] mt-0.5 leading-snug line-clamp-1">
                            {peptide.indication}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-4 py-2.5 bg-[rgba(183,94,24,0.08)] border-t border-[rgba(183,94,24,0.15)]">
                <p className="text-xs text-[rgba(251,146,60,0.70)] flex items-center gap-1.5">
                  <ShieldAlert className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                  Tier 2/3 peptides require practitioner oversight before use
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
