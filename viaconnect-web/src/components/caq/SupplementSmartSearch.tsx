"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Package, Check, Loader2 } from "lucide-react";
import { SEED_INGREDIENTS, normalizeIngredientName } from "@/config/farmceutica-ingredients";

export interface SupplementSuggestion {
  id: string;
  brandName: string;
  productName: string;
  formulation: string;
  category: string;
  dosageForm: string;
  typicalDosage: string;
  keyIngredients: string[];
}

interface SupplementSmartSearchProps {
  onSelectProduct: (name: string, brand: string, formulation: string, dosageForm: string) => void;
  onManualAdd: (query: string) => void;
  onAISearch: (query: string) => void;
  existingNames: string[];
  disabled?: boolean;
}

export function SupplementSmartSearch({
  onSelectProduct,
  onManualAdd,
  onAISearch,
  existingNames,
  disabled,
}: SupplementSmartSearchProps) {
  const [query, setQuery] = useState("");
  const [localResults, setLocalResults] = useState<typeof SEED_INGREDIENTS>([]);
  const [aiResults, setAiResults] = useState<SupplementSuggestion[]>([]);
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local instant search on every keystroke
  useEffect(() => {
    if (query.trim().length === 0) {
      setLocalResults([]);
      setAiResults([]);
      setShowDropdown(false);
      return;
    }

    const q = query.toLowerCase().trim();
    const filtered = SEED_INGREDIENTS
      .filter((i) => {
        const name = i.search_name.toLowerCase();
        return name.startsWith(q) || name.split(/[\s\-\(\)\/]+/).some((word) => word.startsWith(q));
      })
      .sort((a, b) => {
        const aStarts = a.search_name.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.search_name.toLowerCase().startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.search_name.localeCompare(b.search_name);
      })
      .slice(0, 10);

    setLocalResults(filtered);
    setShowDropdown(true);

    // If local results < 3, trigger AI search after 500ms
    if (filtered.length < 3 && q.length >= 3) {
      const timer = setTimeout(() => fetchAISuggestions(q), 500);
      return () => clearTimeout(timer);
    } else {
      setAiResults([]);
    }
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function fetchAISuggestions(searchQuery: string) {
    setIsSearchingAI(true);
    try {
      const res = await fetch("/api/ai/supplement-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (data.suggestions) {
        setAiResults(data.suggestions.slice(0, 6));
      }
    } catch {
      // Silently fail — local results are still available
    } finally {
      setIsSearchingAI(false);
    }
  }

  const q = query.toLowerCase().trim();

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" strokeWidth={1.5} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => localResults.length > 0 && setShowDropdown(true)}
          placeholder="Search supplements by brand or name (e.g., Optimum Nutrition Gold Standard)..."
          className="w-full min-h-[48px] pl-11 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:border-teal-400/30 focus:ring-1 focus:ring-teal-400/20 transition-all outline-none"
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
        />
        {isSearchingAI && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-400/60 animate-spin" strokeWidth={2} />
        )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showDropdown && (localResults.length > 0 || aiResults.length > 0 || q.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 rounded-xl bg-[#1E2D47] border border-white/10 shadow-2xl overflow-hidden max-h-[320px] overflow-y-auto"
          >
            {/* Local FarmCeutica results */}
            {localResults.map((item) => {
              const alreadyAdded = existingNames.some((n) => n.toLowerCase() === item.name.toLowerCase());
              const name = item.search_name;
              const lowerName = name.toLowerCase();
              let matchIdx = lowerName.indexOf(q);
              if (matchIdx === -1) {
                const words = lowerName.split(/[\s\-\(\)\/]+/);
                let pos = 0;
                for (const word of words) {
                  const wIdx = lowerName.indexOf(word, pos);
                  if (word.startsWith(q)) { matchIdx = wIdx; break; }
                  pos = wIdx + word.length;
                }
              }

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    if (!alreadyAdded) {
                      onSelectProduct(item.name, "FarmCeutica", item.category, item.delivery_method);
                      setQuery("");
                      setShowDropdown(false);
                    }
                  }}
                  disabled={alreadyAdded}
                  className={`w-full text-left px-4 py-3 border-b border-white/[0.03] last:border-0 transition-colors min-h-[48px] flex items-center justify-between gap-3 ${
                    alreadyAdded ? "opacity-40 cursor-not-allowed" : "hover:bg-white/5"
                  }`}
                >
                  <span className="text-sm text-white/90 flex-1">
                    {matchIdx >= 0 ? (
                      <>
                        {name.slice(0, matchIdx)}
                        <span className="text-teal-400 font-medium">{name.slice(matchIdx, matchIdx + q.length)}</span>
                        {name.slice(matchIdx + q.length)}
                      </>
                    ) : name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 bg-teal-400/10 border border-teal-400/20 text-teal-400/60">
                    {item.delivery_method}
                  </span>
                  {alreadyAdded && <Check className="w-4 h-4 text-teal-400/60 flex-shrink-0" strokeWidth={2} />}
                </button>
              );
            })}

            {/* AI results (when local is sparse) */}
            {aiResults.length > 0 && (
              <>
                <div className="px-4 py-2 border-t border-white/10">
                  <p className="text-[10px] text-teal-400/40 uppercase tracking-wider font-semibold">AI-Identified Products</p>
                </div>
                {aiResults.map((sug, i) => {
                  const fullName = `${sug.brandName} ${sug.productName}`;
                  const alreadyAdded = existingNames.some((n) => n.toLowerCase() === fullName.toLowerCase());

                  return (
                    <button
                      key={sug.id || i}
                      type="button"
                      onClick={() => {
                        if (!alreadyAdded) {
                          onSelectProduct(fullName, sug.brandName, sug.formulation || sug.category, sug.dosageForm || "capsule");
                          setQuery("");
                          setShowDropdown(false);
                        }
                      }}
                      disabled={alreadyAdded}
                      className={`w-full text-left px-4 py-3 border-b border-white/[0.03] last:border-0 transition-colors min-h-[48px] ${
                        alreadyAdded ? "opacity-40 cursor-not-allowed" : "hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Package className="w-4 h-4 text-teal-400/50 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/70 font-medium truncate">{fullName}</p>
                          {sug.formulation && <p className="text-[11px] text-white/30 mt-0.5 truncate">{sug.formulation}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/20 border border-white/5">{sug.category}</span>
                            {sug.dosageForm && <span className="text-[9px] text-white/15">{sug.dosageForm}</span>}
                          </div>
                        </div>
                        {alreadyAdded ? (
                          <Check className="w-4 h-4 text-teal-400/60 flex-shrink-0" strokeWidth={2} />
                        ) : (
                          <Plus className="w-4 h-4 text-white/20 flex-shrink-0" strokeWidth={1.5} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {/* Manual add option */}
            {q.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onManualAdd(query.trim());
                  setQuery("");
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-3 text-sm font-medium text-copper hover:bg-copper/5 transition-colors flex items-center gap-2 border-t border-white/10"
              >
                <Plus className="w-3.5 h-3.5" />
                Add &quot;{query.trim()}&quot; manually
              </button>
            )}

            {/* AI search trigger */}
            {localResults.length === 0 && aiResults.length === 0 && !isSearchingAI && q.length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  onAISearch(query.trim());
                  setQuery("");
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-3 text-sm font-medium text-teal-400 hover:bg-teal-400/5 transition-colors flex items-center gap-2 border-t border-white/10"
              >
                <Search className="w-3.5 h-3.5" />
                Search all supplement brands with AI
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
