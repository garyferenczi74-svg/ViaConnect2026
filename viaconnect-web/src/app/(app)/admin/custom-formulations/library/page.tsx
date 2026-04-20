'use client';

// Prompt #97 Phase 2.3: admin ingredient library management.
// List, filter, toggle availability, inspect safety flags. Edit detail
// via inline form. Changes write audit-worthy fields (last_reviewed_at,
// last_reviewed_by).

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  Library,
  Search,
  ToggleLeft,
  ToggleRight,
  XCircle,
} from 'lucide-react';

const supabase = createClient();

interface IngredientRow {
  id: string;
  common_name: string;
  scientific_name: string | null;
  category: string;
  regulatory_status: string;
  dose_unit: string;
  typical_dose_mg: number | null;
  tolerable_upper_limit_adult_mg: number | null;
  pregnancy_category: string | null;
  fda_warning_letter_issued: boolean;
  fda_safety_concern_listed: boolean;
  is_available_for_custom_formulation: boolean;
  last_reviewed_at: string | null;
}

const CATEGORIES = [
  '', 'vitamin', 'mineral', 'amino_acid', 'botanical_herb', 'enzyme',
  'probiotic_strain', 'fatty_acid', 'phytochemical', 'nutraceutical',
  'antioxidant', 'mushroom_extract', 'fiber', 'excipient_filler', 'other',
];

const REG_STATUSES = [
  '', 'pre_1994_dietary_ingredient', 'gras_affirmed', 'ndi_notified_accepted',
  'ndi_required_not_filed', 'prohibited', 'under_review',
];

function regulatoryColor(status: string): string {
  switch (status) {
    case 'pre_1994_dietary_ingredient':
    case 'gras_affirmed':
      return 'bg-emerald-500/15 text-emerald-300';
    case 'ndi_notified_accepted':
      return 'bg-sky-500/15 text-sky-300';
    case 'ndi_required_not_filed':
    case 'under_review':
      return 'bg-amber-500/15 text-amber-300';
    case 'prohibited':
      return 'bg-red-500/15 text-red-300';
    default:
      return 'bg-white/[0.06] text-white/60';
  }
}

export default function IngredientLibraryPage() {
  const [rows, setRows] = useState<IngredientRow[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    let q = supabase
      .from('ingredient_library')
      .select(
        'id, common_name, scientific_name, category, regulatory_status, dose_unit, typical_dose_mg, tolerable_upper_limit_adult_mg, pregnancy_category, fda_warning_letter_issued, fda_safety_concern_listed, is_available_for_custom_formulation, last_reviewed_at',
      )
      .order('common_name')
      .limit(500);
    if (categoryFilter) q = q.eq('category', categoryFilter);
    if (regStatusFilter) q = q.eq('regulatory_status', regStatusFilter);
    if (availableOnly) q = q.eq('is_available_for_custom_formulation', true);
    const { data } = await q;
    setRows((data ?? []) as IngredientRow[]);
  }, [categoryFilter, regStatusFilter, availableOnly]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.common_name.toLowerCase().includes(s) ||
        r.id.toLowerCase().includes(s) ||
        (r.scientific_name ?? '').toLowerCase().includes(s),
    );
  }, [rows, search]);

  const toggleAvailability = async (id: string, current: boolean) => {
    const next = !current;
    const response = await fetch(`/api/admin/custom-formulations/ingredients/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available_for_custom_formulation: next }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setMessage(`Toggle failed: ${err.error ?? response.status}`);
      return;
    }
    setMessage(`${id} is now ${next ? 'available' : 'unavailable'} for formulations.`);
    await refresh();
  };

  const availableCount = rows.filter((r) => r.is_available_for_custom_formulation).length;

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Admin
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <Library className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} /> Ingredient library
          </h1>
          <p className="text-xs text-white/55 mt-1">
            {rows.length} ingredients total, {availableCount} available to practitioners.
            Q1 admits pre_1994_dietary_ingredient and gras_affirmed only.
          </p>
        </div>

        {message && (
          <div className="rounded-xl bg-[#2DA5A0]/10 border border-[#2DA5A0]/30 px-3 py-2 text-xs text-[#2DA5A0]">
            {message}
          </div>
        )}

        <div className="grid sm:grid-cols-4 gap-2">
          <div className="relative sm:col-span-2">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, scientific name, or id"
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] pl-9 pr-3 py-2 text-xs text-white"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-2 py-2 text-xs text-white"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c || 'All categories'}
              </option>
            ))}
          </select>
          <select
            value={regStatusFilter}
            onChange={(e) => setRegStatusFilter(e.target.value)}
            className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-2 py-2 text-xs text-white"
          >
            {REG_STATUSES.map((r) => (
              <option key={r} value={r}>
                {r || 'All regulatory statuses'}
              </option>
            ))}
          </select>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-white/75">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
          />
          Show available for custom formulation only
        </label>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 overflow-hidden">
          {filtered.length === 0 ? (
            <p className="p-6 text-xs text-white/55 text-center">No ingredients match.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {filtered.map((r) => (
                <li key={r.id} className="p-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {r.common_name}
                        {r.scientific_name ? (
                          <span className="text-white/50 italic ml-2">
                            {r.scientific_name}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-white/55">
                        <code>{r.id}</code> . {r.category}
                        {r.typical_dose_mg !== null ? ` . typical ${r.typical_dose_mg}${r.dose_unit}` : ''}
                        {r.tolerable_upper_limit_adult_mg !== null
                          ? ` . adult UL ${r.tolerable_upper_limit_adult_mg}mg`
                          : ''}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${regulatoryColor(r.regulatory_status)}`}
                        >
                          {r.regulatory_status}
                        </span>
                        {r.pregnancy_category && (
                          <span className="rounded-lg bg-white/[0.06] text-white/70 px-2 py-0.5 text-[10px]">
                            pregnancy: {r.pregnancy_category}
                          </span>
                        )}
                        {r.fda_warning_letter_issued && (
                          <span className="rounded-lg bg-red-500/15 text-red-300 px-2 py-0.5 text-[10px]">
                            FDA warning letter
                          </span>
                        )}
                        {r.fda_safety_concern_listed && (
                          <span className="rounded-lg bg-red-500/15 text-red-300 px-2 py-0.5 text-[10px]">
                            FDA safety concern
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleAvailability(r.id, r.is_available_for_custom_formulation)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                        r.is_available_for_custom_formulation
                          ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                          : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.1]'
                      }`}
                    >
                      {r.is_available_for_custom_formulation ? (
                        <>
                          <ToggleRight className="h-4 w-4" strokeWidth={1.5} /> available
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4" strokeWidth={1.5} /> hidden
                        </>
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[11px] text-white/40 flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5" strokeWidth={1.5} /> Toggling availability stamps
          last_reviewed_at + last_reviewed_by on the row.
        </p>
      </div>
    </div>
  );
}
