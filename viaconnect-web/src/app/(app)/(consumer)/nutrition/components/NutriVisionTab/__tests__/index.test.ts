// Prompt #170 Phase 1l: source presence sanity for NutriVisionTab.
//
// vitest.config.ts runs in node environment without jsdom, so a real React
// render is not viable in this suite. We assert the index source carries
// the idle-state copy + the brand tokens + the navigational chrome the spec
// requires. Real interactive coverage ships in Phase 1o (Playwright).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const INDEX = path.resolve(__dirname, '..', 'index.tsx');
const PHOTO_AI_PAGE = path.resolve(
  __dirname, '..', '..', '..', 'photo-ai', 'page.tsx',
);

describe('NutriVisionTab index source', () => {
  const source = readFileSync(INDEX, 'utf-8');

  it('renders the NutriVision page heading', () => {
    expect(source).toContain('NutriVision');
  });

  it('applies the brand token palette (Navy, Card, Teal, Orange)', () => {
    expect(source).toContain('#1A2744');
    expect(source).toContain('#1E3054');
    expect(source).toContain('#2DA5A0');
  });

  it('contains the privacy disclaimer copy verbatim', () => {
    expect(source).toContain('Photos may capture background details. Keep medications, ID, and personal documents out of frame for best privacy.');
  });

  it('contains no em dash or en dash characters', () => {
    expect(source).not.toContain('—');
    expect(source).not.toContain('–');
  });

  it('photo-ai page mounts <NutriVisionTab />', () => {
    const page = readFileSync(PHOTO_AI_PAGE, 'utf-8');
    expect(page).toContain('NutriVisionTab');
    expect(page).not.toContain('NutriVision is coming online');
  });

  // Prompt 173: after removing the 170m text-native Quick Log entry path,
  // the IdleSurface row renders exactly three cards (Photo, Scan Barcode,
  // Voice) in a grid-cols-3 layout. The 170m MessageSquareText icon import
  // is also gone.
  it('entry-path row renders exactly three cards (Photo + Scan Barcode + Voice) in grid-cols-3', () => {
    // Three EntryPathCard mounts inside IdleSurface (Photo + Scan Barcode + Voice).
    // The interior count is exact because no other site mounts EntryPathCard.
    const cardMatches = source.match(/<EntryPathCard\b/g) ?? [];
    expect(cardMatches).toHaveLength(3);
    expect(source).toContain('grid grid-cols-3 gap-2 sm:gap-3');
    // Title strings present.
    expect(source).toContain('title="Photo"');
    expect(source).toContain('title="Scan Barcode"');
    expect(source).toContain('title="Voice"');
    // The removed Quick Log card is not present.
    expect(source).not.toContain('title="Quick Log"');
    expect(source).not.toContain('MessageSquareText');
  });
});
