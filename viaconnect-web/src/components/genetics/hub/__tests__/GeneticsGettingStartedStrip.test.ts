// Prompt 191 Task B (2026-06-12): contract tests for
// GeneticsGettingStartedStrip.
//
// Source as text assertions per the repo convention (see
// NutritionGettingStartedStrip.test.ts); full visual sign off happens at
// Vercel preview. These lock the hardcoded Getting Started label, the
// description wired through getDisplayName, the coming soon pill text,
// the white pill text with no icon (icon parity carried from the
// nutrition model, Gary 2026-06-11), the non interactive state, the
// reserved avatar seam, the absence of any DB read, and the no dash
// rule. The nutrition model surfaces no explicit steps list, so per
// spec this strip keeps parity and renders none either.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(
  __dirname,
  '..',
  'GeneticsGettingStartedStrip.tsx',
);

describe('GeneticsGettingStartedStrip source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('hardcodes the Getting Started label', () => {
    expect(source).toContain("const LABEL = 'Getting Started'");
  });

  it('builds the description through getDisplayName with the hannah slug', () => {
    expect(source).toContain("import { getDisplayName } from '@/lib/getDisplayName'");
    expect(source).toContain(
      "`${getDisplayName('hannah')} walks you through My Genetics. Guide coming soon.`",
    );
  });

  it('sets the coming soon pill text', () => {
    expect(source).toContain("const COMING_SOON_TEXT = 'My Genetics Guide coming soon'");
  });

  it('keeps the pill white text and carries no icon', () => {
    expect(source).toContain('text-white');
    expect(source).not.toContain('PlayCircle');
    expect(source).not.toContain("from 'lucide-react'");
  });

  it('keeps the action non interactive and presentational', () => {
    expect(source).toContain('aria-disabled="true"');
    expect(source).toContain('tabIndex={-1}');
    expect(source).toContain('role="note"');
  });

  it('leaves an empty avatarSrc seam for a future Hannah avatar', () => {
    expect(source).toContain("const avatarSrc = ''");
  });

  it('reads no profile flag and no supabase data', () => {
    expect(source).not.toContain('supabase');
    expect(source).not.toContain('createClient');
    expect(source).not.toContain('has_seen');
    expect(source).not.toContain('useGuideLabel');
  });

  it('carries the hub-card-frame luminous edge ring', () => {
    expect(source).toContain("import '@/components/body-tracker/hub/hub-card-frame.css'");
    expect(source).toContain('hub-card-frame relative flex');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
