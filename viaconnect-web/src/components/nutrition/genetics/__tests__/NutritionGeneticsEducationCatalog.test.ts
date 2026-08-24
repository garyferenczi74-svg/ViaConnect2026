import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const CATALOG = path.resolve(__dirname, '..', 'NutritionGeneticsEducationCatalog.tsx');
const ARTICLE = path.resolve(__dirname, '..', 'NutritionGeneticsEducationArticle.tsx');
const PAGE = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'app',
  '(app)',
  '(consumer)',
  'nutrition',
  'genetics',
  'page.tsx',
);
const DETAIL = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'app',
  '(app)',
  '(consumer)',
  'nutrition',
  'genetics',
  'education',
  '[slug]',
  'page.tsx',
);

function assertNoDashes(source: string) {
  expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
  expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
}

describe('Nutrition genetics education UI source', () => {
  it('catalog frames cards as education and links all slugs', () => {
    const source = readFileSync(CATALOG, 'utf8');
    expect(source).toContain('Theme education');
    expect(source).toContain('These cards are not your genotypes');
    expect(source).toContain('Meal amounts stay on the meal plan');
    expect(source).toContain('href={`/nutrition/genetics/education/${card.slug}`}');
    expect(source).toContain('Confirmed research SNPs on this card');
    expect(source).toContain('Theme map. No rs IDs on this card.');
    expect(source).not.toContain('Your genotype');
    expect(source).not.toContain('4634');
    expect(source).not.toMatch(/demo@genemetrics\.com/i);
    expect(source).not.toMatch(/Harvard|Yale|Duke/);
    assertNoDashes(source);
  });

  it('article never treats extract SNPs as the member profile', () => {
    const source = readFileSync(ARTICLE, 'utf8');
    expect(source).toContain('Education only');
    expect(source).toContain('does not attach alleles to your profile');
    expect(source).toContain('not your results and they are not written to your profile');
    expect(source).toContain('EducationalCardMarkdown');
    expect(source).not.toContain('user_variants');
    expect(source).not.toContain('4634');
    assertNoDashes(source);
  });

  it('parent genetics page loads markdown cards and renders the catalog', () => {
    const source = readFileSync(PAGE, 'utf8');
    expect(source).toContain("from '@/lib/nutrition/genetics/educationCards'");
    expect(source).toContain('loadNutritionGeneticsEducationCards()');
    expect(source).toContain('<NutritionGeneticsEducationCatalog cards={educationCards} />');
    expect(source).not.toContain('.from(\'user_variants\').insert');
    assertNoDashes(source);
  });

  it('detail page is auth gated and read-only', () => {
    const source = readFileSync(DETAIL, 'utf8');
    expect(source).toContain("redirect('/login')");
    expect(source).toContain('loadNutritionGeneticsEducationCard(slug)');
    expect(source).toContain('<NutritionGeneticsEducationArticle');
    expect(source).toContain('href="/nutrition/genetics"');
    expect(source).not.toMatch(/\.insert\(/);
    expect(source).not.toMatch(/\.from\(['"]user_variants['"]\)/);
    assertNoDashes(source);
  });
});
