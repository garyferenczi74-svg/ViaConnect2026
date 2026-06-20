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
    expect(source).toContain('export function SnpDeepReport({');
    expect(source).toContain('severityByRsid,');
    expect(source).toContain('userSex,');
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

describe('SnpDeepReport STATUS scale (Prompt 204i, Typical / Moderate / High)', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('renders the STATUS chip via StatusChip in both the mobile and desktop tables', () => {
    expect(source).toContain('function StatusChip');
    // Both genotype tables (mobile cards + desktop table) use StatusChip.
    const chipUses = source.split('<StatusChip genotype={genotype} refAllele={refAllele} />').length - 1;
    expect(chipUses).toBe(2);
  });

  it('derives the tier from effect-allele copies: 0 Typical, 1 Moderate, 2 High', () => {
    expect(source).toContain('function statusTierFor');
    expect(source).toContain('copies === 0 ? "Typical" : copies === 1 ? "Moderate" : "High"');
    // The reference allele is read from the Typical-labeled (baseline) genotype.
    expect(source).toContain('function referenceAllele');
    expect(source).toContain('g.label.includes("Typical")');
  });

  it('colors the derived tier through severityToken (Typical green, Moderate yellow, High red)', () => {
    expect(source).toContain('STATUS_TIER_TO_SEVERITY');
    expect(source).toContain('Typical: "low"');
    expect(source).toContain('Moderate: "moderate"');
    expect(source).toContain('High: "high"');
    expect(source).toContain('severityToken(STATUS_TIER_TO_SEVERITY[tier]).badge');
  });

  it('falls back to the original descriptive label when no clean tier can be derived', () => {
    // A non two-base call (Null/Present, Rapid/Slow, VNTR repeats) keeps tierClasses.
    expect(source).toContain('if (!tier) {');
    expect(source).toContain('tierClasses(genotype.label)');
  });
});

describe('SnpDeepReport member genotype-row highlight (Prompt 204i)', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('marks the member own genotype row by matching their severity tier to the row tier', () => {
    expect(source).toContain('function isUsersGenotypeRow');
    expect(source).toContain('rowTier === severityToStatusTier(userTier)');
    expect(source).toContain('function severityToStatusTier');
    // Computed per row in both the mobile and desktop tables.
    const uses = source.split('isUsersGenotypeRow(genotype, refAllele, userTier)').length - 1;
    expect(uses).toBe(2);
  });

  it('renders a consistent Your result chip on the member row (204k inline, not floating)', () => {
    expect(source).toContain('function YourResultTag');
    expect(source).toContain('Your result');
    // Prompt 204k: the marker is a single inline chip beside the status pill on
    // both layouts, the same place and shape on every report. The old floating
    // pill (a block under the CALL cell) is gone.
    expect(source).toContain('{isUserRow ? <YourResultTag hemizygous={maleHemizygous} /> : null}');
    expect(source).not.toContain('mt-1.5 block');
    // The matched-row background is no longer the brand-teal tint; the row tier
    // glass (severityToken) now carries it (asserted in the 204k describe below).
    expect(source).not.toContain('isUserRow ? "bg-[#2DA5A0]/[0.08]"');
  });

  it('handles X-linked MAOA rs6323 sex-aware: female diploid, male hemizygous, unknown no-mark (204i)', () => {
    expect(source).toContain('SEX_LINKED_X_RSIDS');
    expect(source).toContain('"rs6323"');
    // Markable only when sex is known (autosomal always; X-linked needs sex).
    expect(source).toContain('!xLinked || userSex === "female" || userSex === "male"');
    expect(source).toContain('maleHemizygous = xLinked && userSex === "male"');
    // A hemizygous male can only map to a homozygous-call row.
    expect(source).toContain('!maleHemizygous || isHomozygousCall(genotype.genotype)');
    expect(source).toContain('function isHomozygousCall');
    // The male tag notes the single X copy.
    expect(source).toContain('Your result (one X copy)');
  });

  it('explains an unmappable X-linked variant when the member sex is unknown', () => {
    expect(source).toContain('xLinkedSexUnknown = xLinked && hasUserResult && userSex == null');
    expect(source).toContain('This is an X-linked variant');
  });

  it('carries a non-clinical qualifier near the highlighted row', () => {
    expect(source).toContain('Educational reference, not a diagnosis');
  });
});

describe('SnpDeepReport row tier glass tint (Prompt 204k)', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('derives a row tint tier from the same status tier as the pill', () => {
    expect(source).toContain('function rowSeverityFor');
    // Reuses statusTierFor + STATUS_TIER_TO_SEVERITY, the same mapping the pill uses.
    expect(source).toContain('STATUS_TIER_TO_SEVERITY[tier]');
  });

  it('tints every row from severityToken, stronger glass on the matched row', () => {
    // Both layouts read the tint from severityToken (no inline severity hex).
    expect(source).toContain('severityToken(rowSev).rowGlass');
    expect(source).toContain('severityToken(rowSev).rowGlassMatched');
    // The matched row carries the tier edge: a left accent on the desktop table,
    // a tier border on the stacked mobile card.
    expect(source).toContain('severityToken(rowSev).accent');
    expect(source).toContain('severityToken(rowSev).matchedBorder');
    // Computed once per layout (mobile cards + desktop table).
    const uses = source.split('rowSeverityFor(genotype, refAllele)').length - 1;
    expect(uses).toBe(2);
  });

  it('no longer paints the matched row with the brand teal fill', () => {
    expect(source).not.toContain('isUserRow ? "bg-[#2DA5A0]/[0.08]"');
  });

  it('keeps the YOUR RESULT marker inline, not floating under the CALL cell', () => {
    expect(source).not.toContain('mt-1.5 block');
  });
});
