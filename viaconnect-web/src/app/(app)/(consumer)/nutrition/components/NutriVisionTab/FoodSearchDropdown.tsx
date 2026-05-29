'use client';

// Prompt #170 Phase 1l: food swap autocomplete.
//
// Renders an input + a dropdown of results from GET /api/nutrition/foods/search.
// 300 ms debounce. Click a result to swap. Tries up to 10 results. Shows a
// no-results message if the response array is empty. Failed fetches show a
// retry hint without blocking the rest of the UI.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { FoodSwapReplacement, NutrientSource } from './types';

interface FoodSearchDropdownProps {
  onPick: (replacement: FoodSwapReplacement) => void;
  cuisineTagHint?: string;
  placeholder?: string;
  onClose?: () => void;
}

interface SearchApiResult {
  results?: ReadonlyArray<{
    id?: string;
    name?: string;
    source?: string;
    per_100g?: Partial<FoodSwapReplacement['per_100g']>;
    cuisine_tag?: string;
  }>;
  error?: { message?: string };
}

const VALID_SOURCES = new Set<NutrientSource>([
  'farmceutica_curated', 'usda_fdc', 'open_food_facts', 'vision_provider', 'user_entered',
]);

function safeNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function isSource(v: string | undefined): v is NutrientSource {
  return typeof v === 'string' && VALID_SOURCES.has(v as NutrientSource);
}

export function FoodSearchDropdown({
  onPick,
  cuisineTagHint,
  placeholder = 'Search for a food',
  onClose,
}: FoodSearchDropdownProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSwapReplacement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputId = useId();

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: q.trim(), limit: '10' });
      if (cuisineTagHint) params.set('cuisine', cuisineTagHint);
      const res = await fetch(`/api/nutrition/foods/search?${params.toString()}`, {
        signal: controller.signal,
      });
      const body = (await res.json().catch(() => null)) as SearchApiResult | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Search failed.');
        setResults([]);
        return;
      }
      const next: FoodSwapReplacement[] = (body?.results ?? []).flatMap((r) => {
        if (typeof r.name !== 'string' || r.name.trim().length === 0) return [];
        const src: NutrientSource = isSource(r.source) ? r.source : 'usda_fdc';
        const replacement: FoodSwapReplacement = {
          name: r.name,
          nutrient_source: src,
          per_100g: {
            calories_kcal: safeNumber(r.per_100g?.calories_kcal),
            protein_g: safeNumber(r.per_100g?.protein_g),
            carbs_g: safeNumber(r.per_100g?.carbs_g),
            fat_g: safeNumber(r.per_100g?.fat_g),
          },
        };
        if (typeof r.per_100g?.fiber_g === 'number') replacement.per_100g.fiber_g = r.per_100g.fiber_g;
        if (typeof r.per_100g?.sugar_g === 'number') replacement.per_100g.sugar_g = r.per_100g.sugar_g;
        if (typeof r.per_100g?.sodium_mg === 'number') replacement.per_100g.sodium_mg = r.per_100g.sodium_mg;
        // Parse the {source}:{id} convention the search route uses.
        if (typeof r.id === 'string') {
          const idx = r.id.indexOf(':');
          if (idx > 0) {
            const tail = r.id.slice(idx + 1);
            if (src === 'farmceutica_curated') replacement.curated_food_id = tail;
            else if (src === 'usda_fdc') {
              const fdc = Number(tail);
              if (Number.isInteger(fdc) && fdc > 0) replacement.usda_fdc_id = fdc;
            } else if (src === 'open_food_facts') {
              replacement.off_barcode = tail;
            }
          }
        }
        return [replacement];
      });
      setResults(next);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError('Could not search foods. Try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [cuisineTagHint]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handlePick = (r: FoodSwapReplacement) => {
    onPick(r);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1A2744]/40 p-3">
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="text-[11px] text-white/50">Swap food</label>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close food search"
            className="text-white/50 transition-colors hover:text-white"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5">
        <Search className="h-3.5 w-3.5 text-white/50" strokeWidth={1.5} />
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setTouched(true); }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
          autoComplete="off"
        />
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {loading && (
          <p className="text-[11px] text-white/45">Searching...</p>
        )}
        {error && (
          <p className="text-[11px] text-[#FCA5A5]">{error}</p>
        )}
        {!loading && !error && results.length === 0 && touched && query.trim().length >= 2 && (
          <p className="text-[11px] text-white/45">No matches. Try a different term.</p>
        )}
        {results.map((r, i) => (
          <button
            key={`${r.name}-${i}`}
            type="button"
            onClick={() => handlePick(r)}
            className="flex items-center justify-between rounded-lg border border-transparent bg-white/[0.03] px-2.5 py-1.5 text-left transition-colors hover:border-[#2DA5A0]/40 hover:bg-[#2DA5A0]/10"
          >
            <div className="flex flex-col">
              <span className="text-[12px] text-white">{r.name}</span>
              <span className="text-[10px] uppercase tracking-wide text-white/45">
                {r.nutrient_source.replace(/_/g, ' ')}
              </span>
            </div>
            <span className="font-mono text-[11px] text-white/60">
              {Math.round(r.per_100g.calories_kcal)} kcal / 100 g
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
