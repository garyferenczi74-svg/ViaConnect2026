// Locks the four shortened My Genetics chip labels and the section-tab
// colors those chips reuse. Contrast is the WCAG 2.1 relative-luminance
// ratio of the teal label against the opaque plate (and against the hover
// navy). AA for this text size is 4.5:1.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  GENETICS_ACTION_CTA_COPY,
  GENETICS_ACTION_TAB_BAR,
  GENETICS_ACTION_TAB_CTA_CLASS,
  GENETICS_ACTION_TAB_HOVER,
  GENETICS_ACTION_TAB_TEXT,
  GENETICS_ACTION_TAB_WASH,
} from '../geneticsActionTabCta';

const NAV = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'layout',
  'MobileNavBar.tsx',
);
const PORTAL = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'AdminPortalDetector.tsx',
);

function channel(hex: string): [number, number, number] {
  const raw = hex.replace('#', '');
  return [
    parseInt(raw.slice(0, 2), 16),
    parseInt(raw.slice(2, 4), 16),
    parseInt(raw.slice(4, 6), 16),
  ];
}

function linear(channelValue: number): number {
  const s = channelValue / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb: [number, number, number]): number {
  return 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return (hi + 0.05) / (lo + 0.05);
}

function mix(
  fg: [number, number, number],
  bg: [number, number, number],
  alpha: number,
): [number, number, number] {
  return [
    Math.round(fg[0] * alpha + bg[0] * (1 - alpha)),
    Math.round(fg[1] * alpha + bg[1] * (1 - alpha)),
    Math.round(fg[2] * alpha + bg[2] * (1 - alpha)),
  ];
}

describe('genetics action tab chips', () => {
  const nav = readFileSync(NAV, 'utf-8');
  const portal = readFileSync(PORTAL, 'utf-8');

  it('reuses the section sub-nav active tab tokens', () => {
    expect(nav).toContain('bg-[rgba(45,165,160,0.15)] text-[#2DA5A0] border border-[rgba(45,165,160,0.3)]');
    expect(nav).toContain('min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap');
    expect(nav).toContain('hover:bg-[#1A2744]/80');
    expect(nav).toContain('strokeWidth={1.5}');
    expect(GENETICS_ACTION_TAB_CTA_CLASS).toContain('min-h-[44px]');
    expect(GENETICS_ACTION_TAB_CTA_CLASS).toContain('gap-1.5 px-3 py-2');
    expect(GENETICS_ACTION_TAB_CTA_CLASS).toContain('rounded-full text-xs font-medium whitespace-nowrap');
    expect(GENETICS_ACTION_TAB_CTA_CLASS).toContain('border border-[rgba(45,165,160,0.3)] text-[#2DA5A0]');
    expect(GENETICS_ACTION_TAB_CTA_CLASS).toContain('rgba(45,165,160,0.15)');
    expect(GENETICS_ACTION_TAB_CTA_CLASS).toContain('group-hover:bg-[#1A2744]');
    expect(GENETICS_ACTION_TAB_CTA_CLASS).toContain('group-focus-visible:ring-2');
    expect(GENETICS_ACTION_TAB_CTA_CLASS).toContain('group-active:border-[#2DA5A0]');
  });

  it('reuses the portal tab shape and hover fill', () => {
    expect(portal).toContain('rounded-full font-medium');
    expect(portal).toContain('hover:bg-[#1A2744]/80');
    expect(portal).toContain('min-h-[44px]');
  });

  it('shortens each visible label by at least 25 percent and keeps the original aria phrase', () => {
    const expected = {
      uploadDna: { visible: 'DNA', aria: 'Upload DNA' },
      uploadLabs: { visible: 'Labs', aria: 'Upload Labs' },
      catalog: { visible: 'Catalog', aria: 'Browse Catalog' },
      panels: { visible: 'Panels', aria: 'View Panels' },
    } as const;
    for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
      const copy = GENETICS_ACTION_CTA_COPY[key];
      expect(copy).toEqual(expected[key]);
      expect(copy.visible.includes(' ')).toBe(false);
      expect(copy.visible.length).toBeLessThanOrEqual(Math.ceil(copy.aria.length * 0.75));
    }
  });

  it('keeps the Playwright fixture on the same chip class string', () => {
    const fixture = readFileSync(
      path.resolve(__dirname, '..', '..', '..', '..', '..', 'tests', 'e2e', 'genetics', 'action-card-tabs.fixture.html'),
      'utf-8',
    );
    expect(fixture).toContain(GENETICS_ACTION_TAB_CTA_CLASS);
  });

  it('keeps teal label contrast at AA over the opaque tab plate and the hover navy', () => {
    const text = channel(GENETICS_ACTION_TAB_TEXT);
    const bar = channel(GENETICS_ACTION_TAB_BAR);
    const hover = channel(GENETICS_ACTION_TAB_HOVER);
    const plate = mix(text, bar, GENETICS_ACTION_TAB_WASH);
    expect(contrast(text, plate)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(text, hover)).toBeGreaterThanOrEqual(4.5);
    // A white card behind a see-through wash would fail. The plate is opaque.
    const blownOut = mix(text, [255, 255, 255], GENETICS_ACTION_TAB_WASH);
    expect(contrast(text, blownOut)).toBeLessThan(4.5);
    expect(contrast(text, plate)).toBeGreaterThan(contrast(text, blownOut));
  });
});
