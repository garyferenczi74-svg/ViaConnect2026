'use client';

// PeptideCatalogSection - unified "Search Peptides" module (Prompts 195a, 195b).
// Search input + category chips on top; the catalog renders as an accordion of
// category sections beneath. Sections are collapsed by default and open when a
// category pill (or its header) is activated; the "All" pill opens every
// section. A non-empty search expands every category that has a match. Single
// source of truth is the static registry (ALL_CATEGORIES); no Supabase query.

import { useMemo, useState } from 'react';
import {
  Search,
  X,
  ChevronDown,
  FlaskConical,
  Dna,
  Battery,
  Zap,
  Flame,
  BrainCircuit,
  Brain,
  Shield,
  Activity,
  Clock,
  Heart,
  Leaf,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react';
import { ALL_CATEGORIES } from '@/config/peptide-database/registry';
import { PeptideCatalogCard } from '@/components/shop/PeptideCatalogCard';
import { CATEGORY_CHIPS, filterCatalogCategories } from './filterCatalog';

const ICON_MAP: Record<string, LucideIcon> = {
  Dna,
  Battery,
  Zap,
  Flame,
  BrainCircuit,
  Brain,
  Shield,
  Activity,
  Clock,
  Heart,
  Leaf,
  TrendingDown,
  FlaskConical,
};

export function PeptideCatalogSection() {
  const [query, setQuery] = useState('');
  // null = all sections collapsed (default); 'all' = every section open;
  // otherwise the id of the single open category.
  const [openCatId, setOpenCatId] = useState<string | null>(null);

  // Single source of truth: the static registry, with the standing defensive
  // semaglutide exclusion and any empty categories dropped.
  const categories = useMemo(
    () =>
      ALL_CATEGORIES.map((cat) => ({
        ...cat,
        products: cat.products.filter(
          (p) =>
            !p.id.includes('semaglutide') &&
            !p.name.toLowerCase().includes('semaglutide'),
        ),
      })).filter((cat) => cat.products.length > 0),
    [],
  );

  const totalPeptides = categories.reduce((sum, c) => sum + c.products.length, 0);

  const searching = query.trim() !== '';

  // Search-only filter; expansion is handled separately by openCatId.
  const filtered = useMemo(
    () => filterCatalogCategories(categories, query),
    [categories, query],
  );

  // One toggle for both the pills and the header rows. 'all' is just another
  // openCatId value that the render treats as "expand everything".
  const toggleCategory = (id: string) =>
    setOpenCatId((prev) => (prev === id ? null : id));

  // A pill reads as selected only while it is the open category and no search
  // is overriding the accordion.
  const chipActive = (catId: string) => openCatId === catId && !searching;

  return (
    <section className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[rgba(45,165,160,0.30)] bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]">
          <Search className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-white">Search Peptides</h2>
          <p className="mt-0.5 text-[11px] text-[rgba(255,255,255,0.45)]">
            {totalPeptides} peptides · {categories.length} categories · educational reference
          </p>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORY_CHIPS.map((c) => (
          <button
            type="button"
            key={c.catId}
            onClick={() => toggleCategory(c.catId)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border whitespace-nowrap ${
              chipActive(c.catId)
                ? 'text-white border-transparent shadow-sm'
                : 'bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.55)] border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.80)]'
            }`}
            style={chipActive(c.catId) ? { backgroundColor: c.color, borderColor: c.color } : {}}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#1E3054]/45 backdrop-blur-md border border-[rgba(255,255,255,0.15)] focus-within:border-[#2DA5A0] focus-within:ring-2 focus-within:ring-[#2DA5A0]/15 transition-all">
        <Search className="w-4 h-4 text-[rgba(255,255,255,0.35)] shrink-0" strokeWidth={1.5} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search peptide information"
          className="flex-1 text-sm text-white placeholder:text-[rgba(255,255,255,0.30)] outline-none bg-transparent"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
            <X className="w-4 h-4 text-[rgba(255,255,255,0.35)] hover:text-[rgba(255,255,255,0.70)]" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Educational notice (framing preserved) */}
      <p className="rounded-xl border border-[rgba(183,94,24,0.20)] bg-[rgba(183,94,24,0.08)] px-3 py-2 text-[11px] leading-relaxed text-[rgba(255,255,255,0.65)]">
        Educational reference only. FarmCeutica Wellness LLC does not sell
        peptides at retail. Use the share buttons on each card to send
        profiles to your licensed practitioner.
      </p>

      {/* Results: accordion of category sections */}
      {filtered.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-[rgba(255,255,255,0.40)]">
          No peptides found{query ? ` matching "${query}"` : ''}.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((cat) => {
            const Icon = ICON_MAP[cat.icon] ?? FlaskConical;
            const open = searching || openCatId === 'all' || openCatId === cat.id;
            return (
              <div key={cat.id} className="space-y-2.5">
                {/* Category header (toggle) */}
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors"
                  style={{
                    background: `linear-gradient(135deg, ${cat.color}1A, ${cat.color}05)`,
                    borderColor: `${cat.color}33`,
                  }}
                >
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${cat.color}26`, border: `1px solid ${cat.color}40` }}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.5} style={{ color: cat.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-xs font-semibold leading-tight sm:text-sm text-white">
                      {cat.label}
                    </h3>
                    <p className="mt-0.5 text-[10px] text-[rgba(255,255,255,0.40)]">
                      {cat.products.length} peptide{cat.products.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 flex-shrink-0 text-[rgba(255,255,255,0.45)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    strokeWidth={1.5}
                  />
                </button>

                {/* Cards (only when this section is open) */}
                {open && (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {cat.products.map((peptide) => (
                      <PeptideCatalogCard key={peptide.id} peptide={peptide} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
