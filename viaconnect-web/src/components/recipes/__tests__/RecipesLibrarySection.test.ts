// Prompt 183c (2026-06-11): source as text contract test for the renamed
// recipes library heading. The only visible "My Recipes" reference was this
// section's h3; it is now "Save My Meals". The route, API calls, controls,
// empty state, list, modals, and the self gating flag are untouched.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SECTION = path.resolve(__dirname, '..', 'RecipesLibrarySection.tsx');

describe('RecipesLibrarySection source', () => {
  const source = readFileSync(SECTION, 'utf-8');

  it('renames the visible heading to Save My Meals and drops the My Recipes heading', () => {
    expect(source).toContain('Save My Meals');
    expect(source).not.toContain('>My Recipes<');
  });

  it('keeps the recipes route, API calls, and the self gating flag unchanged', () => {
    expect(source).toContain('NEXT_PUBLIC_RECIPES_LIBRARY_ENABLED');
    expect(source).toContain("fetch('/api/recipes')");
    expect(source).toContain('Browse templates');
    expect(source).toContain('New recipe');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
