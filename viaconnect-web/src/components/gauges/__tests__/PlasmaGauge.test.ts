// Prompt 183a (2026-06-11): source as text contract tests for the additive,
// default-preserving PlasmaGauge changes. Same convention the hub tests use
// (readFileSync + assert on the source). These lock the new teal hub palette
// entry, that the two new props are optional, and that the existing per metric
// color formulas (orb, ring, bead) and the nutrition palette are untouched.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'PlasmaGauge.tsx');

describe('PlasmaGauge source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('adds the plasmateal metric to the GaugeMetric union', () => {
    expect(source).toContain("| 'plasmateal'");
  });

  it('adds the exact plasmateal palette entry to METRIC_COLORS', () => {
    expect(source).toContain(
      "plasmateal:{ c: '#2DA5A0', bright: '#7fd6d2', deep: '#1c6f6c', glow: 'rgba(45,165,160,0.55)' }",
    );
  });

  it('leaves the nutrition palette entry unchanged (the Dashboard reads it)', () => {
    expect(source).toContain(
      "nutrition: { c: '#3FB46B', bright: '#79D89C', deep: '#228048', glow: 'rgba(63,180,107,.5)' }",
    );
  });

  it('declares both new props as optional', () => {
    expect(source).toContain('caption?: string;');
    expect(source).toContain('valueFontPx?: number;');
  });

  it('keeps the default value font size when valueFontPx is omitted', () => {
    expect(source).toContain('fontSize: valueFontPx ?? size * 0.27');
  });

  it('renders the caption in place of the sublabel and uppercases it', () => {
    expect(source).toContain('caption !== undefined ?');
    expect(source).toContain("textTransform: 'uppercase'");
    // The original sublabel path is preserved for the no-caption case.
    expect(source).toContain('const sublabel = unit ? `of ${max} ${unit}` : `/ ${max}`');
  });

  it('does not change the orb, ring, or bead gradient formulas', () => {
    // The progress stop formula and the count up bead class remain as shipped.
    expect(source).toContain('? [(M as Material).dark, (M as Material).bright, (M as Material).hi, (M as Material).mid]');
    expect(source).toContain(': [mc.deep, mc.c, mc.bright]');
    expect(source).toContain('className="g-bead-cw"');
  });

  // Prompt 183b: the additive, default-preserving displayValue prop.
  it('declares displayValue as an optional prop', () => {
    expect(source).toContain('displayValue?: number;');
  });

  it('shows the count-up value in the center when displayValue is omitted', () => {
    // centerNumber falls back to the count-up n unless displayValue is set, so
    // an omitting call site renders byte-identical to before.
    expect(source).toContain(
      'const centerNumber = displayValue !== undefined ? Math.round(displayValue) : n;',
    );
    // The center renders centerNumber, not the raw count-up n directly.
    expect(source).toContain('{centerNumber}{valueSuffix ?? \'\'}');
    expect(source).not.toContain('}}>{n}{valueSuffix');
  });

  it('keeps the progress ring driven by value, not displayValue', () => {
    // The ring fraction p is computed from value/max; the progress arc path
    // progD is derived from p. displayValue never enters that computation.
    expect(source).toContain('const p = Math.max(0.0001, Math.min(1, value / (max || 100)));');
    expect(source).toContain('const progD = arcPath(cx, cy, R, 0, p);');
    expect(source).not.toContain('displayValue / ');
    expect(source).not.toContain('arcPath(cx, cy, R, 0, displayValue');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
