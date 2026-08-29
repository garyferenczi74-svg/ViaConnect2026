// Locks DashboardHeader IA: greeting stays its own row below md;
// Guided by HannahAI + the three icon links share one toolbar row
// (chip left, icons right / justify-between). No three-row stack.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const HEADER = 'src/components/dashboard/DashboardHeader.tsx';

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function classNameAfter(haystack: string, needle: string): string {
  const from = haystack.indexOf(needle);
  expect(from).toBeGreaterThan(-1);
  const slice = haystack.slice(from, from + 280);
  const match = slice.match(/className="([^"]+)"/);
  expect(match).not.toBeNull();
  return match?.[1] ?? '';
}

describe('DashboardHeader two-row mobile IA', () => {
  const header = src(HEADER);

  it('keeps greeting on its own row and HannahAI + icons on one toolbar row', () => {
    const headerClass = classNameAfter(header, 'data-dashboard-header="true"');
    expect(headerClass).toContain('flex flex-col gap-3');
    expect(headerClass).toContain('md:flex-row');
    expect(headerClass).toContain('md:flex-wrap');
    expect(headerClass).toContain('md:items-start');
    expect(headerClass).toContain('md:justify-between');
    expect(headerClass).not.toMatch(/\bitems-start justify-between\b/);

    const greetingIdx = header.indexOf('data-dashboard-header-row="greeting"');
    const stripIdx = header.indexOf('data-dashboard-header-strip="chrome"');
    const chipRowIdx = header.indexOf('data-dashboard-header-row="guided-by"');
    const iconsIdx = header.indexOf('data-dashboard-header-row="icons"');
    const chipIdx = header.indexOf('<HannahAIGuidedByChip');

    expect(greetingIdx).toBeGreaterThan(-1);
    expect(stripIdx).toBeGreaterThan(greetingIdx);
    expect(chipRowIdx).toBeGreaterThan(stripIdx);
    expect(chipIdx).toBeGreaterThan(chipRowIdx);
    expect(iconsIdx).toBeGreaterThan(chipIdx);

    const greetingBlock = header.slice(greetingIdx, stripIdx);
    expect(greetingBlock).toContain('<h1');
    expect(greetingBlock).toContain('formatPersonalGreeting');
    expect(greetingBlock).not.toContain('HannahAIGuidedByChip');
    expect(greetingBlock).not.toContain('href="/account/notifications"');
    expect(greetingBlock).not.toContain('href="/shop"');
    expect(greetingBlock).not.toContain('href="/account/profile"');

    const chipBlock = header.slice(chipRowIdx, iconsIdx);
    expect(chipBlock).toContain('<HannahAIGuidedByChip');
    expect(chipBlock).not.toContain('href="/account/notifications"');
    expect(chipBlock).not.toContain('href="/shop"');
    expect(chipBlock).not.toContain('href="/account/profile"');

    const stripClass = classNameAfter(header, 'data-dashboard-header-strip="chrome"');
    expect(stripClass).toContain('flex');
    expect(stripClass).toContain('w-full');
    expect(stripClass).toContain('items-center');
    expect(stripClass).toContain('justify-between');
    expect(stripClass).not.toContain('flex-col');
    expect(stripClass).toContain('md:flex-wrap');
    expect(stripClass).toContain('md:flex-shrink-0');
    expect(stripClass).toContain('md:justify-end');
    expect(stripClass).toContain('md:w-auto');

    const iconsClass = classNameAfter(header, 'data-dashboard-header-row="icons"');
    expect(iconsClass).toContain('flex');
    expect(iconsClass).toContain('items-center');
    expect(iconsClass).toContain('shrink-0');
    expect(iconsClass).not.toContain('w-full');
    expect(iconsClass).not.toContain('justify-end');
    expect(header).toContain('data-dashboard-header-row="icons"');
  });

  it('does not truncate the greeting at the default or mobile classes', () => {
    const greetingIdx = header.indexOf('data-dashboard-header-row="greeting"');
    const chipRowIdx = header.indexOf('data-dashboard-header-row="guided-by"');
    const greetingBlock = header.slice(greetingIdx, chipRowIdx);
    const h1Match = greetingBlock.match(/<h1 className="([^"]+)"/);
    expect(h1Match).not.toBeNull();
    const h1Class = h1Match?.[1] ?? '';
    expect(h1Class).not.toMatch(/\btruncate\b/);
    expect(h1Class).not.toMatch(/md:truncate/);
    expect(header).not.toMatch(/<h1 className="[^"]*\btruncate\b/);
  });

  it('keeps 44px icon taps, Lucide 1.5, chip popover owner, and existing hrefs', () => {
    const iconsIdx = header.indexOf('data-dashboard-header-row="icons"');
    const iconsBlock = header.slice(iconsIdx);
    expect(iconsBlock).toContain('href="/account/notifications"');
    expect(iconsBlock).toContain('href="/shop"');
    expect(iconsBlock).toContain('href="/account/profile"');
    expect(iconsBlock).toContain('min-h-[44px]');
    expect(iconsBlock).toContain('min-w-[44px]');
    expect(iconsBlock).toContain('h-11 w-11');
    expect(iconsBlock).toContain('strokeWidth={1.5}');
    expect(iconsBlock).not.toContain('strokeWidth={2}');

    expect(header).toContain('<HannahAIGuidedByChip');
    expect(header).toMatch(/import \{ HannahAIGuidedByChip \}/);
    expect(header).not.toContain('HomeBeatEntry');
    expect(header).not.toContain('/admin/jeffery');
    expect(header).not.toContain('Jeffery');
    expect(header).not.toContain('Connections');
    expect(header).not.toContain('HannahAIChatCard');
  });
});
