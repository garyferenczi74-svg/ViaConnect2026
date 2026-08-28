// Prompt 191 Task B (2026-06-12): contract tests for GeneticsHubHeader.
//
// Vitest runs under environment: 'node' with jsx: 'preserve', and the
// project ships neither jsdom nor a JSX transforming test pipeline, so
// the repo convention (see NutritionHubHeader.test.ts) is to assert on
// the component source as text. Full visual sign off happens at Vercel
// preview. These assertions lock the eyebrow, H1, subline, the Guided
// by HannahAI chip wiring through getDisplayName('hannahai'), the
// Sparkles icon, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'GeneticsHubHeader.tsx');
const CHIP = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'hannah',
  'HannahAIGuidedByChip.tsx',
);

describe('GeneticsHubHeader source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');
  const chip = readFileSync(CHIP, 'utf-8');

  it('renders the MY GENETICS eyebrow', () => {
    expect(source).toContain('MY GENETICS');
  });

  it('renders the H1 copy', () => {
    expect(source).toContain('Your genetics at a glance');
  });

  it('renders the subline copy', () => {
    expect(source).toContain('The Next Revolution in Wellness is Personalization. Tap any tile to dive in.');
  });

  it('imports getDisplayName and calls it with the hannahai slug', () => {
    expect(source).toContain('HannahAIGuidedByChip');
    expect(chip).toContain("import { getDisplayName } from '@/lib/getDisplayName'");
    expect(chip).toContain("getDisplayName('hannahai')");
    expect(source).not.toContain("getDisplayName('hannah')");
  });

  it('does not hardcode the guide name next to the Guided by label', () => {
    expect(chip).toContain('Guided by {getDisplayName(');
    expect(source).not.toContain('Guided by Hannah');
    expect(source).not.toContain('Guided by HannahAI');
    expect(chip).not.toContain('Guided by Hannah');
    expect(chip).not.toContain('Guided by HannahAI');
  });

  it('uses the Sparkles icon at strokeWidth 1.5', () => {
    expect(chip).toContain("import { Sparkles } from 'lucide-react'");
    expect(chip).toContain('strokeWidth={1.5}');
  });

  it('keeps the HannahAI chip visible on mobile and desktop', () => {
    expect(source).toContain('<HannahAIGuidedByChip');
    expect(chip).toContain('inline-flex');
    expect(chip).not.toContain('hidden md:inline-flex');
  });

  it('chip owns a compact popover under the pill instead of scrolling to a page-bottom card', () => {
    expect(chip).toMatch(/absolute|fixed/);
    expect(chip).toContain('AdvisorChat');
    expect(chip).toContain('getBoundingClientRect');
    expect(chip).not.toContain('scrollIntoView');
    expect(chip).not.toContain('hub-card-frame');
    expect(chip).not.toContain('Guided by Hannah');
    expect(chip).not.toContain('Guided by HannahAI');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
    expect(chip.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(chip.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
