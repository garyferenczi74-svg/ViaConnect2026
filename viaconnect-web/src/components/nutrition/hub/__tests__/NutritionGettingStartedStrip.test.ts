// Contract tests for NutritionGettingStartedStrip (Prompt 228 D4: wired CTA).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(
  __dirname,
  '..',
  'NutritionGettingStartedStrip.tsx',
);

describe('NutritionGettingStartedStrip source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('hardcodes the Getting Started label', () => {
    expect(source).toContain("const LABEL = 'Getting Started'");
  });

  it('builds the description through getDisplayName with the gordon slug', () => {
    expect(source).toContain("import { getDisplayName } from '@/lib/getDisplayName'");
    expect(source).toContain("getDisplayName('gordon')");
  });

  it('Prompt 228: wires an interactive CTA to /nutrition/guide', () => {
    expect(source).toContain('href="/nutrition/guide"');
    expect(source).toContain('data-nutrition-guide-cta');
    expect(source).not.toContain('aria-disabled="true"');
    expect(source).not.toContain("const COMING_SOON_TEXT");
  });

  it('icon removal (Gary 2026-06-11): no PlayCircle icon', () => {
    expect(source).not.toContain('PlayCircle');
  });

  it('leaves an empty avatarSrc seam for a future Gordon avatar', () => {
    expect(source).toContain("const avatarSrc = ''");
  });

  it('reads no profile flag and no supabase data', () => {
    expect(source).not.toContain('supabase');
    expect(source).not.toContain('createClient');
    expect(source).not.toContain('has_seen');
  });

  it('Prompt 183f: the root carries the hub-card-frame luminous edge ring', () => {
    expect(source).toContain("import '@/components/body-tracker/hub/hub-card-frame.css'");
    expect(source).toContain('hub-card-frame relative flex');
    expect(source).not.toContain('AccentLine');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
