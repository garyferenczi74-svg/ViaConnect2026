'use client';

/**
 * Prompt 170f Phase D: public template browser modal.
 *
 * Lists published recipe_public_templates with diet + cuisine + meal-type
 * filters. "Save to library" CTA calls POST /api/recipes/templates/[id]/save
 * which is idempotent at (user, source_ref) so double-tap is safe.
 */

import { useEffect, useState } from 'react';
import { BookOpen, Check, X } from 'lucide-react';
import {
  RECIPE_DIET_TAGS,
  RECIPE_CUISINE_TAGS,
  RECIPE_MEAL_TYPE_TAGS,
} from '@/lib/recipes/types';

interface TemplateRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  servings: number;
  cuisine_tags: string[];
  diet_tags: string[];
  meal_type_tags: string[];
  prep_minutes: number | null;
  total_calories: number | null;
  allergen_flags: string[];
  save_count: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (recipeId: string) => void;
}

export function PublicTemplateBrowser({ open, onClose, onSaved }: Props) {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dietTag, setDietTag] = useState<string>('');
  const [cuisineTag, setCuisineTag] = useState<string>('');
  const [mealType, setMealType] = useState<string>('');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const sp = new URLSearchParams();
        if (dietTag) sp.set('diet_tag', dietTag);
        if (cuisineTag) sp.set('cuisine_tag', cuisineTag);
        if (mealType) sp.set('meal_type', mealType);
        const res = await fetch(`/api/recipes/templates?${sp.toString()}`);
        if (!res.ok) throw new Error('load failed');
        const j = await res.json();
        if (!cancelled) setTemplates(j.templates ?? []);
      } catch {
        if (!cancelled) setTemplates([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, dietTag, cuisineTag, mealType]);

  if (!open) return null;

  const handleSave = async (t: TemplateRow) => {
    setSavingId(t.id);
    try {
      const res = await fetch(`/api/recipes/templates/${t.id}/save`, { method: 'POST' });
      if (!res.ok) return;
      const j = await res.json();
      setSavedIds((prev) => new Set([...prev, t.id]));
      onSaved(j.recipe_id);
    } catch {
      // Swallow; UI stays in "Save" state so user can retry
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-t-2xl bg-[#1E3054] text-white shadow-2xl sm:max-h-[88vh] sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="inline-flex items-center gap-2 text-base font-semibold">
            <BookOpen className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
            Browse recipe templates
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </header>

        <div className="border-b border-white/10 px-5 py-3 space-y-2">
          <FilterSelect label="Diet" value={dietTag} onChange={setDietTag} options={RECIPE_DIET_TAGS} />
          <FilterSelect label="Cuisine" value={cuisineTag} onChange={setCuisineTag} options={RECIPE_CUISINE_TAGS} />
          <FilterSelect label="Meal" value={mealType} onChange={setMealType} options={RECIPE_MEAL_TYPE_TAGS as unknown as readonly string[]} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && <p className="text-sm text-white/60">Loading templates...</p>}
          {!loading && templates.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-[#1A2744]/60 p-6 text-center">
              <p className="text-sm text-white/60">No templates match those filters.</p>
              <p className="mt-1 text-xs text-white/40">Try clearing a filter or create your own recipe.</p>
            </div>
          )}
          {!loading && templates.length > 0 && (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {templates.map((t) => {
                const isSaved = savedIds.has(t.id);
                const isSaving = savingId === t.id;
                return (
                  <li key={t.id} className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1A2744]/60">
                    {t.photo_url ? (
                      <img src={t.photo_url} alt="" className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]/40 text-white/50">
                        <BookOpen className="h-8 w-8" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col gap-2 p-3">
                      <h3 className="text-sm font-semibold text-white">{t.name}</h3>
                      {t.description && <p className="line-clamp-2 text-xs text-white/60">{t.description}</p>}
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {t.diet_tags.slice(0, 2).map((d) => (
                          <span key={d} className="rounded-full bg-white/5 px-1.5 py-0.5 text-white/60">{d.replace(/_/g, ' ')}</span>
                        ))}
                        {t.cuisine_tags.slice(0, 1).map((c) => (
                          <span key={c} className="rounded-full bg-white/5 px-1.5 py-0.5 text-white/60">{c}</span>
                        ))}
                      </div>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-[11px] text-white/40">
                          {t.total_calories !== null && t.servings > 0 ? `${Math.round(t.total_calories / t.servings)} kcal/serv` : ''}
                        </span>
                        <button type="button" disabled={isSaving || isSaved} onClick={() => handleSave(t)} className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: isSaved ? 'rgba(45,165,160,0.4)' : 'linear-gradient(135deg, #2DA5A0 0%, #1E3054 100%)' }}>
                          {isSaved ? (
                            <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" strokeWidth={1.5} /> Saved</span>
                          ) : isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <label className="flex items-center gap-2 text-xs text-white/60">
      <span className="w-16 flex-none">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 rounded-md border border-white/10 bg-[#1A2744] px-2 py-1 text-xs text-white focus:border-[#2DA5A0] focus:outline-none">
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
      </select>
    </label>
  );
}
