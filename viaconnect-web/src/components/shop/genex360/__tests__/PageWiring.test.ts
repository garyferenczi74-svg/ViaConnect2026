// Prompt 193 Task T3 (2026-06-12): wiring contract tests. Source string
// assertions per the repo convention (vitest node env, no jsdom). These confirm
// the genex360 page mounts the island through ShopCategoryPage's belowHeader
// prop, and that ShopCategoryPage accepts and renders belowHeader in a minimal,
// backward compatible way.

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

  it('imports the GeneX360PanelSection island', () => {
    expect(source).toContain(
      "import { GeneX360PanelSection } from '@/components/shop/genex360/GeneX360PanelSection'",
    );
  });

  it('passes the island through the belowHeader prop', () => {
    expect(source).toContain('belowHeader={<GeneX360PanelSection />}');
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
