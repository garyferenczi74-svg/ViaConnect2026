// Helix Rewards stays consumer-only. Clinician nav must not surface Helix.
// Already true in PracticeSidebar / NaturopathSidebar / PRACTITIONER and
// NATUROPATH portal configs; this suite locks that contract.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(__dirname, '..');

function read(rel: string): string {
  return readFileSync(path.join(REPO, rel), 'utf8');
}

function blockBetween(src: string, start: string, end: string): string {
  const from = src.indexOf(start);
  const to = src.indexOf(end, from + start.length);
  expect(from).toBeGreaterThan(-1);
  expect(to).toBeGreaterThan(from);
  return src.slice(from, to);
}

const HELIX_NAV = /['"]\/helix['"]/;
const HELIX_LABEL = /Helix Rewards/;

describe('Helix is absent from clinician nav', () => {
  it('PracticeSidebar has no Helix route or label', () => {
    const src = read('src/components/practitioner/PracticeSidebar.tsx');
    expect(src).not.toMatch(HELIX_NAV);
    expect(src).not.toMatch(HELIX_LABEL);
  });

  it('NaturopathSidebar has no Helix route or label', () => {
    const src = read('src/components/practitioner/NaturopathSidebar.tsx');
    expect(src).not.toMatch(HELIX_NAV);
    expect(src).not.toMatch(HELIX_LABEL);
  });

  it('Sidebar PRACTITIONER config has no Helix route or label', () => {
    const src = read('src/components/layout/Sidebar.tsx');
    const block = blockBetween(src, 'const PRACTITIONER: PortalConfig = {', 'const NATUROPATH: PortalConfig = {');
    expect(block).not.toMatch(HELIX_NAV);
    expect(block).not.toMatch(HELIX_LABEL);
  });

  it('Sidebar NATUROPATH config has no Helix route or label', () => {
    const src = read('src/components/layout/Sidebar.tsx');
    const block = blockBetween(src, 'const NATUROPATH: PortalConfig = {', 'const ADMIN: PortalConfig = {');
    expect(block).not.toMatch(HELIX_NAV);
    expect(block).not.toMatch(HELIX_LABEL);
  });

  it('MobileNavBar practitioner nav has no Helix route or label', () => {
    const src = read('src/components/layout/MobileNavBar.tsx');
    const block = blockBetween(src, 'practitioner: [', 'naturopath: [');
    expect(block).not.toMatch(HELIX_NAV);
    expect(block).not.toMatch(HELIX_LABEL);
  });

  it('MobileNavBar naturopath nav has no Helix route or label', () => {
    const src = read('src/components/layout/MobileNavBar.tsx');
    const block = blockBetween(src, 'naturopath: [', 'admin: [');
    expect(block).not.toMatch(HELIX_NAV);
    expect(block).not.toMatch(HELIX_LABEL);
  });
});

describe('Helix remains on consumer nav', () => {
  it('Sidebar CONSUMER config includes Helix Rewards', () => {
    const src = read('src/components/layout/Sidebar.tsx');
    const block = blockBetween(src, 'const CONSUMER: PortalConfig = {', 'const PRACTITIONER: PortalConfig = {');
    expect(block).toMatch(HELIX_NAV);
    expect(block).toMatch(HELIX_LABEL);
  });

  it('MobileNavBar consumer nav includes Helix Rewards', () => {
    const src = read('src/components/layout/MobileNavBar.tsx');
    const block = blockBetween(src, 'consumer: [', 'practitioner: [');
    expect(block).toMatch(HELIX_NAV);
    expect(block).toMatch(HELIX_LABEL);
  });
});
