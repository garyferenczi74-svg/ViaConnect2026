'use client';

// Prompt 204f (2026-06-19): the two-tab shell around one GeneXM variant report on
// the Your Genetic Blueprint page. It puts a plain-language Description in front
// of the dense Prompt 193a deep report, and keeps the full technical content
// behind a Full Report tab, unchanged.
//
// Tabs:
//   Description (default on a plain open) renders, in source order (Prompt 204j):
//     the validated laySummary when one exists, otherwise the deep report's lead
//     summary paragraph (the same marker.description the Full Report shows at its
//     top, reused as the per-variant description), otherwise a neutral interim
//     orientation that introduces NO fabricated specifics for the gene. The build
//     never authors clinical lay copy: it only reuses validated content (the
//     laySummary or the existing marker.description) or shows the safe placeholder.
//   Full Report holds the existing content unchanged: the marker description
//     paragraph followed by the SnpDeepReport. This component does not alter the
//     deep report; it only moves it behind a tab.
//
// Deep-link interaction (preserves Prompt 204e). When the report is opened through
// a variant deep link from the Report pill, the island sets highlightRsid and
// scrolls to the variant sub block (id variant-<rsid>) inside SnpDeepReport on the
// next frame. That block only exists when the Full Report tab is rendered, so the
// default tab is decided in the useState initializer (not a post-mount effect):
// if highlightRsid matches a variant in this report, the tab opens on Full Report
// so the variant is in the DOM before the island's requestAnimationFrame scroll
// fires, keeping the 204e highlight visible. A plain open lands on Description.
//
// Tab control mirrors PanelPillTabs: a WAI-ARIA tablist with roving tabindex,
// arrow / Home / End navigation and automatic activation, a visible focus ring,
// and a 44px minimum tap target. The content swap is an instant conditional
// render (no animated transition), which respects prefers-reduced-motion by
// construction; the pill hover and active transitions carry motion-reduce.
//
// Standing rules honored: tokens only (Deep Navy #1A2744, Card #1E3054, Teal
// #2DA5A0, white opacity neutrals), Lucide strokeWidth 1.5 outline icons, no
// emojis, no em or en dashes, TypeScript strict (no any). Any emphasis stays a
// soft Teal, never an alarm color. Consumer brand text lives in the data.

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, FileText, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PanelMarker, SnpDeepReport as SnpDeepReportData } from '@/data/genex360/types';
import { SnpDeepReport } from './SnpDeepReport';
import type { SeverityTier } from '@/lib/genetics/severity';
import type { BiologicalSex } from '@/hooks/body-tracker/useUserBiologicalSex';

// The consult note shown on every Description tab, validated or interim. Matches
// the existing approved short copy used across the genetics surface.
const CONSULT_NOTE = 'Consult a practitioner before making changes based on genetic data';

// Prompt 204i (Gary 2026-06-19): destination of the per-report "Back to Your
// Variants" control. VariantReportTabs is only mounted on /genetics/blueprint (a
// My Genetics surface reached from the Your Variants Report pill), so it returns
// to the Your Variants list on /genetics, landing on its #your-variants anchor.
const YOUR_VARIANTS_HREF = '/genetics#your-variants';

type ReportTab = 'description' | 'full';

interface VariantReportTabsProps {
  marker: PanelMarker;
  report: SnpDeepReportData;
  highlightRsid: string | null;
  // Prompt 204g: the member's severity by rsID, forwarded to SnpDeepReport for
  // the Full Report cross-reference.
  severityByRsid?: ReadonlyMap<string, SeverityTier | null>;
  // Prompt 204i: the member's biological sex, forwarded for X-linked (MAOA) rows.
  userSex?: BiologicalSex | null;
  // Prompt 204 follow-up (go-live blocker 1): the member's canonical genotype by
  // rsID, forwarded so SnpDeepReport marks the member's exact row.
  userGenotypeByRsid?: ReadonlyMap<string, string>;
  // Go-live: the panel slug, forwarded so the STATUS chip reads this panel's
  // validated severity (panel-scoped).
  panelSlug?: string;
}

// True when the active variant deep link targets a variant that lives in THIS
// report. Used to decide the default tab and to re-assert Full Report on a later
// deep link.
function targetsThisReport(report: SnpDeepReportData, highlightRsid: string | null): boolean {
  return highlightRsid != null && report.keyVariants.some((v) => v.rsid === highlightRsid);
}

export function VariantReportTabs({
  marker,
  report,
  highlightRsid,
  severityByRsid,
  userSex,
  userGenotypeByRsid,
  panelSlug,
}: VariantReportTabsProps) {
  const slug = marker.symbol.toLowerCase();

  // Default tab decided in the initializer so a variant deep link has Full Report
  // (and thus the variant sub block) in the DOM before the island's rAF scroll.
  const [activeTab, setActiveTab] = useState<ReportTab>(
    targetsThisReport(report, highlightRsid) ? 'full' : 'description',
  );

  // A later variant deep link onto an already mounted report (for example a
  // hashchange) re-asserts Full Report. Keyed on highlightRsid so a manual switch
  // to Description afterward is not yanked back (highlightRsid is then unchanged).
  useEffect(() => {
    if (targetsThisReport(report, highlightRsid)) {
      setActiveTab('full');
    }
  }, [report, highlightRsid]);

  const tabs: Array<{ id: ReportTab; label: string; icon: LucideIcon }> = [
    { id: 'description', label: 'Description', icon: BookOpen },
    { id: 'full', label: 'Full Report', icon: FileText },
  ];

  // One ref per tab button so arrow navigation can move DOM focus (roving focus).
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

  const focusAndActivate = (index: number) => {
    const count = tabs.length;
    const wrapped = ((index % count) + count) % count;
    setActiveTab(tabs[wrapped].id);
    tabRefs.current[wrapped]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = activeIndex < 0 ? 0 : activeIndex;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        focusAndActivate(current + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        focusAndActivate(current - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAndActivate(0);
        break;
      case 'End':
        event.preventDefault();
        focusAndActivate(tabs.length - 1);
        break;
      default:
        break;
    }
  };

  const idBase = `report-tabs-${slug}`;

  return (
    <div className="space-y-4">
      {/* Header row: the WAI-ARIA tablist (Description / Full Report) on the
          leading edge, and the Back to Your Variants control on the trailing edge
          (Prompt 204i, Gary). The back control sits OUTSIDE the tablist so the
          tablist only ever contains tabs. On narrow widths it wraps below. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
      {/* Tab control: WAI-ARIA tablist mirroring PanelPillTabs. */}
      <div
        role="tablist"
        aria-label={`${marker.symbol} report views`}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-2"
      >
        {tabs.map((tab, index) => {
          const active = tab.id === activeTab;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${idBase}-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`${idBase}-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-h-[44px] flex-none items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none ${
                active
                  ? 'bg-[#2DA5A0] text-[#1A2744]'
                  : 'border border-white/15 bg-[#1E3054] text-white/70 hover:border-white/35 hover:text-white/90'
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {tab.label}
            </button>
          );
        })}
      </div>

        {/* Back to Your Variants: a Next Link styled like an inactive tab pill so
            it reads as part of the report header beside the tabs, but it is a nav
            link (outside the tablist), not a tab. 44px target, focus ring. */}
        <Link
          href={YOUR_VARIANTS_HREF}
          className="inline-flex min-h-[44px] flex-none items-center gap-1.5 rounded-full border border-white/15 bg-[#1E3054] px-4 py-2 text-[13px] font-semibold text-white/70 no-underline transition-colors duration-200 hover:border-white/35 hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          Back to Your Variants
        </Link>
      </div>

      {/* Description tabpanel: validated laySummary or the neutral interim state. */}
      {activeTab === 'description' ? (
        <div
          role="tabpanel"
          id={`${idBase}-panel-description`}
          aria-labelledby={`${idBase}-tab-description`}
          tabIndex={0}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
        >
          <DescriptionView
            symbol={marker.symbol}
            laySummary={report.laySummary ?? []}
            deepReportSummary={marker.description}
          />
        </div>
      ) : null}

      {/* Full Report tabpanel: the existing 193a content, unchanged. */}
      {activeTab === 'full' ? (
        <div
          role="tabpanel"
          id={`${idBase}-panel-full`}
          aria-labelledby={`${idBase}-tab-full`}
          tabIndex={0}
          className="space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
        >
          <p className="text-[13px] leading-relaxed text-white/75">{marker.description}</p>
          <SnpDeepReport
            report={report}
            highlightRsid={highlightRsid}
            severityByRsid={severityByRsid}
            userSex={userSex}
            userGenotypeByRsid={userGenotypeByRsid}
            panelSlug={panelSlug}
          />
        </div>
      ) : null}
    </div>
  );
}

// The Description body. Source order (Prompt 204j): a validated laySummary wins
// when one exists; otherwise the deep report's lead summary paragraph (the same
// marker.description the Full Report shows at its top) is reused as the
// Description; otherwise the neutral interim orientation. Reusing
// marker.description shows validated content only and authors no new clinical
// copy, so this stays inside the 204d rule. The consult note shows in every case.
function DescriptionView({
  symbol,
  laySummary,
  deepReportSummary,
}: {
  symbol: string;
  laySummary: string[];
  deepReportSummary: string;
}) {
  const trimmedDeepSummary = deepReportSummary.trim();
  const summaryParagraphs =
    laySummary.length > 0
      ? laySummary
      : trimmedDeepSummary.length > 0
        ? [trimmedDeepSummary]
        : [];
  const hasSummary = summaryParagraphs.length > 0;
  return (
    <div className="space-y-4">
      {hasSummary ? (
        <div className="space-y-3">
          {summaryParagraphs.map((paragraph) => (
            <p key={paragraph} className="text-[13px] leading-relaxed text-white/80">
              {paragraph}
            </p>
          ))}
        </div>
      ) : (
        <InterimDescription symbol={symbol} />
      )}

      {/* Consult note, consistent with the rest of the genetics surface. */}
      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-white/55">
        <ShieldCheck
          aria-hidden="true"
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40"
          strokeWidth={1.5}
        />
        {CONSULT_NOTE}
      </p>
    </div>
  );
}

// The interim orientation for a gene without a validated laySummary yet. It names
// the gene (factual, from the data) and explains what a SNP is in general terms,
// but states no specific claim about this gene. Calm and non-alarm.
function InterimDescription({ symbol }: { symbol: string }) {
  return (
    <div className="space-y-3 rounded-xl border border-white/[0.06] bg-[#1E3054]/40 p-4">
      <p className="text-[13px] leading-relaxed text-white/75">
        A SNP is a common, single-letter difference in your DNA that can gently influence how your
        body works. It is an influence on tendencies, not a verdict.
      </p>
      <p className="text-[13px] leading-relaxed text-white/75">
        This overview covers the {symbol} gene. A plain-language summary for {symbol} is being
        prepared and reviewed, so it is not shown here yet.
      </p>
      <p className="text-[13px] leading-relaxed text-white/75">
        For the full detail available today, open the Full Report tab above.
      </p>
    </div>
  );
}

export default VariantReportTabs;
