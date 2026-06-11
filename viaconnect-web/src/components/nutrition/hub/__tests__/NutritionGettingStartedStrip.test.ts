// Contract tests for NutritionGettingStartedStrip.
//
// Source as text assertions per the repo convention (see
// BackToNutritionLink.test.ts); full visual sign off happens at Vercel
// preview. These lock the hardcoded Getting Started label, the
// description wired through getDisplayName, the coming soon pill text,
// the white pill text and icon treatment, the non interactive state,
// the reserved avatar seam, the absence of any DB read, and the no dash
// rule.

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
    expect(source).toContain(
      "`${getDisplayName('gordon')} walks you through My Nutrition. Guide coming soon.`",
    );
  });

  it('sets the coming soon pill text', () => {
    expect(source).toContain("const COMING_SOON_TEXT = 'My Nutrition Guide coming soon'");
  });

  it('renders the coming soon pill text and its icon in white', () => {
    // The pill chip carries white text and the PlayCircle icon is white.
    expect(source).toContain('text-white');
    expect(source).toContain('PlayCircle className="h-3.5 w-3.5 text-white"');
  });

  it('keeps the action non interactive and presentational', () => {
    expect(source).toContain('aria-disabled="true"');
    expect(source).toContain('tabIndex={-1}');
    expect(source).toContain('role="note"');
  });

  it('leaves an empty avatarSrc seam for a future Gordon avatar', () => {
    expect(source).toContain("const avatarSrc = ''");
  });

  it('reads no profile flag and no supabase data', () => {
    expect(source).not.toContain('supabase');
    expect(source).not.toContain('createClient');
    expect(source).not.toContain('has_seen');
    expect(source).not.toContain('useGuideLabel');
  });

  it('uses Lucide strokeWidth 1.5', () => {
    expect(source).toContain('strokeWidth={1.5}');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
