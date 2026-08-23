'use client';

// Prompt 204b (2026-06-17): the Your Variants centerpiece card, now driven by
// REAL member data instead of the retired static sample set.
//
// Gary 2026-08-23: pills show observed GENEX360 counts with the unit that
// matches the test. Aliases (GENEX-M, genex_m, genex-m, and peers) group onto
// the matching pill. HormoneIQ and EpigenHQ read marker / clock tables, never
// user_variants SNP length. 401 / error render as Unavailable (n/a), never 0.
// Marketing catalog sizes from panels.ts / HERO_BENTO_META are not used here.
//
// Standing rules honored: tokens only (Navy #1A2744, Card #1E3054, Teal
// #2DA5A0, Orange #B75E18, white opacity neutrals), Lucide strokeWidth 1.5,
// Instrument Sans inherited, no emojis, no em or en dashes, TypeScript strict
// (no any). Desktop and mobile share this card.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Dna, Plus } from 'lucide-react';
import { GeneticsHubTile } from './GeneticsHubTile';
import { GENETICS_CARD_MEDIA } from './geneticsHubMedia';
import { GENEX360_SHOP_HREF } from './geneticsHubLinks';
import { useGeneticsVariants, type VariantRecord } from './useGeneticsVariants';
import { VariantReportPill } from './VariantReportPill';
import { VariantImpactFilter, type ImpactFilterValue } from './VariantImpactFilter';
import { SeverityPill } from '@/components/genetics/SeverityPill';
import { SampleBadge } from '@/components/genetics/SampleBadge';
import { resolveVariantReport } from '@/lib/genex360/resolveVariantReport';
import { PanelDisclaimer } from '@/components/shop/genex360/PanelDisclaimer';
import type { PanelSlug } from '@/data/genex360/types';
import type { SeverityTier } from '@/lib/genetics/severity';
import {
  PANEL_ORDER,
  PANEL_LABELS,
  resolvePanelLabel,
  panelKeyForSlug,
  type PanelKey,
} from '@/lib/genetics/panelLabels';
import { normalizeObservedPanelKey } from '@/lib/genetics/panelKeyAliases';
import {
  formatObservedBadge,
  type ObservedPanelCount,
} from '@/lib/genetics/observedPanelCounts';
import { epigenMarkerByKey } from '@/lib/genetics/epigenMarkerMap';

const PANEL_ID = 'your-variants-panel';
const SUBTITLE =
  'Each GENEX360 test measures something different: methylation SNPs, nutrition markers, hormone metabolites, or epigenetic clocks.';

const LEGACY_TEST_ID_TO_PANEL: Record<string, PanelKey> = {
  genexm: 'methylation',
  nutrigendx: 'nutrition',
  hormoneiq: 'hormone',
  epigenhq: 'epigenetic',
  peptideiq: 'peptide',
  cannabisiq: 'cannabis',
};

function panelKeyForTestParam(raw: string | null): PanelKey | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if ((PANEL_ORDER as string[]).includes(normalized)) return normalized as PanelKey;
  const byAlias = normalizeObservedPanelKey(raw);
  if (byAlias) return byAlias;
  const bySlug = panelKeyForSlug(normalized);
  if (bySlug) return bySlug;
  return LEGACY_TEST_ID_TO_PANEL[normalized] ?? null;
}

type Zygosity = '+/+' | '+/-' | '-/-';
function zygosityFromStatus(status: string | null): Zygosity {
  const s = (status ?? '').trim();
  if (s === '+/+') return '+/+';
  if (s === '+/-' || s === '-/+') return '+/-';
  return '-/-';
}

function isSnpPanel(panelKey: PanelKey): boolean {
  return panelKey !== 'hormone' && panelKey !== 'epigenetic';
}

interface YourVariantsCardProps {
  className?: string;
}

export function YourVariantsCard({ className }: YourVariantsCardProps) {
  const { data, isLoading } = useGeneticsVariants();
  const {
    variantsByPanel,
    brandedPanels,
    totalVariants,
    observedByPanel,
    loadStatus,
    hormoneMarkers,
    epigeneticMarkers,
  } = data;

  const searchParams = useSearchParams();
  const initialPanel = useMemo<PanelKey>(() => {
    return panelKeyForTestParam(searchParams.get('test')) ?? PANEL_ORDER[0];
  }, [searchParams]);

  const [activePanel, setActivePanel] = useState<PanelKey>(initialPanel);

  const [impactFilter, setImpactFilter] = useState<ImpactFilterValue>('All');
  useEffect(() => {
    setImpactFilter('All');
  }, [activePanel]);

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
  const activeObserved: ObservedPanelCount = observedByPanel[activePanel];
  const resultsUnavailable = loadStatus === 'error' || loadStatus === 'unauthorized';

  const counts = useMemo(() => {
    const c = { all: activeRows.length, high: 0, moderate: 0, low: 0 };
    for (const row of activeRows) {
      if (row.severity === 'high') c.high += 1;
      else if (row.severity === 'moderate') c.moderate += 1;
      else if (row.severity === 'low') c.low += 1;
    }
    return c;
  }, [activeRows]);

  const filteredRows = useMemo(() => {
    if (impactFilter === 'All') return activeRows;
    const tier = impactFilter.toLowerCase() as SeverityTier;
    return activeRows.filter((row) => row.severity === tier);
  }, [activeRows, impactFilter]);

  const activeGenericLabel = PANEL_LABELS[activePanel].generic_label;
  const activeEmptyNoun = PANEL_LABELS[activePanel].empty_noun;
  const activeMeasuresLine = PANEL_LABELS[activePanel].measures_line;
  const activePanelSlug = PANEL_LABELS[activePanel].slug as PanelSlug;
  const activeTabId = `${PANEL_ID}-tab-${activePanel}`;

  const headerBadge = isLoading
    ? 'Loading'
    : resultsUnavailable || totalVariants === null
      ? 'Unavailable'
      : `${totalVariants} results`;

  const hasHormoneMarkers = hormoneMarkers.length > 0;
  const hasEpigeneticMarkers = epigeneticMarkers.length > 0;
  const hasSnpRows = activeRows.length > 0;
  const showSnpList = isSnpPanel(activePanel) && hasSnpRows;
  const showHormoneList = activePanel === 'hormone' && hasHormoneMarkers;
  const showEpigenList = activePanel === 'epigenetic' && hasEpigeneticMarkers;

  return (
    <GeneticsHubTile
      media={GENETICS_CARD_MEDIA.yourVariants}
      mediaLogKey="yourVariants"
      className={className}
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold leading-tight text-white md:text-xl">Your Variants</h2>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-white/75">
              {headerBadge}
            </span>
          </div>
          <Link
            href={GENEX360_SHOP_HREF}
            className="inline-flex min-h-[36px] flex-none items-center gap-1.5 rounded-full border border-[#2DA5A0]/40 bg-[#2DA5A0]/[0.14] px-3.5 py-1.5 text-[12px] font-semibold text-[#2DA5A0] no-underline transition-colors duration-200 hover:border-[#2DA5A0]/60 hover:bg-[#2DA5A0]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none"
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
            Upgrade or add a test
          </Link>
        </div>
        <p className="text-[12px] leading-relaxed text-white/60 md:text-[13px]">{SUBTITLE}</p>
      </div>

      <div className="relative mt-4">
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
            const observed = observedByPanel[panelKey];
            const badge = isLoading ? '...' : formatObservedBadge(observed);
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
                <span
                  aria-label={
                    isLoading
                      ? `${label} count loading`
                      : observed.status === 'unknown' || observed.count === null
                        ? `${label} count unavailable`
                        : `${observed.count} ${observed.unit}`
                  }
                  className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
                    active ? 'bg-[#1A2744]/40 text-white' : 'bg-white/10 text-white/70'
                  }`}
                >
                  {badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={activeTabId}
        tabIndex={0}
        className="mt-4 flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
      >
        {isLoading ? (
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-sm text-white/45">
            Loading your results...
          </p>
        ) : resultsUnavailable || activeObserved.status === 'unknown' ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-5">
            <p className="text-sm font-semibold text-white/85">
              {loadStatus === 'unauthorized'
                ? 'Sign in to view your results.'
                : `${activeGenericLabel} results are unavailable.`}
            </p>
            <p className="text-[13px] leading-relaxed text-white/60">
              This is not an empty panel. We could not confirm a count, so the badge
              shows n/a instead of 0.
            </p>
          </div>
        ) : showSnpList ? (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] leading-relaxed text-white/55">{activeMeasuresLine}</p>
            <VariantImpactFilter counts={counts} value={impactFilter} onChange={setImpactFilter} />
            {filteredRows.length > 0 ? (
              <div className="space-y-2">
                {filteredRows.map((row, index) => {
                  const z = zygosityFromStatus(row.status);
                  const rowKey = `${activePanel}-${row.rsid}-${index}`;
                  const report = row.rsid
                    ? resolveVariantReport(row.rsid, activePanelSlug, row.gene ?? undefined)
                    : null;
                  return (
                    <div
                      key={rowKey}
                      className="rounded-xl border border-white/[0.06] bg-[#1E3054]/45 px-4 py-3"
                    >
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
                        <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[11px] tabular-nums text-white/45">
                          {z}
                        </span>
                        {row.is_sample ? <SampleBadge /> : null}
                        <span className="ml-auto">
                          <SeverityPill tier={row.severity} />
                        </span>
                      </div>
                      {row.clinical_significance ? (
                        <p className="mt-2 text-[13px] leading-relaxed text-white/60">
                          {row.clinical_significance}
                        </p>
                      ) : null}
                      {report?.exists && row.rsid ? (
                        <div className="mt-3 flex justify-end">
                          <VariantReportPill
                            rsid={row.rsid}
                            panelSlug={activePanelSlug}
                            geneLabel={row.gene ?? 'Unknown'}
                            variantLabel={row.rsid}
                            gene={row.gene ?? undefined}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-sm text-white/45">
                No {impactFilter} severity variants in this panel.
              </p>
            )}
          </div>
        ) : showHormoneList ? (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] leading-relaxed text-white/55">{activeMeasuresLine}</p>
            <div className="space-y-2">
              {hormoneMarkers.map((marker) => (
                <div
                  key={marker.name}
                  className="rounded-xl border border-white/[0.06] bg-[#1E3054]/45 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">{marker.name}</span>
                    <span className="ml-auto font-mono text-xs tabular-nums text-white/70">
                      {marker.value === null ? 'UNKNOWN' : marker.value}
                      {marker.unit ? ` ${marker.unit}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : showEpigenList ? (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] leading-relaxed text-white/55">{activeMeasuresLine}</p>
            <div className="space-y-2">
              {epigeneticMarkers.map((marker) => {
                const meta = epigenMarkerByKey(marker.markerKey);
                const display = meta?.displayName ?? marker.markerKey;
                const value =
                  marker.valueNum !== null
                    ? marker.valueNum
                    : marker.valueText
                      ? marker.valueText
                      : 'UNKNOWN';
                return (
                  <div
                    key={marker.markerKey}
                    className="rounded-xl border border-white/[0.06] bg-[#1E3054]/45 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{display}</span>
                      <span className="ml-auto font-mono text-xs tabular-nums text-white/70">
                        {value}
                        {marker.unit ? ` ${marker.unit}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-[#2DA5A0]/25 bg-[#2DA5A0]/[0.08] px-4 py-5">
            <div className="flex items-start gap-2">
              <Dna
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-[#2DA5A0]"
                strokeWidth={1.5}
              />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-white/85">
                  No {activeGenericLabel} {activeEmptyNoun} yet.
                </p>
                <p className="text-[13px] leading-relaxed text-white/60">
                  {activeMeasuresLine}
                </p>
              </div>
            </div>
            <Link
              href={GENEX360_SHOP_HREF}
              className="inline-flex min-h-[36px] flex-none items-center justify-center rounded-full border border-[#1A2744]/60 bg-white/[0.08] px-3.5 py-1.5 text-[12px] font-semibold text-white no-underline backdrop-blur-md [text-shadow:0_1px_2px_rgba(0,0,0,0.8)] transition-colors duration-200 hover:border-[#1A2744]/80 hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none"
            >
              Add this test
            </Link>
          </div>
        )}
      </div>

      <div className="mt-4">
        <PanelDisclaimer slug={activePanelSlug} />
      </div>
    </GeneticsHubTile>
  );
}

export default YourVariantsCard;
