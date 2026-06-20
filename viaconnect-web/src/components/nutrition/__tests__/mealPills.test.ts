// Gary (2026-06-12): source as text contract tests for the shared Today's
// Meals write affordances: the useRemoveMeal hook (the Prompt 177i remove
// machinery extracted from TodaysMealsSummary), the red RemoveMealPill, and
// the LogSavedMealButton + picker that logs from the Save My Meal library.
// Same convention the hub tests use (readFileSync + assert on the source);
// full visual sign off happens on localhost:3000.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const HOOK = path.resolve(__dirname, '..', 'useRemoveMeal.tsx');
const PILL = path.resolve(__dirname, '..', 'RemoveMealPill.tsx');
const LOG = path.resolve(__dirname, '..', 'LogSavedMeal.tsx');
const SUMMARY = path.resolve(__dirname, '..', 'TodaysMealsSummary.tsx');

describe('useRemoveMeal source', () => {
  const source = readFileSync(HOOK, 'utf-8');

  it('keeps the 177i undo semantics: 5 second window, optimistic removal, undo toast', () => {
    expect(source).toContain('REMOVE_UNDO_WINDOW_MS = 5_000');
    expect(source).toContain("queryKey: ['user-meals']");
    expect(source).toContain('Undo');
    expect(source).toContain('toast.dismiss(t.id)');
  });

  it('commits via DELETE /api/nutrition/meals/[mealId] with the 8 second timeout', () => {
    expect(source).toContain('REMOVE_API_TIMEOUT_MS = 8_000');
    expect(source).toContain('/api/nutrition/meals/${mealId}');
    expect(source).toMatch(/method:\s*'DELETE'/);
  });

  it('keeps the Gary 2026-06-09 flush on unload fix with keepalive', () => {
    expect(source).toContain('keepalive: true');
    expect(source).toContain("window.addEventListener('pagehide', flushPendingDeletes)");
    expect(source).toContain("document.addEventListener('visibilitychange', onVisibility)");
  });

  it('restores the row on a failed delete (fail open)', () => {
    expect(source).toContain('Could not remove the meal; restored it.');
    expect(source).toContain('restoreMeal');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('RemoveMealPill source', () => {
  const source = readFileSync(PILL, 'utf-8');

  it('is a red rounded full pill defaulting to the Remove Meal label', () => {
    expect(source).toContain('rounded-full');
    expect(source).toContain('border-red-400/40');
    expect(source).toContain('bg-red-500/10');
    expect(source).toContain('text-red-300');
    // Gary (2026-06-12): label is overridable so multi meal sections can
    // name each pill; the default stays Remove Meal and long names truncate.
    expect(source).toContain("label = 'Remove Meal'");
    expect(source).toContain('truncate');
    // Not the old orange trash treatment.
    expect(source).not.toContain('#B75E18');
  });

  it('owns no removal logic; the click handler is injected', () => {
    expect(source).not.toContain('fetch(');
    expect(source).toContain('onClick: () => void');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('LogSavedMeal source', () => {
  const source = readFileSync(LOG, 'utf-8');

  it('gates on the recipes library flag exactly like RecipesLibrarySection', () => {
    expect(source).toContain("process.env.NEXT_PUBLIC_RECIPES_LIBRARY_ENABLED === 'true'");
    expect(source).toContain('if (!FLAG_ENABLED) return null;');
  });

  it('reads the library via GET /api/recipes and treats 503 as unavailable', () => {
    expect(source).toContain("fetch('/api/recipes')");
    expect(source).toContain('res.status === 503');
  });

  it('logs one serving to the section meal type via the existing log endpoint', () => {
    expect(source).toContain('/api/recipes/${recipe.id}/log');
    expect(source).toContain('servings_consumed: 1');
    expect(source).toContain('meal_type: mealType');
  });

  it('refreshes both surfaces by invalidating the shared user-meals query', () => {
    expect(source).toContain("queryClient.invalidateQueries({ queryKey: ['user-meals'] })");
  });

  it('links an empty library to the Save My Meal page', () => {
    expect(source).toContain('/nutrition/saved-meals');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('TodaysMealsSummary hydration progress bar (Prompt 207 Task 6)', () => {
  const source = readFileSync(SUMMARY, 'utf-8');

  it('renders a hydration progress bar reflecting percentage of target', () => {
    // Source-as-text: verify the progressbar role markup and aria-valuenow
    // binding are present. Render tests are impractical (node env, no jsdom).
    expect(source).toContain('role="progressbar"');
    expect(source).toContain('aria-label="Hydration progress toward daily target"');
    expect(source).toContain('aria-valuenow={hydrationPct}');
    expect(source).toContain('aria-valuemin={0}');
    expect(source).toContain('aria-valuemax={100}');
  });

  it('derives hydrationPct clamped 0-100 from hydrationToday?.percentage_of_target', () => {
    expect(source).toContain('const hydrationPct = Math.max(0, Math.min(100, Math.round(hydrationToday?.percentage_of_target ?? 0)))');
  });

  it('fills the bar with teal #2DA5A0 and width tied to hydrationPct', () => {
    expect(source).toContain("backgroundColor: '#2DA5A0'");
    expect(source).toContain('`${hydrationPct}%`');
  });

  it('places the bar inside the hydration section, after the button, before the expanded body', () => {
    // The button ends before the progressbar div; the isOpen body comes after.
    const buttonEnd = source.indexOf('</button>', source.indexOf('logSurface') > -1 ? 0 : source.indexOf('Hydration'));
    const progressBarStart = source.indexOf('role="progressbar"');
    const expandedBody = source.indexOf('isOpen ?');
    // The last isOpen check (hydration section) must come after the progressbar.
    const lastIsOpen = source.lastIndexOf('isOpen ?');
    expect(progressBarStart).toBeGreaterThan(buttonEnd);
    expect(lastIsOpen).toBeGreaterThan(progressBarStart);
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('TodaysMealsSummary source after the shared extraction', () => {
  const source = readFileSync(SUMMARY, 'utf-8');

  it('delegates removal to the shared hook and pill', () => {
    expect(source).toContain("import { useRemoveMeal } from '@/components/nutrition/useRemoveMeal'");
    expect(source).toContain("import { RemoveMealPill } from '@/components/nutrition/RemoveMealPill'");
    expect(source).toContain('<RemoveMealPill');
    // The inline 177i machinery is gone from this file.
    expect(source).not.toContain('REMOVE_UNDO_WINDOW_MS');
    expect(source).not.toContain('pendingDeletes');
    expect(source).not.toMatch(/method:\s*'DELETE'/);
    // The orange trash controls are gone.
    expect(source).not.toContain('Trash2');
    expect(source).not.toContain('#B75E18');
  });

  it('mounts the Log a saved meal pill per meal section', () => {
    expect(source).toContain("import { LogSavedMealButton } from '@/components/nutrition/LogSavedMeal'");
    expect(source).toContain('<LogSavedMealButton mealType={def.id} />');
  });

  it('Gary 2026-06-12: the Remove Meal pills sit in the footer row, bottom right, inline with Log a saved meal', () => {
    // One footer flex row per section: saved meal pill left, remove pills
    // pushed right via ml-auto. No pill renders under the meal cards.
    expect(source).toContain('ml-auto flex flex-wrap items-center justify-end gap-1.5');
    const footerRow = source.indexOf('<LogSavedMealButton mealType={def.id} />');
    const removeGroup = source.indexOf('ml-auto flex flex-wrap items-center justify-end gap-1.5');
    expect(footerRow).toBeGreaterThan(-1);
    expect(removeGroup).toBeGreaterThan(footerRow);
    expect(source).not.toContain('mt-1.5 flex justify-end');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
