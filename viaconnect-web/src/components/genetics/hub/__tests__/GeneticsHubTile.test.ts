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
// Prompt 205: the three z layer shell (frame root, CardMedia seam, scrim,
// content column) moved into the shared BentoTile that GeneticsHubTile now
// composes. The rendered output is unchanged; the chrome contract lives there.
const BENTO_TILE = path.resolve(__dirname, '..', '..', '..', 'ui', 'BentoTile.tsx');

describe('GeneticsHubTile source', () => {
  const source = readFileSync(TILE, 'utf-8');
  const tile = readFileSync(BENTO_TILE, 'utf-8');

  it('composes the shared BentoTile and keeps the SurfaceMedia type', () => {
    expect(source).toContain("import { BentoTile } from '@/components/ui/BentoTile'");
    expect(source).toContain(
      "import type { SurfaceMedia } from '@/components/body-tracker/hub/hubConfig'",
    );
  });

  it('the shared BentoTile reuses the body-tracker CardMedia and frame css', () => {
    expect(tile).toContain("import { CardMedia } from '@/components/body-tracker/hub/CardMedia'");
    expect(tile).toContain(
      "import type { SurfaceMedia } from '@/components/body-tracker/hub/hubConfig'",
    );
    expect(tile).toContain("import '@/components/body-tracker/hub/hub-card-frame.css'");
  });

  it('renders the three z layer shell (frame root, scrim, content) via BentoTile', () => {
    expect(tile).toContain('hub-card-frame');
    expect(tile).toContain('z-[1]');
    expect(tile).toContain('z-[2]');
  });

  it('defaults to a gradient seam when no media is passed', () => {
    // GeneticsHubTile forwards an empty-string gradientClass when no media is set.
    expect(source).toContain('gradientClass={media ? undefined : gradientClass ?? ');
    // BentoTile turns a present gradientClass into a gradient CardMedia descriptor.
    expect(tile).toContain("kind: 'gradient'");
    expect(tile).toContain('gradientClass');
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
