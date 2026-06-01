'use client';

/**
 * Prompt 170f Phase D: recipe detail modal/sheet.
 *
 * Loads full recipe + ingredients + steps. Shows per-serving nutrition
 * panel. "Log this meal" CTA calls POST /api/recipes/[id]/log with
 * servings_consumed default 1 and meal_type picker.
 */

import { useEffect, useState } from 'react';
import { Clock, Edit3, Info, Trash2, X } from 'lucide-react';
import type { RecipeMealType } from '@/lib/recipes/types';

interface DetailRecipe {
  id: string;
  name: string;
  description: string | null;
  servings: number;
  photo_url: string | null;
  cuisine_tags: string[];
  diet_tags: string[];
  meal_type_tags: string[];
  prep_minutes: number | null;
  total_calories: number | null;
  total_protein_g: number | null;
  total_carbs_g: number | null;
  total_fat_g: number | null;
  total_fiber_g: number | null;
  total_sugar_g: number | null;
  total_sodium_mg: number | null;
  has_unmatched_ingredients: boolean;
  allergen_flags: string[];
  log_count: number;
  last_logged_at: string | null;
}

interface DetailIngredient {
  position: number;
  raw_name: string;
  quantity: number | null;
  unit: string | null;
  is_optional: boolean;
}

interface DetailStep { position: number; body: string }

interface Props {
  open: boolean;
  recipeId: string | null;
  onClose: () => void;
  onLogged: () => void;
  onEdit: (recipeId: string) => void;
  onArchived: () => void;
}

export function RecipeDetailView({ open, recipeId, onClose, onLogged, onEdit, onArchived }: Props) {
  const [recipe, setRecipe] = useState<DetailRecipe | null>(null);
  const [ingredients, setIngredients] = useState<DetailIngredient[]>([]);
  const [steps, setSteps] = useState<DetailStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [logging, setLogging] = useState(false);
  const [servingsConsumed, setServingsConsumed] = useState(1);
  const [mealType, setMealType] = useState<RecipeMealType>('snack');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !recipeId) {
      setRecipe(null);
      setIngredients([]);
      setSteps([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/recipes/${recipeId}`);
        if (!res.ok) throw new Error('Could not load recipe');
        const j = await res.json();
        if (cancelled) return;
        setRecipe(j.recipe);
        setIngredients(j.ingredients ?? []);
        setSteps(j.steps ?? []);
        const firstMeal = (j.recipe.meal_type_tags ?? [])[0];
        if (firstMeal === 'breakfast' || firstMeal === 'lunch' || firstMeal === 'dinner') {
          setMealType(firstMeal);
        }
      } catch {
        if (!cancelled) setError('Could not load recipe');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, recipeId]);

  if (!open) return null;

  const perServing = (total: number | null) => recipe && recipe.servings > 0 && typeof total === 'number'
    ? Math.round((total / recipe.servings) * 10) / 10
    : null;

  const handleLog = async () => {
    if (!recipe) return;
    setLogging(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/log`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ servings_consumed: servingsConsumed, meal_type: mealType }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(typeof j?.error === 'string' ? j.error : 'Could not log meal');
        return;
      }
      onLogged();
      onClose();
    } catch {
      setError('Network error; please try again.');
    } finally {
      setLogging(false);
    }
  };

  const handleArchive = async () => {
    if (!recipe) return;
    if (!window.confirm(`Archive ${recipe.name}? It can be restored later.`)) return;
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, { method: 'DELETE' });
      if (!res.ok) {
        setError('Could not archive recipe');
        return;
      }
      onArchived();
      onClose();
    } catch {
      setError('Network error; please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-[#1E3054] text-white shadow-2xl sm:max-h-[88vh] sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-base font-semibold">{recipe?.name ?? 'Loading...'}</h2>
          <div className="flex items-center gap-1">
            {recipe && (
              <>
                <button type="button" onClick={() => onEdit(recipe.id)} className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Edit recipe">
                  <Edit3 className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button type="button" onClick={handleArchive} className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-red-400" aria-label="Archive recipe">
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </>
            )}
            <button type="button" onClick={onClose} className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close">
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading && <p className="text-sm text-white/60">Loading recipe...</p>}
          {!loading && recipe && (
            <>
              {recipe.photo_url && (
                <img src={recipe.photo_url} alt={recipe.name} className="aspect-video w-full rounded-xl object-cover" />
              )}

              {recipe.description && (
                <p className="text-sm text-white/70">{recipe.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" strokeWidth={1.5} /> {recipe.prep_minutes ?? '?'} min</span>
                <span>Serves {recipe.servings}</span>
                {recipe.last_logged_at && (
                  <span>Logged {recipe.log_count} {recipe.log_count === 1 ? 'time' : 'times'}</span>
                )}
              </div>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Per serving</h3>
                <div className="grid grid-cols-4 gap-2">
                  <Stat label="Cal" value={perServing(recipe.total_calories)} />
                  <Stat label="Protein" value={perServing(recipe.total_protein_g)} unit="g" />
                  <Stat label="Carbs" value={perServing(recipe.total_carbs_g)} unit="g" />
                  <Stat label="Fat" value={perServing(recipe.total_fat_g)} unit="g" />
                </div>
                {recipe.has_unmatched_ingredients && (
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-white/50">
                    <Info className="h-3 w-3" strokeWidth={1.5} /> Some ingredients have no nutrition data; totals may be incomplete.
                  </p>
                )}
              </section>

              {recipe.allergen_flags.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Allergens</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {recipe.allergen_flags.map((a) => (
                      <span key={a} className="rounded-full bg-[#B75E18]/20 px-2 py-0.5 text-[11px] text-[#FBA86C]">{a.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Ingredients</h3>
                <ul className="space-y-1.5 text-sm text-white/85">
                  {ingredients.map((ing) => (
                    <li key={ing.position} className="flex items-baseline gap-2">
                      <span className="text-white/40">·</span>
                      <span>
                        {ing.quantity ? `${ing.quantity} ` : ''}
                        {ing.unit ? `${ing.unit} ` : ''}
                        {ing.raw_name}
                        {ing.is_optional && <em className="ml-1 text-xs text-white/40">(optional)</em>}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {steps.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Steps</h3>
                  <ol className="space-y-2 text-sm text-white/85">
                    {steps.map((s) => (
                      <li key={s.position} className="flex items-start gap-2">
                        <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#2DA5A0]/20 text-[11px] font-semibold text-[#2DA5A0]">{s.position + 1}</span>
                        <span>{s.body}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {recipe && (
          <footer className="border-t border-white/10 px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-white/60">
                Servings consumed
                <input type="number" min={0.25} max={20} step="0.25" value={servingsConsumed} onChange={(e) => setServingsConsumed(Math.max(0.25, Number(e.target.value) || 1))} className="mt-1 w-full rounded-lg border border-white/10 bg-[#1A2744] px-3 py-1.5 text-sm text-white focus:border-[#2DA5A0] focus:outline-none" />
              </label>
              <label className="text-xs text-white/60">
                Meal type
                <select value={mealType} onChange={(e) => setMealType(e.target.value as RecipeMealType)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#1A2744] px-3 py-1.5 text-sm text-white focus:border-[#2DA5A0] focus:outline-none">
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </label>
            </div>
            <button type="button" onClick={handleLog} disabled={logging} className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #2DA5A0 0%, #1E3054 100%)' }}>
              {logging ? 'Logging...' : 'Log this meal'}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  return (
    <div className="rounded-lg bg-[#1A2744] p-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-white">
        {value === null ? '?' : value}
        {unit && value !== null && <span className="ml-0.5 text-xs font-normal text-white/40">{unit}</span>}
      </p>
    </div>
  );
}
