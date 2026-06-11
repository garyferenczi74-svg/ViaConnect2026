// Contract tests for NutritionHubHeader.
//
// Vitest runs under environment: 'node' with jsx: 'preserve', and the
// project ships neither jsdom nor a JSX transforming test pipeline, so
// the repo convention (see BackToNutritionLink.test.ts) is to assert on
// the component source as text. Full visual sign off happens at Vercel
// preview. These assertions lock the eyebrow, H1, subline, the Guided
// by Gordon pill wiring through getDisplayName, the Sparkles icon, the
// mobile hidden treatment, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'NutritionHubHeader.tsx');

describe('NutritionHubHeader source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('renders the MY NUTRITION eyebrow', () => {
    expect(source).toContain('MY NUTRITION');
  });

  it('renders the H1 copy', () => {
    expect(source).toContain('Your nutrition at a glance');
  });

  it('renders the subline copy', () => {
    expect(source).toContain('Eight surfaces, one hub. Tap any tile to dive in.');
  });

  it('imports getDisplayName and calls it with the gordon slug', () => {
    expect(source).toContain("import { getDisplayName } from '@/lib/getDisplayName'");
    expect(source).toContain("getDisplayName('gordon')");
  });

  it('does not hardcode the guide name next to the Guided by label', () => {
    expect(source).toContain('Guided by {getDisplayName(');
    expect(source).not.toContain('Guided by Gordon');
  });

  it('uses the Sparkles icon at strokeWidth 1.5', () => {
    expect(source).toContain("import { Sparkles } from 'lucide-react'");
    expect(source).toContain('strokeWidth={1.5}');
  });

  it('hides the guide pill on mobile via hidden md:inline-flex', () => {
    expect(source).toContain('hidden');
    expect(source).toContain('md:inline-flex');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
