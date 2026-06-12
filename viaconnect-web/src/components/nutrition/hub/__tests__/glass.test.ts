// Prompt 191 (2026-06-11): contract tests for the shared blue glass recipes.
// The constants are imported directly (glass.ts is a pure string module) and
// the file is also read as text for the no dash rule, matching the hub suite
// convention.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { GLASS_CHIP, GLASS_TIER1, GLASS_TIER2_BODY, GLASS_TIER2_HEADER } from '../glass';

describe('glass recipes', () => {
  it('GLASS_TIER1: /85 fallback, supports /50 + blur-md, hairline border', () => {
    expect(GLASS_TIER1).toContain('bg-[#1A2744]/85');
    expect(GLASS_TIER1).toContain('supports-[backdrop-filter]:bg-[#1A2744]/50');
    expect(GLASS_TIER1).toContain('supports-[backdrop-filter]:backdrop-blur-md');
    expect(GLASS_TIER1).toContain('border border-white/10');
  });

  it('GLASS_TIER2_HEADER: /85 fallback, supports /55 + blur-md, bottom hairline', () => {
    expect(GLASS_TIER2_HEADER).toContain('bg-[#1A2744]/85');
    expect(GLASS_TIER2_HEADER).toContain('supports-[backdrop-filter]:bg-[#1A2744]/55');
    expect(GLASS_TIER2_HEADER).toContain('supports-[backdrop-filter]:backdrop-blur-md');
    expect(GLASS_TIER2_HEADER).toContain('border-b border-white/10');
  });

  it('GLASS_TIER2_BODY: /85 fallback, supports /50 + blur-md, border + rounded-xl', () => {
    expect(GLASS_TIER2_BODY).toContain('bg-[#1A2744]/85');
    expect(GLASS_TIER2_BODY).toContain('supports-[backdrop-filter]:bg-[#1A2744]/50');
    expect(GLASS_TIER2_BODY).toContain('supports-[backdrop-filter]:backdrop-blur-md');
    expect(GLASS_TIER2_BODY).toContain('border border-white/10');
    expect(GLASS_TIER2_BODY).toContain('rounded-xl');
  });

  it('GLASS_CHIP: white/10 tint, hairline border, text-white, blur-sm only', () => {
    expect(GLASS_CHIP).toContain('bg-white/10');
    expect(GLASS_CHIP).toContain('border border-white/10');
    expect(GLASS_CHIP).toContain('text-white');
    expect(GLASS_CHIP).toContain('supports-[backdrop-filter]:backdrop-blur-sm');
    expect(GLASS_CHIP).not.toContain('backdrop-blur-md');
  });

  it('blur ceiling: no recipe exceeds backdrop-blur-md', () => {
    for (const recipe of [GLASS_TIER1, GLASS_TIER2_HEADER, GLASS_TIER2_BODY, GLASS_CHIP]) {
      expect(recipe).not.toContain('backdrop-blur-lg');
      expect(recipe).not.toContain('backdrop-blur-xl');
      expect(recipe).not.toContain('will-change');
    }
  });

  it('glass tint is Deep Navy #1A2744 only, never an accent or #1E3054', () => {
    for (const recipe of [GLASS_TIER1, GLASS_TIER2_HEADER, GLASS_TIER2_BODY]) {
      expect(recipe).toContain('#1A2744');
      expect(recipe).not.toContain('#2DA5A0');
      expect(recipe).not.toContain('#B75E18');
      expect(recipe).not.toContain('#1E3054');
    }
  });

  it('contains no em or en dashes', () => {
    const source = readFileSync(path.resolve(__dirname, '..', 'glass.ts'), 'utf-8');
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
