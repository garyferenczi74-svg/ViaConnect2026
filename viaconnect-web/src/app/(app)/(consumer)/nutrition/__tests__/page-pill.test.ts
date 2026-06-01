// Prompt #170 Phase 1k: no-regression sanity check that the NutriVision pill
// rename + recolor landed on the /nutrition page. Reads the page source as
// text and asserts the label + accent + hover RGB are present. Full Playwright
// coverage ships in Phase 1o.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PAGE_PATH = path.resolve(
  __dirname,
  '..',
  'page.tsx',
);

describe('/nutrition page TABS array', () => {
  const source = readFileSync(PAGE_PATH, 'utf-8');

  it('renames the Photo AI pill to NutriVision', () => {
    expect(source).toContain("label: 'NutriVision'");
    expect(source).not.toContain("label: 'Photo AI'");
  });

  it('recolors the pill accent to Teal #2DA5A0', () => {
    // The pill row carries id: 'photo' alongside the accent. Match the row.
    const photoRowMatch = source.match(/id:\s*'photo'[^}]+/);
    expect(photoRowMatch).not.toBeNull();
    const row = photoRowMatch?.[0] ?? '';
    expect(row).toContain("accent: '#2DA5A0'");
    expect(row).not.toContain("'#B75E18'");
  });

  it('uses the Teal hover RGB triplet 45,165,160', () => {
    const photoRowMatch = source.match(/id:\s*'photo'[^}]+/);
    expect(photoRowMatch).not.toBeNull();
    const row = photoRowMatch?.[0] ?? '';
    expect(row).toContain("hoverRgb: '45,165,160'");
    expect(row).not.toContain("'183,94,24'");
  });

  // Prompt 173b (2026-06-01): the Log Full Meal pill was reinstated and now
  // routes through the Gordon-scored analyze-text path so meals saved there
  // surface their score on Today's Meals + Daily Macros + Dashboard gauge.
  it('renders all three channel pills (Log Full Meal + NutriVision + Connect Your App)', () => {
    expect(source).toContain("label: 'Log Full Meal'");
    expect(source).toContain("label: 'NutriVision'");
    expect(source).toContain("label: 'Connect Your App'");
    expect(source).toContain("id: 'manual'");
    expect(source).toContain("id: 'photo'");
    expect(source).toContain("id: 'connect'");
  });

  it('Log Full Meal is the leftmost (primary) channel pill', () => {
    // TABS array order: 'manual' (Log Full Meal) appears before 'photo' + 'connect'.
    const manualIdx = source.indexOf("id: 'manual'");
    const photoIdx = source.indexOf("id: 'photo'");
    const connectIdx = source.indexOf("id: 'connect'");
    expect(manualIdx).toBeGreaterThan(-1);
    expect(photoIdx).toBeGreaterThan(-1);
    expect(connectIdx).toBeGreaterThan(-1);
    expect(manualIdx).toBeLessThan(photoIdx);
    expect(photoIdx).toBeLessThan(connectIdx);
  });

  it('Log Full Meal pill routes to /nutrition/log-meal (Prompt 173b scored path)', () => {
    const manualRowMatch = source.match(/id:\s*'manual'[^}]+/);
    expect(manualRowMatch).not.toBeNull();
    const row = manualRowMatch?.[0] ?? '';
    expect(row).toContain("href: '/nutrition/log-meal'");
  });
});
