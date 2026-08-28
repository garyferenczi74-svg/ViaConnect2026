// Locks DashboardHeader IA: three stacked rows below md (greeting,
// HannahAIGuidedByChip, then the three icon links) and no truncate on
// the greeting at the default / mobile classes.

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

describe('DashboardHeader stacked mobile IA', () => {
  const header = src(HEADER);

  it('stacks greeting, HannahAI chip, and icon buttons as three rows below md', () => {
    const headerClass = classNameAfter(header, 'data-dashboard-header="true"');
    expect(headerClass).toContain('flex flex-col gap-3');
    expect(headerClass).toContain('md:flex-row');
    expect(headerClass).toContain('md:flex-wrap');
    expect(headerClass).toContain('md:items-start');
    expect(headerClass).toContain('md:justify-between');
    expect(headerClass).not.toMatch(/\bitems-start justify-between\b/);

    const greetingIdx = header.indexOf('data-dashboard-header-row="greeting"');
    const chipRowIdx = header.indexOf('data-dashboard-header-row="guided-by"');
    const iconsIdx = header.indexOf('data-dashboard-header-row="icons"');
    const chipIdx = header.indexOf('<HannahAIGuidedByChip');

    expect(greetingIdx).toBeGreaterThan(-1);
    expect(chipRowIdx).toBeGreaterThan(greetingIdx);
    expect(chipIdx).toBeGreaterThan(chipRowIdx);
    expect(iconsIdx).toBeGreaterThan(chipIdx);

    const greetingBlock = header.slice(greetingIdx, chipRowIdx);
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

    const stripIdx = header.indexOf('data-dashboard-header-strip="chrome"');
    expect(stripIdx).toBeGreaterThan(greetingIdx);
    expect(stripIdx).toBeLessThan(chipRowIdx);
    const stripClass = classNameAfter(header, 'data-dashboard-header-strip="chrome"');
    expect(stripClass).toContain('flex w-full flex-col gap-3');
    expect(stripClass).toContain('md:flex-row');
    expect(stripClass).toContain('md:flex-shrink-0');
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
