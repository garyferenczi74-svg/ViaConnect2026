// Prompt 191 Task C (2026-06-12): contract tests for GeneticsHubTile + links.
//
// Source-as-text assertions per the repo convention (environment: 'node', no
// jsdom). These lock the three z layer shell, the CardMedia reuse, the gradient
// default, the GENEX360_SHOP_HREF source, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const TILE = path.resolve(__dirname, '..', 'GeneticsHubTile.tsx');
const LINKS = path.resolve(__dirname, '..', 'geneticsHubLinks.ts');

describe('GeneticsHubTile source', () => {
  const source = readFileSync(TILE, 'utf-8');

  it('reuses the body-tracker CardMedia and SurfaceMedia + frame css', () => {
    expect(source).toContain("import { CardMedia } from '@/components/body-tracker/hub/CardMedia'");
    expect(source).toContain(
      "import type { SurfaceMedia } from '@/components/body-tracker/hub/hubConfig'",
    );
    expect(source).toContain("import '@/components/body-tracker/hub/hub-card-frame.css'");
  });

  it('renders the three z layer shell (frame root, scrim, content)', () => {
    expect(source).toContain('hub-card-frame');
    expect(source).toContain('z-[1]');
    expect(source).toContain('z-[2]');
  });

  it('defaults to a gradient media descriptor when no media is passed', () => {
    expect(source).toContain("kind: 'gradient'");
    expect(source).toContain('gradientClass: gradientClass ?? ');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('geneticsHubLinks source', () => {
  const source = readFileSync(LINKS, 'utf-8');

  it('sources the GeneX360 slug from the canonical shop categories module', () => {
    // Quote agnostic: this data module uses double quotes like its sibling data
    // files, so assert the symbol and the module path separately.
    expect(source).toContain('getShopCategoryBySlug');
    expect(source).toContain('@/lib/shop/categories');
    expect(source).toContain('GENEX360_SHOP_HREF');
    expect(source).toContain('genex360');
  });

  it('builds the canonical /shop path', () => {
    expect(source).toContain('/shop/');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
