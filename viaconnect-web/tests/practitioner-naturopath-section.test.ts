// Phase 6: Naturopath section in the practitioner sidebar.
// File-on-disk + sidebar-source assertions; conditional rendering logic
// is exercised end-to-end in the runtime hook (covered by Phase 6 tests
// against the sidebar source).

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { isNaturopathLikeCredential } from '@/lib/practitioner/taxonomy';

const REPO = path.resolve(__dirname, '..');

describe('isNaturopathLikeCredential reuse', () => {
  it('returns true for nd, dc, lac (the spec set)', () => {
    expect(isNaturopathLikeCredential('nd')).toBe(true);
    expect(isNaturopathLikeCredential('dc')).toBe(true);
    expect(isNaturopathLikeCredential('lac')).toBe(true);
  });
  it('returns false for md, do, np, pa, rd, other', () => {
    for (const c of ['md', 'do', 'np', 'pa', 'rd', 'other']) {
      expect(isNaturopathLikeCredential(c)).toBe(false);
    }
  });
});

describe('Phase 6 page routes exist', () => {
  it.each([
    ['holistic-advisor',  'src/app/(app)/practitioner/naturopath/holistic-advisor/page.tsx'],
    ['botanicals',        'src/app/(app)/practitioner/naturopath/botanicals/page.tsx'],
    ['constitutional',    'src/app/(app)/practitioner/naturopath/constitutional/page.tsx'],
    ['natural-protocols', 'src/app/(app)/practitioner/naturopath/natural-protocols/page.tsx'],
  ])('page %s is present', (_name, p) => {
    expect(existsSync(path.join(REPO, p))).toBe(true);
  });
});

describe('Phase 6 page hygiene', () => {
  it.each([
    'src/app/(app)/practitioner/naturopath/holistic-advisor/page.tsx',
    'src/app/(app)/practitioner/naturopath/botanicals/page.tsx',
    'src/app/(app)/practitioner/naturopath/constitutional/page.tsx',
    'src/app/(app)/practitioner/naturopath/natural-protocols/page.tsx',
  ])('%s uses Lucide strokeWidth 1.5 and contains no em-dash', (p) => {
    const src = readFileSync(path.join(REPO, p), 'utf8');
    expect(src).toMatch(/strokeWidth=\{1\.5\}/);
    expect(src).not.toMatch(/—/);
  });
});

describe('Sidebar conditional naturopath section', () => {
  const sidebarSrc = readFileSync(
    path.join(REPO, 'src/components/layout/Sidebar.tsx'),
    'utf8',
  );

  it('imports isNaturopathLikeCredential from the taxonomy module', () => {
    expect(sidebarSrc).toMatch(/isNaturopathLikeCredential/);
  });

  it('declares the four naturopath route paths', () => {
    expect(sidebarSrc).toMatch(/['"]\/practitioner\/naturopath\/holistic-advisor['"]/);
    expect(sidebarSrc).toMatch(/['"]\/practitioner\/naturopath\/botanicals['"]/);
    expect(sidebarSrc).toMatch(/['"]\/practitioner\/naturopath\/constitutional['"]/);
    expect(sidebarSrc).toMatch(/['"]\/practitioner\/naturopath\/natural-protocols['"]/);
  });

  it('queries the practitioners table for credential_type', () => {
    expect(sidebarSrc).toMatch(/from\(['"]practitioners['"]\)/);
    expect(sidebarSrc).toMatch(/credential_type/);
  });
});
