'use client';

// Prompt 191 Task C (2026-06-12): the Your Variants centerpiece card.
//
// Orchestrates the six test pill tablist, the impact segmented filter, and the
// variant panel inside the shared GeneticsHubTile. The data is the ratified
// static labeled-sample set in geneticsVariantSamples (every test isSample), so
// there is NO per test fetch. That is a deliberate decision: the original spec
// Section 4.4 loading / partial-failure / not-purchased states are NOT
// applicable here because nothing async can fail. The sample-preview banner plus
// the Order GeneX360 CTA IS the honest stand in for the locked / not-purchased
// state, and the empty-filter line ("No {tier} impact variants in this sample.")
// is the one genuinely reachable empty state. We do not fabricate progress
// indicators or error panels for an API that does not exist.
//
// State:
//   activeId  - the active test, deep linked from ?test= on mount (Section 5);
//               an unknown or absent value defaults to the first test (genexm).
//   filterByTest - per test impact filter MEMORY, held in component state only
//               (deliberately NOT persisted to browser storage): switching pills
//               restores that test's last filter, a fresh page load resets every
//               test to All.
//   openRowId - the single expanded variant row within the active panel.
//
// Standing rules honored: tokens only (Navy #1A2744, Card #1E3054, Teal
// #2DA5A0, Orange #B75E18, white opacity neutrals), Lucide strokeWidth 1.5,
// Instrument Sans inherited, no emojis, no em or en dashes, TypeScript strict
// (no any).
//
// Note on size: this orchestrator is the one file the spec allows to run past
// ~200 lines; it stays focused on composition + the three state slices.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FlaskConical } from 'lucide-react';
import { GeneticsHubTile } from './GeneticsHubTile';
import { GENETICS_CARD_MEDIA } from './geneticsHubMedia';
import { GENEX360_SHOP_HREF } from './geneticsHubLinks';
import {
  GENETIC_TESTS,
  countsForTest,
  getTestById,
  totalSampleVariantCount,
  type GeneticTest,
} from './geneticsVariantSamples';
import { VariantPillTabs } from './VariantPillTabs';
import { VariantImpactFilter, type ImpactFilterValue } from './VariantImpactFilter';
import { VariantRow } from './VariantRow';

const PANEL_ID = 'your-variants-panel';
const SUBTITLE = 'Browse sample variants across your six GeneX360 tests.';

interface YourVariantsCardProps {
  className?: string;
}

export function YourVariantsCard({ className }: YourVariantsCardProps) {
  // Deep link: read ?test= once. useSearchParams is stable for the lifetime of
  // the entry, so resolving the initial active id from it on first render gives
  // the Section 5 behavior (/genetics?test=nutrigendx opens with NutrigenDX
  // active) without a post mount effect that would flash the default first.
  const searchParams = useSearchParams();
  const initialActiveId = useMemo(() => {
    const requested = searchParams.get('test');
    if (requested && getTestById(requested)) {
      return requested;
    }
    return GENETIC_TESTS[0].id;
  }, [searchParams]);

  const [activeId, setActiveId] = useState<string>(initialActiveId);

  // Per test filter memory: a record keyed by test id, every test starting at
  // All. In memory only, so a reload naturally resets to All. Switching the
  // filter writes the active test's entry; switching pills reads the target
  // test's entry back.
  const [filterByTest, setFilterByTest] = useState<Record<string, ImpactFilterValue>>(() => {
    const seed: Record<string, ImpactFilterValue> = {};
    for (const test of GENETIC_TESTS) {
      seed[test.id] = 'All';
    }
    return seed;
  });

  // The single expanded row within the active panel. Reset to null whenever the
  // active test changes so a stale open row from another test never lingers.
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const activeTest: GeneticTest = getTestById(activeId) ?? GENETIC_TESTS[0];
  const activeFilter: ImpactFilterValue = filterByTest[activeTest.id] ?? 'All';
  const counts = countsForTest(activeTest);

  const handleActivate = (id: string) => {
    setActiveId(id);
    setOpenRowId(null);
  };

  const handleFilterChange = (value: ImpactFilterValue) => {
    setFilterByTest((prev) => ({ ...prev, [activeTest.id]: value }));
    setOpenRowId(null);
  };

  const visibleVariants = useMemo(() => {
    if (activeFilter === 'All') return activeTest.variants;
    return activeTest.variants.filter((variant) => variant.impact === activeFilter);
  }, [activeTest, activeFilter]);

  const activeTabId = `${PANEL_ID}-tab-${activeTest.id}`;

  return (
    <GeneticsHubTile
      media={GENETICS_CARD_MEDIA.yourVariants}
      mediaLogKey="yourVariants"
      className={className}
    >
      {/* Header row: title, total sample count badge, one line subtitle. */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold leading-tight text-white md:text-xl">Your Variants</h2>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-white/75">
            {totalSampleVariantCount()} variants
          </span>
        </div>
        <p className="text-[12px] leading-relaxed text-white/60 md:text-[13px]">{SUBTITLE}</p>
      </div>

      {/* Sample data banner + Order GeneX360 CTA. This doubles as the honest
          locked / not-purchased affordance: the rows below are illustrative
          preview data, and the CTA routes to the GeneX360 shop category. */}
      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-[#2DA5A0]/25 bg-[#2DA5A0]/[0.08] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-[12px] leading-relaxed text-white/70">
          <FlaskConical
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-[#2DA5A0]"
            strokeWidth={1.5}
          />
          <span>
            <span className="font-semibold text-white/85">Sample data.</span> These rows are an
            illustrative preview, not your results.
          </span>
        </p>
        <Link
          href={GENEX360_SHOP_HREF}
          className="inline-flex min-h-[36px] flex-none items-center justify-center rounded-full bg-[#2DA5A0] px-3.5 py-1.5 text-[12px] font-semibold text-[#1A2744] no-underline transition-colors duration-200 hover:bg-[#2DA5A0]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none"
        >
          Order GeneX360
        </Link>
      </div>

      {/* Test switcher pills. */}
      <div className="mt-4">
        <VariantPillTabs
          tests={GENETIC_TESTS}
          activeId={activeTest.id}
          onActivate={handleActivate}
          panelId={PANEL_ID}
        />
      </div>

      {/* The active test's panel: impact filter, then the filtered variant list
          in a bounded scroll area so the card never grows an unbounded scroll
          region (Section 4.3). */}
      <div
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={activeTabId}
        tabIndex={0}
        className="mt-4 flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
      >
        <VariantImpactFilter counts={counts} value={activeFilter} onChange={handleFilterChange} />

        <div className="scrollbar-hide mt-3 max-h-[420px] space-y-2 overflow-y-auto">
          {visibleVariants.length === 0 ? (
            // The one genuinely reachable empty state: a tier with no rows in
            // this sample. Honest and short, never a fabricated error.
            <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-sm text-white/45">
              No {activeFilter} impact variants in this sample.
            </p>
          ) : (
            visibleVariants.map((variant, index) => {
              const rowId = `${activeTest.id}-${variant.rsId}-${index}`;
              return (
                <VariantRow
                  key={rowId}
                  variant={variant}
                  rowId={rowId}
                  isOpen={openRowId === rowId}
                  onToggle={() => setOpenRowId((prev) => (prev === rowId ? null : rowId))}
                />
              );
            })
          )}
        </div>
      </div>
    </GeneticsHubTile>
  );
}

export default YourVariantsCard;
