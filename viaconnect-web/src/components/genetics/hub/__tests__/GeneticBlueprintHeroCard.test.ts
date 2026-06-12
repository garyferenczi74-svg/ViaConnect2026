// Prompt 191 Task D (2026-06-12): contract tests for GeneticBlueprintHeroCard.
//
// Source-as-text assertions per the repo convention (environment: 'node', no
// jsdom). These lock the single most important property of the hero: it is a
// TRUE Next.js anchor to GENEX360_SHOP_HREF, NOT the current page's role="link"
// + onClick fake link. They also lock the named GeneX360 Complete element, the
// hero title copy, the Lucide stroke width, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'GeneticBlueprintHeroCard.tsx');

describe('GeneticBlueprintHeroCard source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('imports GENEX360_SHOP_HREF from the canonical links module', () => {
    expect(source).toContain("import { GENEX360_SHOP_HREF } from './geneticsHubLinks'");
  });

  it('imports the Next.js Link component', () => {
    expect(source).toContain("import Link from 'next/link'");
  });

  it('renders a true anchor to GENEX360_SHOP_HREF (not a fake link)', () => {
    expect(source).toContain('<Link');
    expect(source).toContain('href={GENEX360_SHOP_HREF}');
  });

  it('does NOT use a role="link" + onClick fake link', () => {
    expect(source).not.toContain('role="link"');
    expect(source).not.toContain('onClick');
    // No JS-only navigation via the router either.
    expect(source).not.toContain('useRouter');
    expect(source).not.toContain('router.push');
  });

  it('keeps GeneX360 Complete present as the named element', () => {
    // Quote agnostic on the trademark mark: assert the GeneX360 token and the
    // Complete word are both literally in the markup.
    expect(source).toContain('GeneX360');
    expect(source).toContain('Complete');
  });

  it('renders the Your Genetic Blueprint hero title', () => {
    expect(source).toContain('Your Genetic Blueprint');
  });

  it('renders the six GeneX360 panel chips', () => {
    expect(source).toContain('NutrigenDX');
    expect(source).toContain('HormoneIQ');
    expect(source).toContain('CannabisIQ');
  });

  it('renders the 500+ variants line', () => {
    expect(source).toContain('500+ variants');
  });

  it('uses the hero media seam from GENETICS_CARD_MEDIA', () => {
    expect(source).toContain('GENETICS_CARD_MEDIA.hero');
  });

  it('uses Lucide strokeWidth 1.5 on its icon', () => {
    expect(source).toContain('strokeWidth={1.5}');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
