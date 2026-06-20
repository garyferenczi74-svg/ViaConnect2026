'use client';

// Prompt 193c Task T2 (2026-06-12): the Report deep link pill on an expanded
// Your Variants SNP card. It resolves the matching full report on the Your
// Genetic Blueprint page through resolveVariantReport (the single source of
// truth for the join) and never renders a dead link: when no matching report
// exists, this component returns null and the card's footer right side is empty.
//
// Visual: a TEAL OUTLINE pill, deliberately distinct from the FILLED severity
// chips on the same card. Teal #2DA5A0 border with WHITE label text (Gary
// 2026-06-13) on the Card surface meets WCAG AA. The href is whatever the
// resolver builds (it composes BLUEPRINT_ROUTE internally); this component never
// hardcodes the route.
//
// Standing rules honored: tokens only (Navy #1A2744, Teal #2DA5A0, white
// opacity neutrals), Lucide strokeWidth 1.5 outline icons, Instrument Sans
// inherited, no emojis, no em or en dashes, TypeScript strict (no any).

import Link from 'next/link';
import { ArrowUpRight, FileText } from 'lucide-react';
import { resolveVariantReport } from '@/lib/genex360/resolveVariantReport';

interface VariantReportPillProps {
  rsid: string;
  panelSlug: string;
  geneLabel: string;
  variantLabel: string;
  // Prompt 204i: the variant's gene, for the gene-level fallback so a variant
  // whose exact rsID is not a keyVariant still links to its gene report.
  gene?: string;
}

export function VariantReportPill({
  rsid,
  panelSlug,
  geneLabel,
  variantLabel,
  gene,
}: VariantReportPillProps) {
  const target = resolveVariantReport(rsid, panelSlug, gene);

  // No matching report: never render a dead link. The card footer simply shows
  // the consult note with an empty right side.
  if (!target.exists) {
    return null;
  }

  // The card's gene field usually already contains the variant (for example
  // "MTHFR C677T"), so guard against a doubled label like "MTHFR C677T C677T".
  const accessibleName = geneLabel.includes(variantLabel)
    ? geneLabel
    : `${geneLabel} ${variantLabel}`;

  // Prompt 204i (Hannah): a gene-level fallback link must NOT imply a
  // variant-specific report. When the report has no variant block for this rsID,
  // label it as the gene report ("Gene report") and drop the rsID from the
  // accessible name, so the pill never overstates the clinical specificity.
  const geneLevel = target.level === "gene";
  const label = geneLevel ? "Gene report" : "Report";
  const ariaLabel = geneLevel
    ? `View the ${geneLabel} gene report`
    : `View full ${accessibleName} report`;

  return (
    <Link
      href={target.href}
      aria-label={ariaLabel}
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#2DA5A0]/50 bg-transparent px-3.5 py-1.5 text-[12px] font-semibold text-white no-underline transition-colors duration-200 hover:bg-[#2DA5A0]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none"
    >
      <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
      {label}
      <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
    </Link>
  );
}

export default VariantReportPill;
