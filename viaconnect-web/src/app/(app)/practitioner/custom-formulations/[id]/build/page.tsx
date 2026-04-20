'use client';

// Prompt #97 Phase 3.1: formulation builder.
// Three-panel layout: ingredient picker, formulation details + dosed
// ingredients, validation + COGS + submit. Desktop-priority.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  Info,
  Minus,
  Plus,
  Search,
  Send,
  XCircle,
} from 'lucide-react';

const supabase = createClient();

interface IngredientRow {
  id: string;
  common_name: string;
  scientific_name: string | null;
  category: string;
  regulatory_status: string;
  typical_dose_mg: number | null;
  dose_unit: string;
  pregnancy_category: string | null;
}

interface FormulationRow {
  id: string;
  internal_name: string;
  delivery_form: string;
  units_per_serving: number;
  servings_per_container: number;
  intended_primary_indication: string;
  intended_adult_use: boolean;
  intended_pediatric_use: boolean;
  intended_pregnancy_use: boolean;
  status: string;
}

interface CfIngredientRow {
  id: string;
  ingredient_id: string;
  dose_per_serving: number;
  dose_unit: string;
  is_active_ingredient: boolean;
}

interface ValidationResult {
  overallPassed: boolean;
  blockerCount: number;
  warningCount: number;
  infoCount: number;
  issues: Array<{
    severity: 'blocker' | 'warning' | 'info';
    category: string;
    ingredientId?: string;
    ingredientBId?: string;
    message: string;
    suggestedFix?: string;
  }>;
  estimatedCogsPerUnitCents: number;
}

export default function FormulationBuilderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [formulation, setFormulation] = useState<FormulationRow | null>(null);
  const [cfIngredients, setCfIngredients] = useState<CfIngredientRow[]>([]);
  const [library, setLibrary] = useState<IngredientRow[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const editable = formulation?.status === 'draft';

  const refresh = useCallback(async () => {
    const [{ data: fRow }, { data: cfRows }, { data: libRows }] = await Promise.all([
      supabase.from('custom_formulations').select('*').eq('id', params.id).maybeSingle(),
      supabase
        .from('custom_formulation_ingredients')
        .select('id, ingredient_id, dose_per_serving, dose_unit, is_active_ingredient')
        .eq('custom_formulation_id', params.id)
        .order('sort_order'),
      supabase
        .from('ingredient_library')
        .select('id, common_name, scientific_name, category, regulatory_status, typical_dose_mg, dose_unit, pregnancy_category')
        .eq('is_available_for_custom_formulation', true)
        .order('common_name'),
    ]);
    setFormulation(fRow as FormulationRow | null);
    setCfIngredients((cfRows ?? []) as CfIngredientRow[]);
    setLibrary((libRows ?? []) as IngredientRow[]);
  }, [params.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runValidation = useCallback(async () => {
    const response = await fetch(`/api/practitioner/custom-formulations/${params.id}/validate`);
    if (!response.ok) {
      setValidation(null);
      return;
    }
    setValidation((await response.json()) as ValidationResult);
  }, [params.id]);

  useEffect(() => {
    if (cfIngredients.length > 0) runValidation();
    else setValidation(null);
  }, [cfIngredients, runValidation]);

  const filteredLibrary = useMemo(() => {
    const s = search.trim().toLowerCase();
    return library.filter((row) => {
      if (categoryFilter && row.category !== categoryFilter) return false;
      if (!s) return true;
      return (
        row.common_name.toLowerCase().includes(s) ||
        (row.scientific_name ?? '').toLowerCase().includes(s)
      );
    });
  }, [library, search, categoryFilter]);

  const addIngredient = async (ingredientId: string, row: IngredientRow) => {
    const response = await fetch(`/api/practitioner/custom-formulations/${params.id}/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredient_id: ingredientId,
        dose_per_serving: row.typical_dose_mg ?? 100,
        dose_unit: row.dose_unit === 'mg_per_kg' ? 'mg' : row.dose_unit,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setMessage(`Add failed: ${err.error ?? response.status}`);
      return;
    }
    await refresh();
  };

  const removeIngredient = async (ingredientId: string) => {
    const response = await fetch(
      `/api/practitioner/custom-formulations/${params.id}/ingredients?ingredient_id=${encodeURIComponent(ingredientId)}`,
      { method: 'DELETE' },
    );
    if (!response.ok) {
      setMessage('Remove failed');
      return;
    }
    await refresh();
  };

  const submit = async () => {
    setMessage(null);
    setSubmitting(true);
    const response = await fetch(`/api/practitioner/custom-formulations/${params.id}/submit`, {
      method: 'POST',
    });
    setSubmitting(false);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setMessage(`Submit failed: ${err.error ?? response.status}`);
      return;
    }
    setMessage('Submitted for review. Fadi (medical) and Steve (regulatory) will review in parallel.');
    await refresh();
  };

  const libraryById = useMemo(() => {
    const m = new Map<string, IngredientRow>();
    for (const row of library) m.set(row.id, row);
    return m;
  }, [library]);

  if (!formulation) {
    return (
      <div className="min-h-screen bg-[#0B1520] text-white p-8">
        <p className="text-sm text-white/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
        <div>
          <Link
            href="/practitioner/custom-formulations"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> My formulations
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
            {formulation.internal_name}
          </h1>
          <p className="text-xs text-white/55 mt-1">
            Status: <span className="font-semibold">{formulation.status}</span>
            {' . '}
            {formulation.delivery_form}
            {' . '}
            {formulation.servings_per_container} servings / {formulation.units_per_serving} units per serving
          </p>
        </div>

        {message && (
          <div className="rounded-xl bg-[#2DA5A0]/10 border border-[#2DA5A0]/30 px-3 py-2 text-xs text-[#2DA5A0]">
            {message}
          </div>
        )}

        <div className="grid lg:grid-cols-[300px_1fr_320px] gap-4">
          {/* Left: ingredient library */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-3 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Ingredient library
            </h2>
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40"
                strokeWidth={1.5}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] pl-8 pr-2 py-1.5 text-xs text-white"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
            >
              <option value="">All categories</option>
              {Array.from(new Set(library.map((r) => r.category))).sort().map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ul className="max-h-[70vh] overflow-y-auto divide-y divide-white/[0.06]">
              {filteredLibrary.map((row) => (
                <li key={row.id} className="py-1.5">
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => addIngredient(row.id, row)}
                    className="w-full flex items-start justify-between gap-2 text-left hover:bg-white/[0.04] rounded p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{row.common_name}</p>
                      <p className="text-[10px] text-white/45 truncate">{row.category}</p>
                    </div>
                    <Plus className="h-3.5 w-3.5 text-[#2DA5A0] flex-none" strokeWidth={1.5} />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* Center: formulation ingredients */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold">Your formulation</h2>
            {cfIngredients.length === 0 ? (
              <p className="text-xs text-white/55">No ingredients yet. Add from the library on the left.</p>
            ) : (
              <ul className="space-y-2">
                {cfIngredients.map((cfi) => {
                  const lib = libraryById.get(cfi.ingredient_id);
                  return (
                    <li
                      key={cfi.id}
                      className="flex items-center gap-3 bg-white/[0.04] rounded-lg px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">
                          {lib?.common_name ?? cfi.ingredient_id}
                        </p>
                        <p className="text-[10px] text-white/55">
                          {cfi.dose_per_serving} {cfi.dose_unit} per serving
                          {cfi.is_active_ingredient ? '' : ' . excipient'}
                        </p>
                      </div>
                      {editable && (
                        <button
                          type="button"
                          onClick={() => removeIngredient(cfi.ingredient_id)}
                          className="text-red-300 hover:text-red-200"
                        >
                          <Minus className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Right: validation + submit */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold">Validation</h2>
            {!validation ? (
              <p className="text-xs text-white/55">Add an ingredient to run validation.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {validation.overallPassed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" strokeWidth={1.5} />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-300" strokeWidth={1.5} />
                  )}
                  <span className="text-xs font-semibold">
                    {validation.overallPassed ? 'Valid' : 'Blocked'}
                  </span>
                </div>
                <p className="text-[10px] text-white/60">
                  {validation.blockerCount} blocker{validation.blockerCount === 1 ? '' : 's'}, {validation.warningCount} warning{validation.warningCount === 1 ? '' : 's'}, {validation.infoCount} info
                </p>
                <ul className="space-y-1 text-[11px] max-h-[40vh] overflow-y-auto">
                  {validation.issues.map((issue, i) => (
                    <li
                      key={i}
                      className={`rounded-lg px-2 py-1.5 flex items-start gap-1.5 ${
                        issue.severity === 'blocker'
                          ? 'bg-red-500/15 text-red-200'
                          : issue.severity === 'warning'
                          ? 'bg-amber-500/15 text-amber-200'
                          : 'bg-sky-500/10 text-sky-200'
                      }`}
                    >
                      {issue.severity === 'blocker' ? (
                        <XCircle className="h-3.5 w-3.5 flex-none mt-0.5" strokeWidth={1.5} />
                      ) : issue.severity === 'warning' ? (
                        <AlertTriangle className="h-3.5 w-3.5 flex-none mt-0.5" strokeWidth={1.5} />
                      ) : (
                        <Info className="h-3.5 w-3.5 flex-none mt-0.5" strokeWidth={1.5} />
                      )}
                      <div>
                        <p>{issue.message}</p>
                        {issue.suggestedFix && (
                          <p className="text-[10px] opacity-80 mt-0.5">Suggested: {issue.suggestedFix}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-white/[0.08] pt-2">
                  <p className="text-[11px] text-white/75">
                    Estimated COGS per unit: ${(validation.estimatedCogsPerUnitCents / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {editable && (
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !validation?.overallPassed}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#E8803A] text-[#0B1520] px-4 py-2 text-sm font-semibold hover:bg-[#E8803A]/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" strokeWidth={1.5} />
                {submitting ? 'Submitting...' : 'Submit for review'}
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
