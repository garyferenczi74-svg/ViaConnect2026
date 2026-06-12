// Prompt 193 Task T3 (2026-06-12): wiring contract tests. Source string
// assertions per the repo convention (vitest node env, no jsdom).
// Prompt 193a follow-up (2026-06-12): the GeneX360PanelSection island moved off
// this PLP to the standalone /genetics/blueprint page, so the genex360 page no
// longer mounts it. ShopCategoryPage keeps its generic, backward compatible
// belowHeader slot (now unused by this page) for any future use.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PAGE = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'app',
  '(app)',
  '(consumer)',
  'shop',
  'genex360',
  'page.tsx',
);
const SHOP_CATEGORY_PAGE = path.resolve(__dirname, '..', '..', 'ShopCategoryPage.tsx');

describe('genex360 page wiring', () => {
  const source = readFileSync(PAGE, 'utf-8');

  it('no longer imports or mounts the GeneX360PanelSection island (moved to /genetics/blueprint)', () => {
    expect(source).not.toContain('GeneX360PanelSection');
    expect(source).not.toContain('belowHeader');
  });

  it('keeps the metadata export', () => {
    expect(source).toContain('export const metadata');
  });
});

describe('ShopCategoryPage belowHeader support', () => {
  const source = readFileSync(SHOP_CATEGORY_PAGE, 'utf-8');

  it('declares belowHeader as an optional ReactNode prop', () => {
    expect(source).toContain('belowHeader?: ReactNode');
  });

  it('destructures belowHeader in the component args', () => {
    expect(source).toContain('belowHeader }: ShopCategoryPageProps');
  });

  it('renders belowHeader in the tree', () => {
    expect(source).toContain('{belowHeader}');
  });
});
