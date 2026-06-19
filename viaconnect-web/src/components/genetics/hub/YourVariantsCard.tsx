'use client';

// Prompt 204b (2026-06-17): the Your Variants centerpiece card, now driven by
// REAL member data instead of the retired static sample set.
//
// On mount the card fetches GET /api/genetics/variants (via useGeneticsVariants)
// and renders the member's interpreted variants grouped by GENEX360 panel. The
// six pills come from PANEL_ORDER and their labels are resolved dynamically:
// every panel shows its GENERIC capability label by default, and only flips to
// the BRANDED product label when the member owns a Farmceutica branded test for
// that panel (brandedPanels). Labels are NEVER hardcoded in markup.
//
// The fetch is fail-open: any failure resolves to empty data, so the card never
// throws and never shows an error panel. A panel with no rows shows an honest
// empty / locked state (its generic label plus an Order GeneX360 CTA), not
// fabricated sample rows.
//
// State slices:
//   activePanel - the active PanelKey, deep linked from ?test= on mount
//                 (accepts a panel_key, a panel slug, or a legacy sample id);
//                 an unknown or absent value defaults to PANEL_ORDER[0]
//                 (methylation).
//   data        - the fetched payload (variantsByPanel, brandedPanels,
//                 totalVariants) plus the first-load flag, owned by the hook.
//
// The pill tablist is built inline here (it cannot reuse VariantPillTabs, which
// is bound to the retired sample GeneticTest type) but mirrors that component's
// styling and WAI-ARIA tabs behavior exactly: roving tabindex, arrow / Home /
// End navigation with automatic activation, blue glass active pill, white
// outline inactive pills, mobile scroll-snap with edge fade masks.
//
// Standing rules honored: tokens only (Navy #1A2744, Card #1E3054, Teal
// #2DA5A0, Orange #B75E18, white opacity neutrals), Lucide strokeWidth 1.5,
// Instrument Sans inherited, no emojis, no em or en dashes, TypeScript strict
// (no any).

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Dna } from 'lucide-react';
import { GeneticsHubTile } from './GeneticsHubTile';
import { GENETICS_CARD_MEDIA } from './geneticsHubMedia';
import { GENEX360_SHOP_HREF } from './geneticsHubLinks';
import { useGeneticsVariants, type VariantRecord } from './useGeneticsVariants';
import { VariantReportPill } from './VariantReportPill';
import { resolveVariantReport } from '@/lib/genex360/resolveVariantReport';
import { PanelDisclaimer } from '@/components/shop/genex360/PanelDisclaimer';
import type { PanelSlug } from '@/data/genex360/types';
import {
  PANEL_ORDER,
  PANEL_LABELS,
  resolvePanelLabel,
  panelKeyForSlug,
  type PanelKey,
} from '@/lib/genetics/panelLabels';

const PANEL_ID = 'your-variants-panel';
const SUBTITLE = 'Browse your interpreted variants across the six GENEX360 panels.';

// Legacy sample ids the deep link (?test=) used to accept, mapped to PanelKey so
// old links keep working. The canonical panel_key and panel slug are resolved
// directly (panelKeyForSlug) without a hardcoded table.
const LEGACY_TEST_ID_TO_PANEL: Record<string, PanelKey> = {
  genexm: 'methylation',
  nutrigendx: 'nutrition',
  hormoneiq: 'hormone',
  epigenhq: 'epigenetic',
  peptideiq: 'peptide',
  cannabisiq: 'cannabis',
};

// Resolve a raw ?test= value to a PanelKey. Accepts a panel_key, a panel slug,
// or a legacy sample id; anything unknown or absent yields null (the caller then
// falls back to PANEL_ORDER[0]).
function panelKeyForTestParam(raw: string | null): PanelKey | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if ((PANEL_ORDER as string[]).includes(normalized)) return normalized as PanelKey;
  const bySlug = panelKeyForSlug(normalized);
  if (bySlug) return bySlug;
  return LEGACY_TEST_ID_TO_PANEL[normalized] ?? null;
}

// Map a row's status string to a normalized genotype zygosity token. The API
// stores status as a notation string; we accept the canonical +/+ , +/- , -/-
// forms (and the order-insensitive -/+ ) and otherwise treat it as the neutral
// -/- styling so an unexpected value never throws or shows raw text.
type Zygosity = '+/+' | '+/-' | '-/-';
function zygosityFromStatus(status: string | null): Zygosity {
  const s = (status ?? '').trim();
  if (s === '+/+') return '+/+';
  if (s === '+/-' || s === '-/+') return '+/-';
  return '-/-';
}

// Token-driven status badge classes. +/+ orange-tinted, +/- white-tinted,
// -/- teal-tinted, kept as a literal switch so the exact hex strings stay
// visible in source.
function statusBadgeClasses(z: Zygosity): string {
  if (z === '+/+') {
    return 'border-[#B75E18]/45 bg-[#B75E18]/15 text-[#B75E18]';
  }
  if (z === '+/-') {
    return 'border-white/20 bg-white/[0.06] text-white/80';
  }
  return 'border-[#2DA5A0]/40 bg-[#2DA5A0]/[0.12] text-[#2DA5A0]';
}

interface YourVariantsCardProps {
  className?: string;
}

export function YourVariantsCard({ className }: YourVariantsCardProps) {
  const { data, isLoading } = useGeneticsVariants();
  const { variantsByPanel, brandedPanels, totalVariants } = data;

  // Deep link: read ?test= once. useSearchParams is stable for the lifetime of
  // the entry, so resolving the initial active panel from it on first render
  // gives the Section 6 behavior without a post-mount effect that would flash
  // the default first.
  const searchParams = useSearchParams();
  const initialPanel = useMemo<PanelKey>(() => {
    return panelKeyForTestParam(searchParams.get('test')) ?? PANEL_ORDER[0];
  }, [searchParams]);

  const [activePanel, setActivePanel] = useState<PanelKey>(initialPanel);

  // One ref per pill so arrow navigation can move DOM focus (roving focus),
  // indexed by position in PANEL_ORDER.
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = PANEL_ORDER.indexOf(activePanel);

  const focusAndActivate = (index: number) => {
    const count = PANEL_ORDER.length;
    const wrapped = ((index % count) + count) % count;
    const next = PANEL_ORDER[wrapped];
    setActivePanel(next);
    buttonRefs.current[wrapped]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
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
        focusAndActivate(PANEL_ORDER.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        focusAndActivate(current);
        break;
      default:
        break;
    }
  };

  const activeRows: VariantRecord[] = variantsByPanel[activePanel] ?? [];
  const activeGenericLabel = PANEL_LABELS[activePanel].generic_label;
  // Prompt 204e (2026-06-19): the canonical Blueprint panel slug for the active
  // panel (methylation to genex-m). This is the panelSlug the 193c resolver and
  // Report pill join on, and the slug the approved PanelDisclaimer keys off;
  // PANEL_LABELS is the single source so it is never hardcoded here. The six
  // PANEL_LABELS slugs are exactly the PanelSlug union.
  const activePanelSlug = PANEL_LABELS[activePanel].slug as PanelSlug;
  const activeTabId = `${PANEL_ID}-tab-${activePanel}`;

  return (
    <GeneticsHubTile
      media={GENETICS_CARD_MEDIA.yourVariants}
      mediaLogKey="yourVariants"
      className={className}
    >
      {/* Header row: title, total real-variant count badge, one line subtitle. */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold leading-tight text-white md:text-xl">Your Variants</h2>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-white/75">
            {totalVariants} variants
          </span>
        </div>
        <p className="text-[12px] leading-relaxed text-white/60 md:text-[13px]">{SUBTITLE}</p>
      </div>

      {/* Panel switcher pills: a WAI-ARIA tablist mirroring VariantPillTabs. */}
      <div className="relative mt-4">
        {/* Left + right edge fade masks (mobile only), hinting at overflow. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-6 bg-gradient-to-r from-[#1A2744] to-transparent md:hidden"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-6 bg-gradient-to-l from-[#1A2744] to-transparent md:hidden"
        />

        <div
          role="tablist"
          aria-label="Genetic panels"
          aria-orientation="horizontal"
          onKeyDown={onKeyDown}
          className="scrollbar-hide flex snap-x snap-mandatory flex-nowrap gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible"
        >
          {PANEL_ORDER.map((panelKey, index) => {
            const active = panelKey === activePanel;
            const label = resolvePanelLabel(panelKey, brandedPanels.includes(panelKey));
            const count = (variantsByPanel[panelKey] ?? []).length;
            return (
              <button
                key={panelKey}
                ref={(node) => {
                  buttonRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`${PANEL_ID}-tab-${panelKey}`}
                aria-selected={active}
                aria-controls={PANEL_ID}
                tabIndex={active ? 0 : -1}
                onClick={() => setActivePanel(panelKey)}
                className={`flex min-h-[44px] flex-none snap-start items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none ${
                  active
                    ? 'border border-[#1A2744]/60 bg-white/[0.08] text-white backdrop-blur-md [text-shadow:0_1px_2px_rgba(0,0,0,0.8)] hover:border-[#1A2744]/80 hover:bg-white/[0.16]'
                    : 'border border-white/20 bg-transparent text-white/70 hover:border-white/35 hover:text-white/90'
                }`}
              >
                <span>{label}</span>
                {/* Trailing count badge: this panel's real variant count. */}
                <span
                  className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
                    active ? 'bg-[#1A2744]/40 text-white' : 'bg-white/10 text-white/70'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The active panel: either the member's real variant rows or an honest
          empty / locked state. Gary 2026-06-12: the list grows to full height
          with no inner scroll, so the card grows and page content flows down. */}
      <div
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={activeTabId}
        tabIndex={0}
        className="mt-4 flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
      >
        {isLoading ? (
          // Quiet first-load affordance. Never an error, never a spinner.
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-sm text-white/45">
            Loading your variants...
          </p>
        ) : activeRows.length > 0 ? (
          <div className="space-y-2">
            {activeRows.map((row, index) => {
              const z = zygosityFromStatus(row.status);
              const rowKey = `${activePanel}-${row.rsid}-${index}`;
              // Prompt 204e: reconnect the tap-to-description deep link. Resolve
              // this variant against the 193c registry by rsID. When a full
              // report exists on the Your Genetic Blueprint page, the row shows
              // the Report pill; when it does not, report.exists is false and no
              // pill (and no dead link) is rendered.
              const report = row.rsid
                ? resolveVariantReport(row.rsid, activePanelSlug)
                : null;
              return (
                <div
                  key={rowKey}
                  className="rounded-xl border border-white/[0.06] bg-[#1E3054]/45 px-4 py-3"
                >
                  {/* Top line: gene + rsid, genotype chip, status badge. Wraps on
                      narrow mobile so nothing overflows. */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-white">
                      {row.gene ?? 'Unknown'}
                    </span>
                    {row.rsid ? (
                      <span className="font-mono text-xs text-white/35">{row.rsid}</span>
                    ) : null}
                    {row.genotype ? (
                      <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-xs font-semibold text-white/70">
                        {row.genotype}
                      </span>
                    ) : null}
                    <span
                      className={`ml-auto inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${statusBadgeClasses(z)}`}
                    >
                      {z}
                    </span>
                  </div>
                  {/* Clinical significance line, when present. */}
                  {row.clinical_significance ? (
                    <p className="mt-2 text-[13px] leading-relaxed text-white/60">
                      {row.clinical_significance}
                    </p>
                  ) : null}
                  {/* Prompt 204e: the Report deep link. Tapping it navigates to
                      this variant's full description on the Your Genetic
                      Blueprint page (the 193c VariantReportPill builds the href
                      via resolveVariantReport, so the route is never hardcoded).
                      It is its own link, separate from the row, so nothing else
                      is hijacked. Rendered only when a matching report exists. */}
                  {report?.exists && row.rsid ? (
                    <div className="mt-3 flex justify-end">
                      <VariantReportPill
                        rsid={row.rsid}
                        panelSlug={activePanelSlug}
                        geneLabel={row.gene ?? 'Unknown'}
                        variantLabel={row.rsid}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          // Empty / locked state: this panel has no interpreted variants yet.
          // Honest and short, with a single CTA to order the panel. Never a
          // fabricated sample row, never an error.
          <div className="flex flex-col items-start gap-3 rounded-xl border border-[#2DA5A0]/25 bg-[#2DA5A0]/[0.08] px-4 py-5">
            <div className="flex items-start gap-2">
              <Dna
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-[#2DA5A0]"
                strokeWidth={1.5}
              />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-white/85">
                  No {activeGenericLabel} variants yet.
                </p>
                <p className="text-[13px] leading-relaxed text-white/60">
                  Upload a DNA test or order this panel to see your interpreted variants here.
                </p>
              </div>
            </div>
            <Link
              href={GENEX360_SHOP_HREF}
              className="inline-flex min-h-[36px] flex-none items-center justify-center rounded-full border border-[#1A2744]/60 bg-white/[0.08] px-3.5 py-1.5 text-[12px] font-semibold text-white no-underline backdrop-blur-md [text-shadow:0_1px_2px_rgba(0,0,0,0.8)] transition-colors duration-200 hover:border-[#1A2744]/80 hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none"
            >
              Order GeneX360
            </Link>
          </div>
        )}
      </div>

      {/* Consult-your-practitioner warning on all SNP data (Gary 2026-06-19). My
          204b rewrite dropped the consult note the retired VariantRow carried;
          this restores it as a single persistent card footer, so the member
          never sees their interpreted variants without it, on every panel.
          Reuses the approved PanelDisclaimer verbatim (the same fuller
          not-a-diagnosis / tendencies-not-certainties / consult-a-licensed-
          practitioner language shown on the GENEX360 surfaces), keyed to the
          active panel so PeptideIQ and CannabisIQ get their extra caveats too. */}
      <div className="mt-4">
        <PanelDisclaimer slug={activePanelSlug} />
      </div>
    </GeneticsHubTile>
  );
}

export default YourVariantsCard;
