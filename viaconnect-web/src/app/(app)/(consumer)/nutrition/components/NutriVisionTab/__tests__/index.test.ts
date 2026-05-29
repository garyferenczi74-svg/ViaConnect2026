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
});
