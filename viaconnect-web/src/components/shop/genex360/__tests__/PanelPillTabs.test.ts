// Prompt 193 Task T3 (2026-06-12): contract tests for PanelPillTabs.
//
// Vitest runs under environment: 'node' and the repo ships no jsdom / JSX test
// pipeline, so the convention (see VariantPillTabs.test.ts) is to assert on the
// component source as text. These lock the WAI-ARIA tablist wiring, the real
// anchor pills, the roving tabindex, the full keyboard map, the mobile scroll
// affordances, the active fill contrast, the 44px target, and the no dash rule.
// Visual sign off happens at the Vercel preview.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'PanelPillTabs.tsx');

describe('PanelPillTabs source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('is a client component', () => {
    expect(source).toContain("'use client'");
  });

  it('declares the tablist row with the shared id and an accessible label', () => {
    expect(source).toContain('role="tablist"');
    expect(source).toContain('id="genex360-panels"');
    expect(source).toContain('aria-label="GENEX360 panels"');
  });

  it('makes the tablist row focusable so Back to panels can target it', () => {
    expect(source).toContain('tabIndex={-1}');
  });

  it('renders each pill as a real anchor with href to the slug hash', () => {
    expect(source).toContain('href={`#${panel.slug}`}');
    expect(source).toContain('id={`genex360-tab-${panel.slug}`}');
  });

  it('wires each pill as role tab with selection + controls', () => {
    expect(source).toContain('role="tab"');
    expect(source).toContain('aria-selected={active}');
    expect(source).toContain('aria-controls={panel.slug}');
  });

  it('implements roving tabindex (only the active pill is tabbable)', () => {
    expect(source).toContain('tabIndex={active ? 0 : -1}');
  });

  it('prevents default on click and hands off to onSelect', () => {
    expect(source).toContain('event.preventDefault()');
    expect(source).toContain('onSelect(');
  });

  it('handles the full keyboard map on the tablist', () => {
    expect(source).toContain('onKeyDown');
    expect(source).toContain("case 'ArrowRight'");
    expect(source).toContain("case 'ArrowLeft'");
    expect(source).toContain("case 'Home'");
    expect(source).toContain("case 'End'");
    expect(source).toContain("case 'Enter'");
  });

  it('moves DOM focus to the newly activated pill via refs (roving focus)', () => {
    expect(source).toContain('anchorRefs');
    expect(source).toContain('.focus()');
  });

  it('scrolls the active pill into view within the row on selection', () => {
    expect(source).toContain("inline: 'center'");
    expect(source).toContain("block: 'nearest'");
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

  it('uses a subtle border + muted text for inactive pills', () => {
    expect(source).toContain('border-white/15');
    expect(source).toContain('text-white/70');
  });

  it('gives every pill a 44px minimum touch target', () => {
    expect(source).toContain('min-h-[44px]');
  });

  it('respects prefers-reduced-motion on transitions', () => {
    expect(source).toContain('motion-reduce:transition-none');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
