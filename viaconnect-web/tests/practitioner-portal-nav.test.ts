// Phase 5: Practitioner portal nav contract.
// Reads the shared Sidebar source to assert that the PRACTITIONER nav
// includes the Phase 5 additions (Certification, Billing, Shop) and that
// Phase 5 page routes exist on disk.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(__dirname, '..');

describe('Practitioner portal sidebar additions', () => {
  const sidebarSrc = readFileSync(
    path.join(REPO, 'src/components/layout/Sidebar.tsx'),
    'utf8',
  );

  it('PRACTITIONER nav includes the certification route', () => {
    expect(sidebarSrc).toMatch(/['"]\/practitioner\/certification['"]/);
  });

  it('PRACTITIONER nav includes the billing route', () => {
    expect(sidebarSrc).toMatch(/['"]\/practitioner\/billing['"]/);
  });

  it('PRACTITIONER nav includes the wholesale shop route', () => {
    expect(sidebarSrc).toMatch(/['"]\/practitioner\/shop['"]/);
  });
});

describe('Phase 5 page routes exist', () => {
  it.each([
    ['certification', 'src/app/(app)/practitioner/certification/page.tsx'],
    ['billing',       'src/app/(app)/practitioner/billing/page.tsx'],
    ['shop',          'src/app/(app)/practitioner/shop/page.tsx'],
  ])('page %s is present at %s', (_name, p) => {
    expect(existsSync(path.join(REPO, p))).toBe(true);
  });
});

describe('Phase 5 page hygiene', () => {
  it.each([
    'src/app/(app)/practitioner/certification/page.tsx',
    'src/app/(app)/practitioner/billing/page.tsx',
    'src/app/(app)/practitioner/shop/page.tsx',
  ])('%s uses Lucide strokeWidth 1.5 and contains no em-dash', (p) => {
    const src = readFileSync(path.join(REPO, p), 'utf8');
    expect(src).toMatch(/strokeWidth=\{1\.5\}/);
    expect(src).not.toMatch(/—/);
  });
});
