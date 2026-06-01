'use client';

/**
 * Prompt 170f Phase D: recipe create/edit wizard (single page form, no
 * multi-step wizard for fasttrack v1 to keep one component).
 *
 * Mounts as bottom-sheet/modal. Submits POST /api/recipes for create or
 * PATCH /api/recipes/[id] for edit; rolls up nutrition + allergens server
 * side on save (per Phase C).
 */

import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  RECIPE_CUISINE_TAGS,
  RECIPE_DIET_TAGS,
  RECIPE_MEAL_TYPE_TAGS,
  RECIPE_UNITS,
} from '@/lib/recipes/types';

interface EditorIngredient {
  raw_name: string;
  quantity?: number;
  unit?: string;
  is_optional?: boolean;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

interface ExistingRecipe {
  id: string;
  name: string;
  description: string | null;
  servings: number;
  photo_url: string | null;
  cuisine_tags: string[];
  diet_tags: string[];
  meal_type_tags: string[];
  prep_minutes: number | null;
  ingredients: Array<{
    raw_name: string;
    quantity: number | null;
    unit: string | null;
    is_optional: boolean;
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  }>;
  steps: Array<{ position: number; body: string }>;
}

interface Props {
  open: boolean;
  existing: ExistingRecipe | null;
  onClose: () => void;
  onSaved: (recipeId: string) => void;
}

export function RecipeEditorWizard({ open, existing, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState(1);
  const [photoUrl, setPhotoUrl] = useState('');
  const [cuisineTags, setCuisineTags] = useState<string[]>([]);
  const [dietTags, setDietTags] = useState<string[]>([]);
  const [mealTypeTags, setMealTypeTags] = useState<string[]>([]);
  const [prepMinutes, setPrepMinutes] = useState<number | null>(null);
  const [ingredients, setIngredients] = useState<EditorIngredient[]>([{ raw_name: '' }]);
  const [steps, setSteps] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? '');
      setServings(existing.servings);
      setPhotoUrl(existing.photo_url ?? '');
      setCuisineTags(existing.cuisine_tags ?? []);
      setDietTags(existing.diet_tags ?? []);
      setMealTypeTags(existing.meal_type_tags ?? []);
      setPrepMinutes(existing.prep_minutes);
      setIngredients(existing.ingredients.map((i) => ({
        raw_name: i.raw_name,
        quantity: i.quantity ?? undefined,
        unit: i.unit ?? undefined,
        is_optional: i.is_optional,
        calories: i.calories ?? undefined,
        protein_g: i.protein_g ?? undefined,
        carbs_g: i.carbs_g ?? undefined,
        fat_g: i.fat_g ?? undefined,
      })));
      setSteps(existing.steps.map((s) => s.body));
    } else {
      setName('');
      setDescription('');
      setServings(1);
      setPhotoUrl('');
      setCuisineTags([]);
      setDietTags([]);
      setMealTypeTags([]);
      setPrepMinutes(null);
      setIngredients([{ raw_name: '' }]);
      setSteps(['']);
    }
    setError(null);
  }, [open, existing]);

  if (!open) return null;

  const addIngredient = () => setIngredients((prev) => [...prev, { raw_name: '' }]);
  const removeIngredient = (idx: number) => setIngredients((prev) => prev.filter((_, i) => i !== idx));
  const updateIngredient = (idx: number, patch: Partial<EditorIngredient>) =>
    setIngredients((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const addStep = () => setSteps((prev) => [...prev, '']);
  const removeStep = (idx: number) => setSteps((prev) => prev.filter((_, i) => i !== idx));
  const updateStep = (idx: number, body: string) =>
    setSteps((prev) => prev.map((s, i) => (i === idx ? body : s)));

  const toggleArrayValue = (arr: string[], value: string, setter: (v: string[]) => void) => {
    if (arr.includes(value)) setter(arr.filter((x) => x !== value));
    else setter([...arr, value]);
  };

  const handleSave = async () => {
    setError(null);
    if (name.trim().length === 0) { setError('Recipe name is required'); return; }
    const cleanIngredients = ingredients.filter((i) => i.raw_name.trim().length > 0);
    if (cleanIngredients.length === 0) { setError('At least one ingredient is required'); return; }

    setSubmitting(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      servings,
      photo_url: photoUrl.trim() || null,
      cuisine_tags: cuisineTags,
      diet_tags: dietTags,
      meal_type_tags: mealTypeTags,
      prep_minutes: prepMinutes,
      ingredients: cleanIngredients.map((i) => ({
        raw_name: i.raw_name.trim(),
        quantity: typeof i.quantity === 'number' && i.quantity > 0 ? i.quantity : undefined,
        unit: i.unit && i.unit.length > 0 ? i.unit : undefined,
        is_optional: i.is_optional ?? false,
        calories: typeof i.calories === 'number' && i.calories > 0 ? i.calories : undefined,
        protein_g: typeof i.protein_g === 'number' && i.protein_g > 0 ? i.protein_g : undefined,
        carbs_g: typeof i.carbs_g === 'number' && i.carbs_g > 0 ? i.carbs_g : undefined,
        fat_g: typeof i.fat_g === 'number' && i.fat_g > 0 ? i.fat_g : undefined,
      })),
      steps: steps.filter((s) => s.trim().length > 0).map((s) => s.trim()),
    };

    try {
      const url = existing ? `/api/recipes/${existing.id}` : '/api/recipes';
      const method = existing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(typeof j?.error === 'string' ? j.error : 'Could not save recipe');
        return;
      }
      const j = await res.json();
      onSaved(j.recipe_id);
      onClose();
    } catch {
      setError('Network error; please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-[#1E3054] text-white shadow-2xl sm:max-h-[88vh] sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-base font-semibold">{existing ? 'Edit recipe' : 'New recipe'}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <Field label="Name">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken stir-fry" className="w-full rounded-lg border border-white/10 bg-[#1A2744] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#2DA5A0] focus:outline-none" maxLength={160} />
          </Field>

          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="A note for yourself" className="w-full rounded-lg border border-white/10 bg-[#1A2744] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#2DA5A0] focus:outline-none" maxLength={2000} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Servings">
              <input type="number" min={1} max={50} value={servings} onChange={(e) => setServings(Math.max(1, Number(e.target.value) || 1))} className="w-full rounded-lg border border-white/10 bg-[#1A2744] px-3 py-2 text-sm text-white focus:border-[#2DA5A0] focus:outline-none" />
            </Field>
            <Field label="Prep minutes">
              <input type="number" min={0} max={1440} value={prepMinutes ?? ''} onChange={(e) => setPrepMinutes(e.target.value === '' ? null : Number(e.target.value))} placeholder="optional" className="w-full rounded-lg border border-white/10 bg-[#1A2744] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#2DA5A0] focus:outline-none" />
            </Field>
          </div>

          <Field label="Photo URL (optional)">
            <input type="url" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-white/10 bg-[#1A2744] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#2DA5A0] focus:outline-none" />
          </Field>

          <Field label="Meal types">
            <TagChips options={RECIPE_MEAL_TYPE_TAGS as unknown as readonly string[]} value={mealTypeTags} onToggle={(v) => toggleArrayValue(mealTypeTags, v, setMealTypeTags)} />
          </Field>

          <Field label="Diet tags">
            <TagChips options={RECIPE_DIET_TAGS} value={dietTags} onToggle={(v) => toggleArrayValue(dietTags, v, setDietTags)} />
          </Field>

          <Field label="Cuisine">
            <TagChips options={RECIPE_CUISINE_TAGS} value={cuisineTags} onToggle={(v) => toggleArrayValue(cuisineTags, v, setCuisineTags)} />
          </Field>

          <section>
            <header className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Ingredients</h3>
              <button type="button" onClick={addIngredient} className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10">
                <Plus className="h-3 w-3" strokeWidth={1.5} /> Add
              </button>
            </header>
            <div className="space-y-3">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="rounded-lg border border-white/10 bg-[#1A2744]/60 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <input type="text" value={ing.raw_name} onChange={(e) => updateIngredient(idx, { raw_name: e.target.value })} placeholder='e.g. "1 cup brown rice"' className="flex-1 rounded-lg border border-white/10 bg-[#1A2744] px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-[#2DA5A0] focus:outline-none" maxLength={160} />
                    <button type="button" onClick={() => removeIngredient(idx)} className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-red-400" aria-label="Remove ingredient">
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" min={0} step="0.1" value={ing.quantity ?? ''} onChange={(e) => updateIngredient(idx, { quantity: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="Qty" className="rounded-md border border-white/10 bg-[#1A2744] px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-[#2DA5A0] focus:outline-none" />
                    <select value={ing.unit ?? ''} onChange={(e) => updateIngredient(idx, { unit: e.target.value || undefined })} className="rounded-md border border-white/10 bg-[#1A2744] px-2 py-1 text-xs text-white focus:border-[#2DA5A0] focus:outline-none">
                      <option value="">Unit</option>
                      {RECIPE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-white/70">
                      <input type="checkbox" checked={ing.is_optional ?? false} onChange={(e) => updateIngredient(idx, { is_optional: e.target.checked })} className="rounded border-white/20 bg-[#1A2744] text-[#2DA5A0] focus:ring-[#2DA5A0]" />
                      Optional
                    </label>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <NumInput label="kcal" value={ing.calories} onChange={(v) => updateIngredient(idx, { calories: v })} />
                    <NumInput label="P g" value={ing.protein_g} onChange={(v) => updateIngredient(idx, { protein_g: v })} />
                    <NumInput label="C g" value={ing.carbs_g} onChange={(v) => updateIngredient(idx, { carbs_g: v })} />
                    <NumInput label="F g" value={ing.fat_g} onChange={(v) => updateIngredient(idx, { fat_g: v })} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <header className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Steps</h3>
              <button type="button" onClick={addStep} className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10">
                <Plus className="h-3 w-3" strokeWidth={1.5} /> Add
              </button>
            </header>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="mt-2 text-xs text-white/40">{idx + 1}.</span>
                  <textarea value={step} onChange={(e) => updateStep(idx, e.target.value)} placeholder="Describe step" rows={2} className="flex-1 rounded-lg border border-white/10 bg-[#1A2744] px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-[#2DA5A0] focus:outline-none" maxLength={2000} />
                  <button type="button" onClick={() => removeStep(idx)} className="mt-1 rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-red-400" aria-label="Remove step">
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-white/10 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10" disabled={submitting}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={submitting} className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #2DA5A0 0%, #1E3054 100%)' }}>
            {submitting ? 'Saving...' : existing ? 'Save changes' : 'Create recipe'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">{label}</span>
      {children}
    </label>
  );
}

function TagChips({ options, value, onToggle }: { options: readonly string[]; value: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const on = value.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => onToggle(opt)} className={`rounded-full px-3 py-1 text-xs transition-colors ${on ? 'bg-[#2DA5A0] text-white' : 'border border-white/15 bg-white/5 text-white/70 hover:bg-white/10'}`}>
            {opt.replace(/_/g, ' ')}
          </button>
        );
      })}
    </div>
  );
}

function NumInput({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <label className="flex flex-col text-[10px] uppercase tracking-wide text-white/40">
      <span>{label}</span>
      <input type="number" min={0} step="0.1" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} className="mt-0.5 rounded-md border border-white/10 bg-[#1A2744] px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-[#2DA5A0] focus:outline-none" />
    </label>
  );
}
