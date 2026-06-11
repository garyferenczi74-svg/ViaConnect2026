'use client';

/**
 * Prompt 170f Phase D: Save My Meals library section (heading renamed from My
 * Recipes in Prompt 183c).
 *
 * Mount target for the /nutrition/saved-meals page (moved off the /nutrition
 * hub in Prompt 183c). Manages state for editor wizard (create + edit), detail
 * view, and public template browser modals. Hidden entirely when
 * RECIPES_LIBRARY_ENABLED public flag is off so Phase E can flip without a page
 * redeploy (env var read on first mount).
 */

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, ChefHat, Clock, Plus, UtensilsCrossed } from 'lucide-react';
import { RecipeEditorWizard } from './RecipeEditorWizard';
import { RecipeDetailView } from './RecipeDetailView';
import { PublicTemplateBrowser } from './PublicTemplateBrowser';

interface LibraryRecipe {
  id: string;
  name: string;
  photo_url: string | null;
  servings: number;
  cuisine_tags: string[];
  diet_tags: string[];
  meal_type_tags: string[];
  prep_minutes: number | null;
  total_calories: number | null;
  total_protein_g: number | null;
  allergen_flags: string[];
  last_logged_at: string | null;
  log_count: number;
  has_unmatched_ingredients: boolean;
}

interface EditorContext {
  recipe: Parameters<typeof RecipeEditorWizard>[0]['existing'];
}

const FLAG_ENABLED = process.env.NEXT_PUBLIC_RECIPES_LIBRARY_ENABLED === 'true';

export function RecipesLibrarySection() {
  const [recipes, setRecipes] = useState<LibraryRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorContext, setEditorContext] = useState<EditorContext>({ recipe: null });
  const [detailRecipeId, setDetailRecipeId] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recipes');
      if (res.status === 503) {
        setError('disabled');
        setRecipes([]);
        return;
      }
      if (!res.ok) throw new Error('load failed');
      const j = await res.json();
      setRecipes(j.recipes ?? []);
    } catch {
      setError('Could not load recipes');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!FLAG_ENABLED) {
      setLoading(false);
      return;
    }
    load();
  }, [load]);

  if (!FLAG_ENABLED) return null;
  if (error === 'disabled') return null;

  const openCreate = () => { setEditorContext({ recipe: null }); setEditorOpen(true); };
  const openEdit = async (recipeId: string) => {
    try {
      const res = await fetch(`/api/recipes/${recipeId}`);
      if (!res.ok) return;
      const j = await res.json();
      setEditorContext({
        recipe: {
          id: j.recipe.id,
          name: j.recipe.name,
          description: j.recipe.description,
          servings: j.recipe.servings,
          photo_url: j.recipe.photo_url,
          cuisine_tags: j.recipe.cuisine_tags ?? [],
          diet_tags: j.recipe.diet_tags ?? [],
          meal_type_tags: j.recipe.meal_type_tags ?? [],
          prep_minutes: j.recipe.prep_minutes,
          ingredients: (j.ingredients ?? []).map((i: {
            raw_name: string;
            quantity: number | null;
            unit: string | null;
            is_optional: boolean;
            calories: number | null;
            protein_g: number | null;
            carbs_g: number | null;
            fat_g: number | null;
          }) => ({
            raw_name: i.raw_name,
            quantity: i.quantity,
            unit: i.unit,
            is_optional: i.is_optional,
            calories: i.calories,
            protein_g: i.protein_g,
            carbs_g: i.carbs_g,
            fat_g: i.fat_g,
          })),
          steps: j.steps ?? [],
        },
      });
      setDetailRecipeId(null);
      setEditorOpen(true);
    } catch { /* swallow */ }
  };

  return (
    <section className="rounded-xl border border-white/10 bg-[#1E3054]/35 backdrop-blur-md p-4 sm:p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-white">Save My Meals</h3>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setTemplatesOpen(true)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10">
            <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} /> Browse templates
          </button>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg, #2DA5A0 0%, #1E3054 100%)' }}>
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> New recipe
          </button>
        </div>
      </header>

      {loading && <p className="text-sm text-white/60">Loading recipes...</p>}

      {!loading && recipes.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/15 bg-[#1A2744]/40 p-6 text-center">
          <UtensilsCrossed className="mx-auto h-8 w-8 text-white/40" strokeWidth={1.5} />
          <p className="mt-2 text-sm font-medium text-white">Save a recipe to log it in one tap.</p>
          <p className="mt-1 text-xs text-white/50">Browse public templates or build your own.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => setTemplatesOpen(true)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10">Browse templates</button>
            <button type="button" onClick={openCreate} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg, #2DA5A0 0%, #1E3054 100%)' }}>New recipe</button>
          </div>
        </div>
      )}

      {!loading && recipes.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setDetailRecipeId(r.id)} className="flex w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1A2744]/60 text-left transition-colors hover:bg-[#1A2744]/80">
                {r.photo_url ? (
                  <img src={r.photo_url} alt="" className="aspect-video w-full object-cover" />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]/40 text-white/50">
                    <ChefHat className="h-8 w-8" strokeWidth={1.5} />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <h4 className="text-sm font-semibold text-white">{r.name}</h4>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {r.diet_tags.slice(0, 2).map((d) => (
                      <span key={d} className="rounded-full bg-white/5 px-1.5 py-0.5 text-white/60">{d.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                  <div className="mt-auto flex items-center justify-between text-[11px] text-white/50">
                    <span className="inline-flex items-center gap-1">
                      {r.prep_minutes !== null && (<><Clock className="h-3 w-3" strokeWidth={1.5} /> {r.prep_minutes} min</>)}
                    </span>
                    <span>
                      {r.total_calories !== null && r.servings > 0 ? `${Math.round(r.total_calories / r.servings)} kcal/serv` : ''}
                    </span>
                  </div>
                  {r.log_count > 0 && (
                    <p className="text-[10px] text-white/40">Logged {r.log_count} {r.log_count === 1 ? 'time' : 'times'}</p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && error !== 'disabled' && (
        <p className="mt-3 text-xs text-red-400">{error}</p>
      )}

      <RecipeEditorWizard
        open={editorOpen}
        existing={editorContext.recipe}
        onClose={() => setEditorOpen(false)}
        onSaved={() => { load(); }}
      />

      <RecipeDetailView
        open={detailRecipeId !== null}
        recipeId={detailRecipeId}
        onClose={() => setDetailRecipeId(null)}
        onLogged={() => { load(); }}
        onEdit={(id) => openEdit(id)}
        onArchived={() => { load(); }}
      />

      <PublicTemplateBrowser
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onSaved={() => { load(); }}
      />
    </section>
  );
}
