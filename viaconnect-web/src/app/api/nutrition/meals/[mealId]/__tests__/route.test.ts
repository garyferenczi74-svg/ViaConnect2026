// Gary (2026-06-13): contract tests for the meals DELETE route legacy fallback.
// Manual text meals (the analyze-text path) live in the legacy nutrition_logs
// table, not the canonical meals table, but are surfaced in Today's Meals via
// useUserMeals. The Remove control used to 404 on them and the meal readds itself.
// Source as text assertions per the repo convention (no DB needed): they lock the
// fallback so a future refactor cannot silently drop it.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROUTE = path.resolve(__dirname, '..', 'route.ts');

describe('meals DELETE route legacy fallback (Gary 2026-06-13)', () => {
  const source = readFileSync(ROUTE, 'utf-8');

  it('looks up the canonical meals table first', () => {
    expect(source).toContain(".from('meals')");
    expect(source).toContain(".eq('meal_id', mealId)");
  });

  it('falls back to the legacy nutrition_logs table when not in meals', () => {
    expect(source).toContain(".from('nutrition_logs')");
    expect(source).toContain(".eq('id', mealId)");
  });

  it('404s only when the row is in neither table', () => {
    expect(source).toContain('if (!meal && !legacyMeal) {');
    expect(source).toContain('{ status: 404 }');
  });

  it('deletes from whichever table holds the row, scoped to the user', () => {
    expect(source).toContain("const targetTable = meal ? 'meals' : 'nutrition_logs';");
    expect(source).toContain("const idColumn = meal ? 'meal_id' : 'id';");
    expect(source).toContain('.from(targetTable)');
    expect(source).toContain('.eq(idColumn, mealId)');
    expect(source).toContain(".eq('user_id', user.id)");
  });

  it('confirms a row was actually removed (no silent RLS no-op)', () => {
    expect(source).toContain('.select(idColumn)');
    expect(source).toContain('deletedRows.length === 0');
  });

  it('keeps the hydration redirect for canonical meals only', () => {
    expect(source).toContain("if (meal && meal.meal_kind === 'hydration_only')");
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
