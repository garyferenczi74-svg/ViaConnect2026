'use client';

// Prompt 207a Task 7: Admin beverage catalog list page.
//
// Fetches GET /api/admin/nutrition/beverages (admin-gated) and renders all
// beverage_catalog rows (active + inactive). Provides:
//   - In-memory search by display_name
//   - Filter by the 9 categories
//   - Sort by sort_order (default)
//   - Desktop: full table; Mobile: stacked cards
//
// Auth: the (app)/layout.tsx admin-role gate already blocks non-admins;
// no additional page-level guard is needed here.

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  Coffee,
  Droplets,
  Filter,
  Loader2,
  Search,
  Tag,
} from 'lucide-react';
import type {
  BeverageCatalogRow,
  BeverageCategory,
  BEVERAGE_CATEGORIES,
} from '@/components/nutrition/hydration/BeveragePicker/BeveragePicker.types';

// Re-declare the constant locally so we don't import the full picker barrel
// from a server-only render context. The type is still imported from the types file.
const CATEGORY_OPTIONS: ReadonlyArray<BeverageCategory> = [
  'water',
  'coffee',
  'tea',
  'juice',
  'pop',
  'sports_energy',
  'milk',
  'functional',
  'alcohol',
];

const CATEGORY_LABELS: Record<BeverageCategory, string> = {
  water: 'Water',
  coffee: 'Coffee',
  tea: 'Tea',
  juice: 'Juice',
  pop: 'Pop / Soda',
  sports_energy: 'Sports / Energy',
  milk: 'Milk',
  functional: 'Functional',
  alcohol: 'Alcohol',
};

export default function AdminBeveragesPage() {
  const [beverages, setBeverages] = useState<BeverageCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<BeverageCategory | ''>('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/nutrition/beverages');
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? 'Failed to load beverage catalog');
          return;
        }
        const data = (await res.json()) as { beverages: BeverageCatalogRow[] };
        setBeverages(data.beverages ?? []);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return beverages.filter((b) => {
      const matchesSearch = !q || b.display_name.toLowerCase().includes(q);
      const matchesCategory = !categoryFilter || b.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [beverages, search, categoryFilter]);

  const activeCount = beverages.filter((b) => b.is_active).length;
  const inactiveCount = beverages.length - activeCount;

  return (
    <div className="min-h-screen" style={{ background: '#0f1929' }}>
      {/* Header */}
      <div
        className="border-b px-6 py-5"
        style={{ background: '#1A2744', borderColor: '#1E3054' }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1
                className="text-xl font-semibold tracking-tight"
                style={{ color: '#2DA5A0' }}
              >
                Beverage Catalog
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: '#8099cc' }}>
                All system beverages (active + inactive). Read-only view.
              </p>
            </div>
            {!loading && !error && (
              <div className="flex gap-3 text-sm" style={{ color: '#8099cc' }}>
                <span>
                  <span className="font-semibold" style={{ color: '#2DA5A0' }}>
                    {activeCount}
                  </span>{' '}
                  active
                </span>
                <span>
                  <span className="font-semibold" style={{ color: '#B75E18' }}>
                    {inactiveCount}
                  </span>{' '}
                  inactive
                </span>
                <span>
                  <span className="font-semibold text-white">{beverages.length}</span> total
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2
              strokeWidth={1.5}
              className="h-8 w-8 animate-spin"
              style={{ color: '#2DA5A0' }}
            />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div
            className="flex items-start gap-3 rounded-lg border p-4"
            style={{ background: '#1A2744', borderColor: '#B75E18', color: '#f5c09a' }}
          >
            <AlertCircle strokeWidth={1.5} className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Failed to load catalog</p>
              <p className="mt-0.5 text-sm opacity-80">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Search + filter bar */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search
                  strokeWidth={1.5}
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: '#8099cc' }}
                />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border py-2.5 pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-[#4a6090] focus:border-[#2DA5A0]"
                  style={{
                    background: '#1A2744',
                    borderColor: '#1E3054',
                    color: '#c8d8f4',
                  }}
                />
              </div>

              {/* Category filter */}
              <div className="relative sm:w-52">
                <Filter
                  strokeWidth={1.5}
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: '#8099cc' }}
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as BeverageCategory | '')}
                  className="w-full appearance-none rounded-lg border py-2.5 pl-9 pr-8 text-sm outline-none transition-colors focus:border-[#2DA5A0]"
                  style={{
                    background: '#1A2744',
                    borderColor: '#1E3054',
                    color: '#c8d8f4',
                  }}
                >
                  <option value="">All categories</option>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  strokeWidth={1.5}
                  className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: '#8099cc' }}
                />
              </div>
            </div>

            {/* Result count */}
            {(search || categoryFilter) && (
              <p className="mb-4 text-sm" style={{ color: '#8099cc' }}>
                Showing{' '}
                <span className="font-semibold text-white">{filtered.length}</span> of{' '}
                {beverages.length} beverages
              </p>
            )}

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border md:block" style={{ borderColor: '#1E3054' }}>
              <table className="w-full text-sm" style={{ background: '#1A2744' }}>
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase tracking-wider" style={{ borderColor: '#1E3054', color: '#8099cc' }}>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Source Kind</th>
                    <th className="px-4 py-3 text-right">Volume (ml)</th>
                    <th className="px-4 py-3 text-right">Hydration Coeff</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: '#8099cc' }}>
                        No beverages match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((bev, idx) => (
                      <tr
                        key={bev.id}
                        className="border-b transition-colors hover:bg-white/[0.02]"
                        style={{
                          borderColor: idx < filtered.length - 1 ? '#1E3054' : 'transparent',
                          color: '#c8d8f4',
                        }}
                      >
                        <td className="px-4 py-3 font-medium">{bev.display_name}</td>
                        <td className="px-4 py-3">
                          <CategoryPill category={bev.category} />
                        </td>
                        <td className="px-4 py-3">
                          <code
                            className="rounded px-1.5 py-0.5 text-xs"
                            style={{ background: '#0f1929', color: '#8099cc' }}
                          >
                            {bev.hydration_source_kind}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-right">{bev.default_volume_ml}</td>
                        <td className="px-4 py-3 text-right">{bev.hydration_coefficient.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge isActive={bev.is_active} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {filtered.length === 0 ? (
                <div
                  className="rounded-xl border px-4 py-10 text-center text-sm"
                  style={{ borderColor: '#1E3054', background: '#1A2744', color: '#8099cc' }}
                >
                  No beverages match your filters.
                </div>
              ) : (
                filtered.map((bev) => (
                  <div
                    key={bev.id}
                    className="rounded-xl border p-4"
                    style={{ background: '#1A2744', borderColor: '#1E3054' }}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="font-medium" style={{ color: '#c8d8f4' }}>
                        {bev.display_name}
                      </p>
                      <StatusBadge isActive={bev.is_active} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <CategoryPill category={bev.category} />
                      <code
                        className="rounded px-1.5 py-0.5 text-xs"
                        style={{ background: '#0f1929', color: '#8099cc' }}
                      >
                        {bev.hydration_source_kind}
                      </code>
                    </div>
                    <div
                      className="mt-3 grid grid-cols-2 gap-y-1 text-xs"
                      style={{ color: '#8099cc' }}
                    >
                      <span>
                        Volume:{' '}
                        <span className="font-medium" style={{ color: '#c8d8f4' }}>
                          {bev.default_volume_ml} ml
                        </span>
                      </span>
                      <span>
                        Coeff:{' '}
                        <span className="font-medium" style={{ color: '#c8d8f4' }}>
                          {bev.hydration_coefficient.toFixed(2)}
                        </span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational components
// ---------------------------------------------------------------------------

function CategoryPill({ category }: { category: BeverageCategory }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: 'rgba(45,165,160,0.12)', color: '#2DA5A0' }}
    >
      <Tag strokeWidth={1.5} className="h-3 w-3" />
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={
        isActive
          ? { background: 'rgba(45,165,160,0.12)', color: '#2DA5A0' }
          : { background: 'rgba(183,94,24,0.12)', color: '#B75E18' }
      }
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
