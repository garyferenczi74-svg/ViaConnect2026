// Prompt 183c (2026-06-11): source as text contract test for the Save My Meals
// page. Same convention as the other hub tests (readFileSync + assert on the
// source). Locks that the new route hosts the back to hub link and the existing
// RecipesLibrarySection, stays thin (no duplicated library logic), and carries
// no em or en dashes.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PAGE = path.resolve(__dirname, '..', 'page.tsx');

describe('nutrition/saved-meals/page.tsx', () => {
  const source = readFileSync(PAGE, 'utf-8');

  it('renders BackToNutritionLink and RecipesLibrarySection', () => {
    expect(source).toContain(
      "import { BackToNutritionLink } from '@/components/nutrition/hub/BackToNutritionLink'",
    );
    expect(source).toContain('<BackToNutritionLink />');
    expect(source).toContain(
      "import { RecipesLibrarySection } from '@/components/recipes/RecipesLibrarySection'",
    );
    expect(source).toContain('<RecipesLibrarySection />');
  });

  it('hosts the section in a wide centered container so the grid breathes', () => {
    expect(source).toContain('mx-auto');
    expect(source).toContain('max-w-5xl');
  });

  it('has a default export page component', () => {
    expect(source).toContain('export default function SavedMealsPage()');
  });

  it('stays thin: does not reimplement the recipes library data or modals', () => {
    // The page hosts the section, it never fetches or owns recipe state itself.
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('useState');
    expect(source).not.toContain('RecipeEditorWizard');
    expect(source).not.toContain('PublicTemplateBrowser');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
