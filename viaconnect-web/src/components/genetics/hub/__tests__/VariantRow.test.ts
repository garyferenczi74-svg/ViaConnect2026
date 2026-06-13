// Prompt 191 Task C (2026-06-12): contract tests for VariantRow.
//
// Source-as-text assertions per the repo convention (environment: 'node', no
// jsdom). These lock the MANDATORY impact chip hexes, the expand wiring, the
// reduced motion guard, the rs chip, the carried over consult disclaimer, and
// the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'VariantRow.tsx');

describe('VariantRow source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('colors the High impact chip Red', () => {
    expect(source).toContain('#F87171');
  });

  it('colors the Moderate impact chip Orange', () => {
    expect(source).toContain('#FB923C');
  });

  it('colors the Low impact chip Purple', () => {
    expect(source).toContain('#A78BFA');
  });

  it('wires the toggle expand region (aria-expanded + aria-controls + region)', () => {
    expect(source).toContain('aria-expanded={isOpen}');
    expect(source).toContain('aria-controls={panelId}');
    expect(source).toContain('role="region"');
    expect(source).toContain('aria-labelledby={rowId}');
  });

  it('gives the toggle button id={rowId} so aria-labelledby resolves to a real element', () => {
    // Guards the dangling-reference defect: aria-labelledby={rowId} on the
    // region must point at the toggle button, which carries id={rowId}.
    expect(source).toContain('id={rowId}');
  });

  it('respects prefers reduced motion via useReducedMotion to duration 0', () => {
    expect(source).toContain('useReducedMotion');
    expect(source).toContain('reduced ? { duration: 0 }');
  });

  it('animates height auto on expand', () => {
    expect(source).toContain("height: 'auto'");
  });

  it('renders the genotype chip and an rs chip', () => {
    expect(source).toContain('variant.genotype');
    expect(source).toContain("variant.rsId.replace('rs', '')");
  });

  it('carries the practitioner consult disclaimer', () => {
    expect(source).toContain('Consult a practitioner before making changes based on genetic data');
  });

  it('declares the new panelSlug prop in the props type (Prompt 193c T2)', () => {
    expect(source).toContain('panelSlug: string;');
  });

  it('mounts the Report pill in the footer with rsid and panelSlug threaded through', () => {
    expect(source).toContain('VariantReportPill');
    expect(source).toContain('rsid={variant.rsId}');
    expect(source).toContain('panelSlug={panelSlug}');
    expect(source).toContain('geneLabel={variant.gene}');
    expect(source).toContain('variantLabel={variant.variant}');
  });

  it('lays the footer note left and the pill right, stacking on narrow mobile', () => {
    expect(source).toContain('sm:flex-row sm:items-center sm:justify-between');
    expect(source).toContain('flex justify-end');
  });

  it('gives the toggle a 44px minimum touch target', () => {
    expect(source).toContain('min-h-[44px]');
  });

  it('uses Lucide icons at strokeWidth 1.5', () => {
    expect(source).toContain('strokeWidth={1.5}');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
