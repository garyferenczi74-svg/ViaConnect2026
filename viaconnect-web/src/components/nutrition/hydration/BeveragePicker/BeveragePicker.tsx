// Prompt 172e Phase B: BeveragePicker orchestrator.
//
// Top level catalog driven sectioned picker per spec section 10. Owns the
// pure picker state (view, selection, volume, search) and threads the safety
// mode flag from useSafetyMode at the boundary so every child renders the
// 170c silent UX correctly. Reads the catalog from
// /api/nutrition/hydration/catalog and the today events from
// useHydrationToday so the Recents row can derive without an extra fetch.
//
// onLogged is invoked with the BeverageLogIntent once the user confirms;
// the parent /wellness-analytics/hydration page wires this to the existing
// 170o useHydrationQuickLog hook (POST /api/nutrition/hydration/quick-log).
// The picker does not own its own write path per spec section 12.

'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useSafetyMode } from '@/lib/safety-mode/useSafetyMode';
import { isKillSwitchEnabled } from '@/lib/compliance/kill-switches';
import {
  getHydrationMicrocopy,
  type HydrationMicrocopyVariant,
} from '@/lib/nutrition/microcopy/hydration';
import type {
  BeveragePickerProps,
  BeverageCatalogRow,
  BeverageCategory,
} from './BeveragePicker.types';
import {
  backToCategory,
  backToDefault,
  buildInitialState,
  decrementVolume,
  deriveRecentSlugsFromEvents,
  filterByCategory,
  findRowById,
  incrementVolume,
  openBeverage,
  openCategory,
  resolveFavorites,
  resolveRecents,
  searchCatalog,
  setSearchQuery,
  VOLUME_STEP_ML,
  VOLUME_STEP_OZ_AS_ML,
} from './picker-state';
import { useBeverageCatalog } from './useBeverageCatalog';
import { useHydrationToday } from '@/components/hydration/useHydrationToday';
import { CategoryGrid } from './CategoryGrid';
import { BeverageList } from './BeverageList';
import { VolumePicker } from './VolumePicker';
import { SearchField } from './SearchField';
import { FavoritesRow } from './FavoritesRow';
import { RecentsRow } from './RecentsRow';
import { LogButton } from './LogButton';

export function BeveragePicker({ volumeUnit, onLogged }: BeveragePickerProps): JSX.Element | null {
  // Kill switch gate: silent unmount when BEVERAGE_CATALOG_RENDERING_ENABLED
  // is false. No error UI, no "feature disabled" copy; matches the Phase 2
  // BOS line silent-on-kill pattern so a 170c section 9 emergency rollback
  // disappears the picker cleanly without a UX disclosure. Read at render
  // time so a runtime flip propagates the next time the parent re renders.
  const catalogRenderingEnabled = isKillSwitchEnabled('BEVERAGE_CATALOG_RENDERING_ENABLED');

  const safety = useSafetyMode();
  const variant: HydrationMicrocopyVariant = safety.enabled ? 'safety_mode' : 'normal';
  const unit: 'ml' | 'oz' = volumeUnit ?? 'ml';

  const catalogState = useBeverageCatalog();
  const today = useHydrationToday();
  const [state, setState] = useState(() => buildInitialState());
  const [logging, setLogging] = useState(false);

  // Prompt 207 Task 4: default the picker to Still Water on first catalog load.
  // The catalog is async; once it arrives and the picker is still on the default
  // view with no selection, pre-select the first water-category row (lowest
  // sort_order) so the user lands on the volume stepper for still water without
  // a tap. Catalog remains the single source of truth - no hardcoded list.
  useEffect(() => {
    if (catalogState.loading || catalogState.error) return;
    if (catalogState.catalog.length === 0) return;
    // Only set the default on initial mount (view === 'default', no selection).
    setState((prev) => {
      if (prev.view !== 'default' || prev.selectedBeverageId !== null) return prev;
      const waterRow = catalogState.catalog.find((r) => r.category === 'water') ?? null;
      if (!waterRow) return prev;
      return openBeverage(prev, waterRow);
    });
  // Run once when the catalog finishes loading for the first time.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogState.loading, catalogState.catalog]);

  const recentSlugs = useMemo(
    () =>
      deriveRecentSlugsFromEvents(
        today.data?.events_today ?? [],
        catalogState.catalog,
      ),
    [today.data, catalogState.catalog],
  );

  const favoriteSlugs = useMemo<ReadonlyArray<string>>(() => [], []);

  const recents = useMemo(
    () => resolveRecents(catalogState.catalog, recentSlugs),
    [catalogState.catalog, recentSlugs],
  );
  const favorites = useMemo(
    () => resolveFavorites(catalogState.catalog, favoriteSlugs),
    [catalogState.catalog, favoriteSlugs],
  );

  const searchResults = useMemo(
    () => searchCatalog(catalogState.catalog, state.searchQuery),
    [catalogState.catalog, state.searchQuery],
  );

  const selectedBeverage = useMemo(
    () => findRowById(catalogState.catalog, state.selectedBeverageId),
    [catalogState.catalog, state.selectedBeverageId],
  );

  const categoryRows = useMemo(
    () =>
      state.selectedCategory
        ? filterByCategory(catalogState.catalog, state.selectedCategory)
        : [],
    [catalogState.catalog, state.selectedCategory],
  );

  const step = unit === 'oz' ? VOLUME_STEP_OZ_AS_ML : VOLUME_STEP_ML;

  function handleCategorySelect(cat: BeverageCategory): void {
    setState((s) => openCategory(s, cat));
  }

  function handleBeverageSelect(row: BeverageCatalogRow): void {
    setState((s) => openBeverage(s, row));
  }

  function handleBack(): void {
    if (state.view === 'beverage') {
      setState((s) => backToCategory(s));
    } else if (state.view === 'category') {
      setState((s) => backToDefault(s));
    }
  }

  async function handleLog(): Promise<void> {
    if (!selectedBeverage) return;
    setLogging(true);
    try {
      await onLogged?.({
        beverage_kind: selectedBeverage.hydration_source_kind,
        volume_ml: state.volumeMl,
        slug: selectedBeverage.slug,
      });
      setState((s) => backToDefault(s));
      void today.refresh();
    } finally {
      setLogging(false);
    }
  }

  const title = getHydrationMicrocopy('picker.title', variant);
  const loadingCopy = getHydrationMicrocopy('state.loading_catalog', variant);
  const errorCopy = getHydrationMicrocopy('error.fetch_failed', variant);
  const emptySearchCopy = getHydrationMicrocopy('picker.empty_search', variant);

  // Kill switch silent unmount: all hooks above ran in the normal order so
  // the Rules of Hooks invariant is preserved on the next render whether
  // the switch flipped or not.
  if (!catalogRenderingEnabled) {
    return null;
  }

  return (
    <section
      aria-labelledby="hydration-picker-heading"
      className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-5"
    >
      <header className="flex items-center justify-between gap-3">
        {state.view !== 'default' ? (
          <button
            type="button"
            onClick={handleBack}
            aria-label={
              state.view === 'beverage'
                ? getHydrationMicrocopy('action.back_to_beverages', variant)
                : getHydrationMicrocopy('action.back_to_categories', variant)
            }
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/5 text-white/80 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        ) : (
          <span className="h-8 w-8" aria-hidden="true" />
        )}
        <h2 id="hydration-picker-heading" className="flex-1 text-center text-base font-semibold text-white">
          {title}
        </h2>
        <span className="h-8 w-8" aria-hidden="true" />
      </header>

      {catalogState.loading ? (
        <p className="text-[12px] text-white/55">{loadingCopy}</p>
      ) : null}

      {catalogState.error ? (
        <p role="alert" className="text-[12px] text-[#B75E18]">
          {errorCopy}
        </p>
      ) : null}

      {!catalogState.loading && !catalogState.error && state.view === 'default' ? (
        <>
          <FavoritesRow favorites={favorites} onSelect={handleBeverageSelect} variant={variant} />
          <RecentsRow recents={recents} onSelect={handleBeverageSelect} variant={variant} />
          <SearchField
            value={state.searchQuery}
            onChange={(q) => setState((s) => setSearchQuery(s, q))}
            variant={variant}
          />
          {state.searchQuery.trim().length > 0 ? (
            searchResults.length > 0 ? (
              <BeverageList
                beverages={searchResults}
                onSelect={handleBeverageSelect}
                safetyMode={safety.enabled}
              />
            ) : (
              <p className="text-[12px] text-white/55">{emptySearchCopy}</p>
            )
          ) : (
            <CategoryGrid onSelect={handleCategorySelect} variant={variant} />
          )}
        </>
      ) : null}

      {!catalogState.loading && !catalogState.error && state.view === 'category' ? (
        <BeverageList
          beverages={categoryRows}
          onSelect={handleBeverageSelect}
          safetyMode={safety.enabled}
        />
      ) : null}

      {!catalogState.loading && !catalogState.error && state.view === 'beverage' && selectedBeverage ? (
        <div className="flex flex-col gap-3">
          <VolumePicker
            beverage={selectedBeverage}
            volumeMl={state.volumeMl}
            onIncrement={() => setState((s) => incrementVolume(s, { step }))}
            onDecrement={() => setState((s) => decrementVolume(s, { step }))}
            variant={variant}
            unit={unit}
          />
          <LogButton onClick={() => void handleLog()} loading={logging} variant={variant} />
        </div>
      ) : null}
    </section>
  );
}
