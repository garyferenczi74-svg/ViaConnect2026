// Prompt 193 Task T3 (2026-06-12): contract tests for the GeneX360PanelSection
// island. Source string assertions per the repo convention (vitest node env, no
// jsdom). These lock the hash on mount + hashchange sync, replaceState (never
// pushState), the genex-m default, the composition of pills + card, the sr-only
// stubs for non active slugs, the aria-live announce, the reduced motion guard,
// scrollIntoView, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'GeneX360PanelSection.tsx');

describe('GeneX360PanelSection source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('is a client component', () => {
    expect(source).toContain("'use client'");
  });

  it('defaults the active slug to genex-m for deterministic SSR', () => {
    expect(source).toContain("useState<PanelSlug>('genex-m')");
  });

  it('reads the location hash on mount', () => {
    expect(source).toContain('window.location.hash');
  });

  it('registers and cleans up a hashchange listener', () => {
    expect(source).toContain("addEventListener('hashchange'");
    expect(source).toContain("removeEventListener('hashchange'");
  });

  it('updates the URL with replaceState and never pushState', () => {
    expect(source).toContain('history.replaceState');
    expect(source).not.toContain('pushState');
  });

  it('checks prefers-reduced-motion before scrolling', () => {
    expect(source).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(source).toContain('prefersReducedMotion');
  });

  it('smooth scrolls the active card into view', () => {
    expect(source).toContain('scrollIntoView');
    expect(source).toContain("behavior: prefersReducedMotion() ? 'auto' : 'smooth'");
  });

  it('composes the pill tabs and the description card', () => {
    expect(source).toContain('PanelPillTabs');
    expect(source).toContain('PanelDescriptionCard');
    expect(source).toContain('onBackToPanels={handleBack}');
  });

  it('renders sr-only stubs for every non active slug', () => {
    expect(source).toContain('panel.slug !== activeSlug');
    expect(source).toContain('aria-hidden="true"');
    expect(source).toContain('className="sr-only"');
  });

  it('announces the active panel via an aria-live region', () => {
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('Showing ${activePanel.displayName} panel');
  });

  it('moves focus to the active pill on back to panels', () => {
    expect(source).toContain('genex360-tab-${activeSlug}');
    expect(source).toContain("getElementById('genex360-panels')");
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
