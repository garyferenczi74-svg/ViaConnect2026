// Brief 17: the /genetics/{slug} catch-all is a redirect or notFound(),
// never a fabricated panel with panelMeta[id] ?? { name: slug }.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PAGE = path.resolve(__dirname, '..', 'page.tsx');

describe('genetics catch-all panel route', () => {
  const source = readFileSync(PAGE, 'utf-8');

  it('is a server component that redirects known slugs or calls notFound', () => {
    expect(source).not.toContain("'use client'");
    expect(source).toContain("from 'next/navigation'");
    expect(source).toContain('blueprintHrefForPanelPath');
    expect(source).toContain('redirect(href)');
    expect(source).toContain('notFound()');
    expect(source).toContain('Allowlist only');
  });

  it('does not fabricate a panel from an unknown slug', () => {
    expect(source).not.toContain('panelMeta');
    expect(source).not.toContain('Order Test Kit');
    expect(source).not.toContain('Genetic panel data');
    expect(source).not.toContain('as any');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
