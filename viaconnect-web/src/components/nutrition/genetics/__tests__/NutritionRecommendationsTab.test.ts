// Prompt 187 Task 4 (2026-06-11): source as text contract tests for the
// Nutrition Recommendations tab. Lock the lib reuse (precedence + grouping
// come from the done lib, never reimplemented), the needs/avoid sub control
// on its own URL param, the accent tokens, the per card source badge, the
// empty states, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const TAB = path.resolve(__dirname, '..', 'NutritionRecommendationsTab.tsx');

describe('NutritionRecommendationsTab source', () => {
  const source = readFileSync(TAB, 'utf-8');

  it('shapes data through the done lib and never reimplements precedence or grouping', () => {
    expect(source).toContain("from '@/lib/nutrition/genetics/recommendations'");
    expect(source).toContain('applySourcePrecedence');
    expect(source).toContain('groupRecommendations');
    expect(source).toContain('fetchActiveFindings');
    expect(source).not.toContain('function applySourcePrecedence');
    expect(source).not.toContain('function groupRecommendations');
    expect(source).not.toContain('winnerBySlug');
    expect(source).toContain('groupRecommendations(applySourcePrecedence(findings))');
  });

  it('renders the needs/avoid segment via NutritionTabs on the sub param', () => {
    expect(source).toContain('paramKey="sub"');
    expect(source).toContain("{ id: 'needs', label: 'Feed Your Needs' }");
    expect(source).toContain("{ id: 'avoid', label: 'Avoid' }");
    expect(source).toContain("useNutritionActiveTab(SUB_TABS, 'needs', 'sub')");
    // The sub control announces distinctly from the primary tablist.
    expect(source).toContain('ariaLabel="Recommendation type"');
  });

  it('uses the teal accent for needs and the orange accent for avoid, surfaces stay card navy', () => {
    expect(source).toContain("'#2DA5A0'");
    expect(source).toContain("'#B75E18'");
    expect(source).toContain('bg-[#1E3054]');
    // Accents live on borders and chips only; no full bleed photography.
    expect(source).not.toContain('<img');
    expect(source).not.toContain("from 'next/image'");
  });

  it('renders the three bento sections with category icons at strokeWidth 1.5', () => {
    expect(source).toContain("{ key: 'food', title: 'Foods', icon: Apple }");
    expect(source).toContain("{ key: 'vitamin', title: 'Vitamins', icon: Pill }");
    expect(source).toContain("{ key: 'mineral', title: 'Minerals', icon: Gem }");
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).toContain('grid-cols-1');
    expect(source).toContain('md:grid-cols-3');
  });

  it('fills the strength indicator by strong/moderate/weak', () => {
    expect(source).toContain("strength === 'strong' ? 3 : strength === 'moderate' ? 2 : 1");
  });

  it('badges every card with its source and never merges values', () => {
    expect(source).toContain('NutrigenDX');
    expect(source).toContain('Uploaded Test');
    expect(source).toContain('SourceBadge');
  });

  it('collapses an empty group to a line, not an empty cell', () => {
    expect(source).toContain('No items in this category yet');
  });

  it('renders the no-results empty state with the upload CTA and the placeholder NutrigenDX CTA', () => {
    expect(source).toContain("setPrimaryTab('upload')");
    expect(source).toContain('Upload Your Nutrition Testing');
    expect(source).toContain('aria-disabled="true"');
    expect(source).toContain('Get NutrigenDX');
    expect(source).toContain('Prompt 188');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
