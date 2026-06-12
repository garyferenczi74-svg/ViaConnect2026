// Prompt 191 Task C (2026-06-12): contract tests for VariantPillTabs.
//
// Vitest runs under environment: 'node' and the project ships no jsdom / JSX
// test pipeline, so the repo convention (see GeneticsHubHeader.test.ts) is to
// assert on the component source as text. These lock the WAI-ARIA tablist
// wiring, the roving tabindex, the full keyboard map, the count badge, and the
// no dash rule. Visual sign off happens at the Vercel preview.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'VariantPillTabs.tsx');

describe('VariantPillTabs source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('declares the tablist role with an accessible label and orientation', () => {
    expect(source).toContain('role="tablist"');
    expect(source).toContain('aria-label="Genetic tests"');
    expect(source).toContain('aria-orientation="horizontal"');
  });

  it('renders each pill as role tab with selection + controls wiring', () => {
    expect(source).toContain('role="tab"');
    expect(source).toContain('aria-selected={active}');
    expect(source).toContain('aria-controls={panelId}');
    expect(source).toContain('id={`${panelId}-tab-${test.id}`}');
  });

  it('implements roving tabindex (only the active tab is tabbable)', () => {
    expect(source).toContain('tabIndex={active ? 0 : -1}');
  });

  it('handles the full keyboard map on the tablist', () => {
    expect(source).toContain('onKeyDown');
    expect(source).toContain("case 'ArrowRight'");
    expect(source).toContain("case 'ArrowLeft'");
    expect(source).toContain("case 'Home'");
    expect(source).toContain("case 'End'");
    expect(source).toContain("case 'Enter'");
  });

  it('moves DOM focus to the newly activated tab via refs (roving focus)', () => {
    expect(source).toContain('buttonRefs');
    expect(source).toContain('onActivate(next.id)');
    expect(source).toContain('.focus()');
  });

  it('renders the trailing count badge from countsForTest', () => {
    expect(source).toContain('countsForTest(test)');
    expect(source).toContain('counts.all');
  });

  it('is horizontally scrollable with snap + no wrap on mobile and wraps at md', () => {
    expect(source).toContain('overflow-x-auto');
    expect(source).toContain('snap-x');
    expect(source).toContain('flex-nowrap');
    expect(source).toContain('md:flex-wrap');
  });

  it('hides the scrollbar via the scrollbar-hide utility', () => {
    expect(source).toContain('scrollbar-hide');
  });

  it('uses the teal active fill with AA passing dark navy text', () => {
    expect(source).toContain('bg-[#2DA5A0]');
    expect(source).toContain('text-[#1A2744]');
  });

  it('gives every pill a 44px minimum touch target', () => {
    expect(source).toContain('min-h-[44px]');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
