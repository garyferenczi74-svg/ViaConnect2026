// Contract tests for NutritionConnectStrip.
//
// Source as text assertions per the repo convention (see
// BackToNutritionLink.test.ts); full visual sign off happens at Vercel
// preview. These lock the Connect your app title, the destination link
// at /plugins/apps, the representative static source pills shown as not
// connected, the absence of any Supabase read, the Lucide strokeWidth,
// and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'NutritionConnectStrip.tsx');

describe('NutritionConnectStrip source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('renders the Connect your app title', () => {
    expect(source).toContain("const TITLE = 'Connect your app'");
  });

  it('links to the existing Connect Your App destination', () => {
    expect(source).toContain("const HREF = '/plugins/apps'");
    expect(source).toContain('href={HREF}');
  });

  it('lists representative nutrition sources', () => {
    expect(source).toContain('Apple Health');
    expect(source).toContain('MyFitnessPal');
    expect(source).toContain('Cronometer');
  });

  it('ships every source as not connected (static, presentational)', () => {
    expect(source).not.toContain('connected: true');
    expect(source).toContain('connected: false');
  });

  it('reads nothing from Supabase', () => {
    expect(source).not.toContain('supabase');
    expect(source).not.toContain('createClient');
  });

  it('uses a Next.js Link', () => {
    expect(source).toContain("import Link from 'next/link'");
  });

  it('uses Lucide strokeWidth 1.5', () => {
    expect(source).toContain("from 'lucide-react'");
    expect(source).toContain('strokeWidth={1.5}');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
