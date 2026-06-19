// Prompt 191 Task C (2026-06-12): contract tests for VariantImpactFilter.
//
// Source-as-text assertions per the repo convention (environment: 'node', no
// jsdom). These lock the ARIA radiogroup wiring, roving tabindex, the four
// segment labels in order, the count wiring, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'VariantImpactFilter.tsx');

describe('VariantImpactFilter source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('declares a radiogroup with an accessible label', () => {
    expect(source).toContain('role="radiogroup"');
    expect(source).toContain('aria-label="Filter by impact"');
  });

  it('renders each option as role radio with checked state', () => {
    expect(source).toContain('role="radio"');
    expect(source).toContain('aria-checked={selected}');
  });

  it('implements roving tabindex (only the selected option is tabbable)', () => {
    expect(source).toContain('tabIndex={selected ? 0 : -1}');
  });

  it('offers the four impact segments in order', () => {
    expect(source).toContain("label: 'All'");
    expect(source).toContain("label: 'High'");
    expect(source).toContain("label: 'Moderate'");
    expect(source).toContain("label: 'Low'");
  });

  it('wires each segment to its count', () => {
    expect(source).toContain('counts[segment.countKey]');
    expect(source).toContain("countKey: 'all'");
    expect(source).toContain("countKey: 'high'");
    expect(source).toContain("countKey: 'moderate'");
    expect(source).toContain("countKey: 'low'");
  });

  it('handles arrow + Home + End keyboard navigation', () => {
    expect(source).toContain('onKeyDown');
    expect(source).toContain("case 'ArrowRight'");
    expect(source).toContain("case 'ArrowLeft'");
    expect(source).toContain("case 'Home'");
    expect(source).toContain("case 'End'");
  });

  it('gives every segment a 44px minimum touch target', () => {
    expect(source).toContain('min-h-[44px]');
  });

  it('keeps a teal accent for the All segment', () => {
    expect(source).toContain('#2DA5A0');
  });

  it('reads the High, Moderate, Low segment color only through severityToken (Prompt 204g)', () => {
    expect(source).toContain("import { severityToken } from '@/lib/genetics/severity'");
    expect(source).toContain('severityToken(TIER_BY_LABEL[label])');
    expect(source).toContain('token.pillActive');
    expect(source).toContain('token.badge');
  });

  it('inlines no severity hex (severity color lives only in the tokens)', () => {
    expect(source).not.toContain('#F87171');
    expect(source).not.toContain('#FB923C');
    expect(source).not.toContain('#A78BFA');
    expect(source).not.toContain('#FBBF24');
    expect(source).not.toContain('#4ADE80');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
