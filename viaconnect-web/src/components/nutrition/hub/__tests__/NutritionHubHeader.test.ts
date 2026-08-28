// Contract tests for NutritionHubHeader.
//
// Vitest runs under environment: 'node' with jsx: 'preserve', and the
// project ships neither jsdom nor a JSX transforming test pipeline, so
// the repo convention (see GeneticsHubHeader.test.ts) is to assert on
// the component source as text. Full visual sign off happens at Vercel
// preview. These assertions lock the eyebrow, H1, subline, a single
// HannahAIGuidedByChip (no stacked Gordon owner pill), and the no dash
// rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'NutritionHubHeader.tsx');
const CHIP = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'hannah',
  'HannahAIGuidedByChip.tsx',
);

describe('NutritionHubHeader source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');
  const chip = readFileSync(CHIP, 'utf-8');

  it('renders the MY NUTRITION eyebrow', () => {
    expect(source).toContain('MY NUTRITION');
  });

  it('renders the H1 copy', () => {
    expect(source).toContain('Your nutrition at a glance');
  });

  it('renders the subline copy', () => {
    expect(source).toContain('Eight surfaces, one hub. Tap any tile to dive in.');
  });

  it('imports HannahAIGuidedByChip and does not call getDisplayName for gordon', () => {
    expect(source).toContain('HannahAIGuidedByChip');
    expect(source).toContain('<HannahAIGuidedByChip');
    expect(chip).toContain("import { getDisplayName } from '@/lib/getDisplayName'");
    expect(chip).toContain("getDisplayName('hannahai')");
    expect(source).not.toContain("getDisplayName('gordon')");
    expect(source).not.toContain("import { getDisplayName } from '@/lib/getDisplayName'");
  });

  it('does not render a second Guided by owner pill next to HannahAI', () => {
    expect(chip).toContain('Guided by {getDisplayName(');
    expect(source).not.toContain('Guided by {getDisplayName(');
    expect(source).not.toContain('Guided by Gordon');
    expect(source).not.toContain('Guided by Arnold');
    expect(chip).not.toContain('Guided by Hannah');
    expect(chip).not.toContain('Guided by HannahAI');
  });

  it('uses the Sparkles icon at strokeWidth 1.5 on the HannahAI chip', () => {
    expect(chip).toContain("from 'lucide-react'");
    expect(chip).toContain('Sparkles');
    expect(chip).toContain('strokeWidth={1.5}');
    expect(source).not.toContain("import { Sparkles } from 'lucide-react'");
  });

  it('keeps the HannahAI chip visible on mobile and desktop', () => {
    expect(source).toContain('<HannahAIGuidedByChip');
    expect(chip).toContain('inline-flex');
    expect(chip).not.toContain('hidden md:inline-flex');
    expect(source).not.toContain('hidden md:inline-flex');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
    expect(chip.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(chip.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
