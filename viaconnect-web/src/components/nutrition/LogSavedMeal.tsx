'use client';

// Gary (2026-06-12): shared "Log a saved meal" pill + inline picker for
// the two Today's Meals surfaces (/nutrition card + My Nutrition hub
// accordion). The pill sits at the bottom of an expanded meal section;
// tapping it opens a small modal listing the user's Save My Meal library
// (the recipes system) and tapping a saved meal logs it straight to that
// section's meal type at 1 serving via the existing
// POST /api/recipes/[id]/log endpoint, which inserts a unified meals row.
// On success the shared ['user-meals'] query invalidates so both Today's
// Meals surfaces refresh.
//
// Gating mirrors RecipesLibrarySection: the pill renders nothing when
// NEXT_PUBLIC_RECIPES_LIBRARY_ENABLED is off, and the modal shows an
// unavailable message if the API answers 503. An empty library links to
// /nutrition/saved-meals to build one.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Bookmark, ChefHat, X } from 'lucide-react';
import type { MealType } from '@/lib/gordon/types';

interface PickerRecipe {
  id: string;
  name: string;
  photo_url: string | null;
  servings: number;
  total_calories: number | null;
}

const FLAG_ENABLED = process.env.NEXT_PUBLIC_RECIPES_LIBRARY_ENABLED === 'true';

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

function perServingKcal(r: PickerRecipe): number | null {
  if (typeof r.total_calories !== 'number' || !(r.servings > 0)) return null;
  return Math.round(r.total_calories / r.servings);
}

function SavedMealPickerModal({
  mealType,
  onClose,
}: {
  mealType: MealType;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [recipes, setRecipes] = useState<PickerRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingId, setLoggingId] = useState<string | null>(null);

  // Jeffery must-fix (2026-06-12): Escape closes the modal, matching the
  // validated HydrationEditPanel dismiss pattern.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/recipes');
        if (res.status === 503) {
          if (!cancelled) setError('Saved meals are temporarily unavailable.');
          return;
        }
        if (!res.ok) throw new Error('load failed');
        const j = await res.json();
        if (!cancelled) setRecipes(j.recipes ?? []);
      } catch {
        if (!cancelled) setError('Could not load your saved meals.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logRecipe = useCallback(
    async (recipe: PickerRecipe) => {
      setLoggingId(recipe.id);
      setError(null);
      try {
        const res = await fetch(`/api/recipes/${recipe.id}/log`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ servings_consumed: 1, meal_type: mealType }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(typeof j?.error === 'string' ? j.error : 'Could not log the meal.');
          return;
        }
        // No optimistic insert: the server confirms, then the shared
        // query invalidates so every Today's Meals surface refreshes.
        void queryClient.invalidateQueries({ queryKey: ['user-meals'] });
        toast.success(`Logged ${recipe.name} to ${MEAL_TYPE_LABELS[mealType]}.`);
        onClose();
      } catch {
        setError('Network error; please try again.');
      } finally {
        setLoggingId(null);
      }
    },
    [mealType, onClose, queryClient],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Log a saved meal to ${MEAL_TYPE_LABELS[mealType]}`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl bg-[#1E3054] text-white shadow-2xl sm:max-h-[70vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold">
              Log a saved meal to {MEAL_TYPE_LABELS[mealType]}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && <p className="text-sm text-white/60">Loading saved meals...</p>}

          {!loading && !error && recipes.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/15 bg-[#1A2744]/40 p-6 text-center">
              <ChefHat className="mx-auto h-8 w-8 text-white/40" strokeWidth={1.5} />
              <p className="mt-2 text-sm font-medium text-white">No saved meals yet.</p>
              <Link
                href="/nutrition/saved-meals"
                className="mt-2 inline-block text-xs font-medium text-[#2DA5A0] underline-offset-2 hover:underline"
              >
                Build your Save My Meal library
              </Link>
            </div>
          )}

          {!loading && recipes.length > 0 && (
            <ul className="flex flex-col gap-2">
              {recipes.map((r) => {
                const kcal = perServingKcal(r);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => logRecipe(r)}
                      disabled={loggingId !== null}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#1A2744]/60 p-2.5 text-left transition-colors hover:bg-[#1A2744]/80 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50"
                    >
                      {r.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.photo_url}
                          alt=""
                          className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]/40">
                          <ChefHat className="h-4 w-4 text-white/50" strokeWidth={1.5} />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-white">
                          {loggingId === r.id ? 'Logging...' : r.name}
                        </span>
                        {kcal !== null && (
                          <span className="block text-[11px] tabular-nums text-white/50">
                            {kcal} kcal/serv
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export interface LogSavedMealButtonProps {
  readonly mealType: MealType;
}

export function LogSavedMealButton({ mealType }: LogSavedMealButtonProps) {
  const [open, setOpen] = useState(false);

  // Mirror the Save My Meal library gating: when the flag is off the
  // library does not exist for the user, so the pill hides entirely.
  if (!FLAG_ENABLED) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-[#2DA5A0]/40 bg-[#2DA5A0]/10 px-3 py-1 text-[12px] font-semibold text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50"
      >
        <Bookmark className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span>Log a saved meal</span>
      </button>
      {open ? <SavedMealPickerModal mealType={mealType} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export default LogSavedMealButton;
