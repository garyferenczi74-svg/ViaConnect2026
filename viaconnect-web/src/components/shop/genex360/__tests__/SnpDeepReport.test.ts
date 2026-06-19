// Prompt 193a Task T2 (2026-06-12): contract tests for SnpDeepReport.
//
// Source-as-text assertions per the repo convention (environment: 'node', no
// jsdom; no @testing-library render). These lock the nine section headings and
// their order, the maps over keyVariants and every rendered field, the tier
// color helper keyword behavior with no red styling, the empty genotype call
// guard, the Lucide strokeWidth, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'SnpDeepReport.tsx');

describe('SnpDeepReport source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  // The nine section headings, in render order.
  const HEADINGS = [
    'Variants and genotypes',
    'Biological role',
    'Functional impact',
    'Health associations',
    'Nutrient strategy',
    'Cautions',
    'Diet and lifestyle',
    'Gene interactions',
    'Your protocol',
  ];

  it('renders all nine section headings', () => {
    for (const heading of HEADINGS) {
      expect(source).toContain(heading);
    }
  });

  it('renders the nine section headings in the required order', () => {
    const positions = HEADINGS.map((heading) => source.indexOf(heading));
    // Every heading is present.
    expect(positions.every((pos) => pos >= 0)).toBe(true);
    // Positions are strictly increasing, which proves the source order.
    const sorted = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sorted);
  });

  it('types the report prop from the data layer types', () => {
    expect(source).toContain('@/data/genex360/types');
  });

  it('shows the pathway meta chip and conditionally the aliases chip', () => {
    expect(source).toContain('Pathway: ');
    expect(source).toContain('report.pathway');
    expect(source).toContain('Also known as: ');
    expect(source).toContain('report.aliases.length > 0');
    expect(source).toContain('report.aliases.join(", ")');
  });

  it('maps over report.keyVariants and renders rsid and name', () => {
    expect(source).toContain('report.keyVariants.map');
    expect(source).toContain('variant.rsid');
    expect(source).toContain('variant.name');
    expect(source).toContain('variant.genotypes.map');
  });

  it('renders each genotype call, label, and interpretation', () => {
    expect(source).toContain('genotype.genotype');
    expect(source).toContain('genotype.label');
    expect(source).toContain('genotype.interpretation');
  });

  it('renders the biologicalRole and functionalImpact paragraphs', () => {
    expect(source).toContain('report.biologicalRole');
    expect(source).toContain('report.functionalImpact');
  });

  it('maps healthAssociations and interactions as paragraphs', () => {
    expect(source).toContain('report.healthAssociations');
    expect(source).toContain('report.interactions');
    // ProseListSection maps each entry to its own paragraph.
    expect(source).toContain('paragraphs.map');
  });

  it('renders nutrientStrategy, cautions, and dietLifestyle as bullet lists', () => {
    expect(source).toContain('report.nutrientStrategy');
    expect(source).toContain('report.cautions');
    expect(source).toContain('report.dietLifestyle');
    expect(source).toContain('items.map');
  });

  it('renders the protocol tie in paragraph', () => {
    expect(source).toContain('report.protocolTieIn');
  });

  it('defines a tierClasses helper keyed by label keyword', () => {
    expect(source).toContain('function tierClasses(label: string)');
    expect(source).toContain('label.includes("Typical")');
    expect(source).toContain('label.includes("Intermediate")');
    expect(source).toContain('label.includes("Mixed")');
    expect(source).toContain('label.includes("Reduced")');
    expect(source).toContain('label.includes("Altered")');
    expect(source).toContain('label.includes("Upregulated")');
  });

  it('uses the Teal and Orange tokens in the tier helper', () => {
    expect(source).toContain('#2DA5A0');
    expect(source).toContain('#B75E18');
  });

  it('uses no red alarm styling at any tier', () => {
    expect(source).not.toContain('text-red');
    expect(source).not.toContain('bg-red');
    expect(source).not.toContain('ring-red');
    expect(source).not.toContain('border-red');
    expect(source).not.toContain('#ef4444');
    expect(source).not.toContain('#dc2626');
  });

  it('guards the empty genotype call so no empty chip renders', () => {
    // The conditional that only renders the call chip when the call is non-empty.
    expect(source).toContain('genotype.genotype !== ""');
  });

  it('collapses the variants table to a stacked layout below md', () => {
    // Stacked cards visible on small screens, hidden at md.
    expect(source).toContain('md:hidden');
    // Table shown only from md up.
    expect(source).toContain('hidden overflow-hidden rounded-lg border border-white/[0.06] md:block');
  });

  it('uses Lucide icons at strokeWidth 1.5 (no checkmark glyphs)', () => {
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).not.toContain(String.fromCharCode(0x2705)); // white heavy check mark
    expect(source).not.toContain(String.fromCharCode(0x2714)); // heavy check mark
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('SnpDeepReport variant deep link highlight (193c)', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('accepts an optional highlightRsid prop', () => {
    expect(source).toContain('highlightRsid?: string | null');
    expect(source).toContain('SnpDeepReport({ report, highlightRsid, severityByRsid }');
  });

  it('gives each variant sub block a variant- prefixed id and a sticky scroll margin', () => {
    expect(source).toContain('id={`variant-${variant.rsid}`}');
    expect(source).toContain('scroll-mt-[80px]');
  });

  it('computes the highlight by exact rsid match', () => {
    expect(source).toContain('highlightRsid === variant.rsid');
  });

  it('applies a soft teal ring and faint teal fill when highlighted (not red)', () => {
    expect(source).toContain('ring-2');
    expect(source).toContain('ring-[#2DA5A0]/60');
    expect(source).toContain('bg-[#2DA5A0]/[0.06]');
  });

  it('uses a gentle transition that prefers-reduced-motion disables', () => {
    expect(source).toContain('transition-colors');
    expect(source).toContain('motion-reduce:transition-none');
  });

  it('uses no red alarm styling for the highlight', () => {
    expect(source).not.toContain('text-red');
    expect(source).not.toContain('bg-red');
    expect(source).not.toContain('ring-red');
    expect(source).not.toContain('border-red');
    expect(source).not.toContain('#ef4444');
    expect(source).not.toContain('#dc2626');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
