/**
 * Gary 2026-06-03: HydrationFullSection extracted from the Hydration Detail
 * page so the same section mounts inline inside the Dashboard Quick Log
 * accordion + the Today's Meals accordion on the Nutrition Log, instead of
 * a peek-card with a "Detail" hyperlink.
 *
 * Composes: Today (ring + quick log buttons + intake timeline + caffeine
 * overlay), Beverage Breakdown, Electrolyte Summary, Beverage Picker,
 * This Week, This Month, and the FDA disclaimer. The wrapper page is
 * responsible for the back link + container chrome; this component is
 * the section body only.
 */

'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Droplet, Coffee, Wine, Beer, Milk } from 'lucide-react';
import { HydrationRing, formatVolumeLabel } from './HydrationRing';
import { HydrationEditPanel } from './HydrationEditPanel';
import { useHydrationToday } from './useHydrationToday';
import { useHydrationHistory } from './useHydrationHistory';
import { useHydrationQuickLog, type HydrationLogSurface } from './useHydrationQuickLog';
import { useUserBeverages } from './useUserBeverages';
import type { HydrationTodayEvent } from './useHydrationToday';
import type { HydrationHistoryDay } from './useHydrationHistory';
import type { HydrationBeverageKind } from './useHydrationQuickLog';
import { BeveragePicker } from '@/components/nutrition/hydration/BeveragePicker';
import type { BeverageLogIntent } from '@/components/nutrition/hydration/BeveragePicker';
import { BeverageBreakdown } from '@/components/nutrition/hydration/BeverageBreakdown';
import { ElectrolyteSummary } from '@/components/nutrition/hydration/ElectrolyteSummary';
import type { ElectrolyteCatalogRow } from '@/components/nutrition/hydration/ElectrolyteSummary';
import { CaffeineOverlay } from '@/components/nutrition/hydration/CaffeineOverlay';
import { useBeverageCatalog } from '@/components/nutrition/hydration/BeveragePicker/useBeverageCatalog';

const BEVERAGE_KIND_LABELS: Record<string, { label: string; Icon: typeof Droplet }> = {
  pure_water: { label: 'Water', Icon: Droplet },
  coffee_tea: { label: 'Coffee or tea', Icon: Coffee },
  juice_smoothie: { label: 'Juice', Icon: Droplet },
  dairy: { label: 'Milk', Icon: Milk },
  soda: { label: 'Soda', Icon: Droplet },
  alcohol_low: { label: 'Beer', Icon: Beer },
  alcohol_high: { label: 'Wine', Icon: Wine },
  sports_drink: { label: 'Sports drink', Icon: Droplet },
  high_water_food: { label: 'Food', Icon: Droplet },
};

function formatTimeOfDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDayLabel(dayUtc: string): string {
  const d = new Date(`${dayUtc}T00:00:00Z`);
  return d.toLocaleDateString([], { weekday: 'short' });
}

export interface HydrationFullSectionProps {
  // log_surface tag sent with quick-log writes; lets analytics tell which
  // mount point generated the entry (detail page vs dashboard accordion vs
  // nutrition log accordion). Defaults to the detail surface.
  readonly logSurface?: HydrationLogSurface;
}

export function HydrationFullSection({
  logSurface = 'hydration_detail_view',
}: HydrationFullSectionProps): JSX.Element {
  const today = useHydrationToday();
  const week = useHydrationHistory('week');
  const month = useHydrationHistory('month');
  const catalogState = useBeverageCatalog();

  const [editTarget, setEditTarget] = useState<{ mealId: string; volume: number; kind: HydrationBeverageKind } | null>(null);
  const { log: logBeverage } = useHydrationQuickLog();
  const { beverages: userBeverages, create: createUserBeverage } = useUserBeverages();

  const [sleepStartHHMM, setSleepStartHHMM] = useState<string>('23:00');
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/profile/sleep-window');
        if (!res.ok) return;
        const json = (await res.json()) as { sleep_start: string | null; default_sleep_start: string };
        if (cancelled) return;
        setSleepStartHHMM(json.sleep_start ?? json.default_sleep_start ?? '23:00');
      } catch {
        // Defensive fallback to 23:00; the overlay still renders sensibly.
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const caffeineEvents = (today.data?.events_today ?? [])
    .filter((ev) => typeof ev.caffeine_mg === 'number' && ev.caffeine_mg > 0)
    .map((ev) => ({
      meal_id: ev.meal_id,
      caffeine_mg: Number(ev.caffeine_mg ?? 0),
      logged_at: ev.logged_at,
    }));

  const electrolyteEvents = (today.data?.events_today ?? []).map((ev) => ({
    meal_id: ev.meal_id,
    beverage_catalog_slug: ev.beverage_catalog_slug ?? null,
    volume_ml: ev.volume_ml,
  }));

  const electrolyteCatalog: ReadonlyArray<ElectrolyteCatalogRow> = catalogState.catalog.map((row) => ({
    slug: row.slug,
    category: row.category,
    default_volume_ml: row.default_volume_ml,
    sodium_mg: row.sodium_mg,
    potassium_mg: row.potassium_mg,
    magnesium_mg: row.magnesium_mg,
  }));

  const total = today.data?.total_ml ?? 0;
  const target = today.data?.target_ml ?? 1890;

  async function handleBeveragePickerLogged(intent: BeverageLogIntent): Promise<void> {
    const args: Parameters<typeof logBeverage>[0] = {
      volume_ml: intent.volume_ml,
      beverage_kind: intent.beverage_kind as HydrationBeverageKind,
      log_surface: logSurface,
    };
    // Only forward the catalog slug when it is a non-empty string.
    // Custom beverages carry slug: '' and must not pass an empty string
    // to the route (the route interprets any slug value as a catalog lookup).
    if (intent.slug) {
      args.beverage_slug = intent.slug;
    }
    if (intent.user_beverage_id) {
      args.user_beverage_id = intent.user_beverage_id;
    }
    const result = await logBeverage(args);
    if (result === null) return;
    if (result.deduplicated) {
      toast.success('Already logged within the last few minutes.');
    } else {
      toast.success(`Logged ${intent.volume_ml} ml`);
    }
    void today.refresh();
    void week.refresh();
    void month.refresh();
  }

  return (
    <div className="flex flex-col gap-4 text-white">
      <section
        aria-labelledby="hydration-today-heading"
        className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-5"
      >
        <h2 id="hydration-today-heading" className="text-base font-semibold text-white">
          Today
        </h2>
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <HydrationRing
            total_ml={total}
            target_ml={target}
            size="large"
            centerLabel={formatVolumeLabel(total)}
            centerSublabel={`of ${formatVolumeLabel(target)}`}
          />
          <div className="flex flex-1 flex-col gap-2 text-sm text-white/75 sm:items-start">
            <p className="font-medium text-white">
              {total >= target ? 'Daily target met' : 'Keep going'}
            </p>
            <p className="text-[12px] text-white/60">
              {today.data?.log_count ?? 0} entries logged today
            </p>
            {today.data && total >= target ? (
              <p className="text-[11px] text-[#2DA5A0]">Tap a button to log more</p>
            ) : null}
          </div>
        </div>
        {/* Prompt 177m (2026-06-09): +250 / +500 / +750 quick-add row
            removed. The per beverage How much picker (BeveragePicker)
            below is the single logging path; the three button row was
            redundant because picking a beverage already opens the
            volume stepper + Log action. */}

        {today.data && today.data.events_today.length > 0 ? (
          <div className="mt-6">
            <h3 className="mb-2 flex items-center justify-between text-[12px] font-medium uppercase tracking-wide text-white/55">
              <span>Today&apos;s intake</span>
              <span className="text-white/40">{today.data.events_today.length} entries</span>
            </h3>
            <ul className="flex flex-col gap-1">
              {[...today.data.events_today].reverse().map((event: HydrationTodayEvent) => {
                const kindInfo = BEVERAGE_KIND_LABELS[event.beverage_kind] ?? BEVERAGE_KIND_LABELS.pure_water;
                const KindIcon = kindInfo.Icon;
                return (
                  <li key={event.meal_id}>
                    <button
                      type="button"
                      onClick={() => setEditTarget({
                        mealId: event.meal_id,
                        volume: event.volume_ml,
                        kind: event.beverage_kind as HydrationBeverageKind,
                      })}
                      aria-label={`Edit ${event.food_name} ${event.volume_ml} ml at ${formatTimeOfDay(event.logged_at)}`}
                      className="flex w-full items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2 text-left text-sm transition-colors hover:border-white/[0.08] hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2"
                    >
                      <KindIcon className="h-4 w-4 text-[#2DA5A0]/80" strokeWidth={1.5} aria-hidden="true" />
                      <span className="flex-1 text-white/85">{event.food_name}</span>
                      <span className="text-[12px] text-white/60">{event.volume_ml} ml</span>
                      <span className="text-[11px] text-white/45">{formatTimeOfDay(event.logged_at)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {today.data && today.data.events_today.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center">
            <Droplet className="h-6 w-6 text-[#2DA5A0]/80" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-sm text-white/75">No drinks logged yet today</p>
            <p className="text-[12px] text-white/50">Add your first drink below to start tracking</p>
          </div>
        ) : null}

        {caffeineEvents.length > 0 ? (
          <div className="mt-6">
            <CaffeineOverlay events={caffeineEvents} sleepStartHHMM={sleepStartHHMM} />
          </div>
        ) : null}
      </section>

      <BeverageBreakdown />

      <ElectrolyteSummary events={electrolyteEvents} catalog={electrolyteCatalog} />

      <BeveragePicker
        onLogged={handleBeveragePickerLogged}
        userBeverages={userBeverages}
        onCreateCustom={createUserBeverage}
      />

      <section
        aria-labelledby="hydration-week-heading"
        className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-5"
      >
        <h2 id="hydration-week-heading" className="text-base font-semibold text-white">
          This week
        </h2>
        {week.data && week.data.days.length > 0 ? (
          <>
            <div className="mt-4 flex items-end justify-between gap-2 sm:gap-3">
              {week.data.days.map((day: HydrationHistoryDay) => {
                const barHeight = day.target_ml > 0
                  ? Math.min(100, Math.round((day.total_ml / day.target_ml) * 100))
                  : 0;
                const atTarget = day.total_ml >= day.target_ml;
                return (
                  <div key={day.day_utc} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex h-32 w-full items-end overflow-hidden rounded-lg bg-white/[0.04]">
                      <div
                        className="w-full transition-all"
                        style={{
                          height: `${barHeight}%`,
                          backgroundColor: atTarget ? '#2DA5A0' : 'rgba(45,165,160,0.5)',
                        }}
                        aria-label={`${formatDayLabel(day.day_utc)} ${day.total_ml} milliliters`}
                      />
                    </div>
                    <span className="text-[11px] text-white/55">{formatDayLabel(day.day_utc)}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[12px] text-white/65">
              <span>Average: {formatVolumeLabel(week.data.average_total_ml)} per day</span>
              <span>{week.data.days_at_target_count} of {week.data.days.length} days at target</span>
            </div>
          </>
        ) : (
          <p className="mt-3 text-[12px] text-white/55">Your weekly summary appears once you log a few days of hydration.</p>
        )}
      </section>

      <section
        aria-labelledby="hydration-month-heading"
        className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-5"
      >
        <h2 id="hydration-month-heading" className="text-base font-semibold text-white">
          This month
        </h2>
        {month.data && month.data.days.length > 0 ? (
          <>
            <div className="mt-4 grid grid-cols-10 gap-1.5">
              {month.data.days.map((day: HydrationHistoryDay) => {
                const intensity = day.target_ml > 0
                  ? Math.min(1, day.total_ml / day.target_ml)
                  : 0;
                const alpha = intensity > 0 ? 0.2 + intensity * 0.6 : 0.04;
                return (
                  <div
                    key={day.day_utc}
                    className="aspect-square rounded"
                    style={{ backgroundColor: `rgba(45,165,160,${alpha})` }}
                    title={`${day.day_utc} ${day.total_ml} ml`}
                    aria-label={`${day.day_utc} ${day.total_ml} milliliters`}
                  />
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[12px] text-white/65">
              <span>Average: {formatVolumeLabel(month.data.average_total_ml)} per day</span>
              <span>Best: {formatVolumeLabel(month.data.best_day.total_ml)}</span>
            </div>
          </>
        ) : (
          <p className="mt-3 text-[12px] text-white/55">Your monthly heatmap appears once you log hydration for a few days.</p>
        )}
      </section>

      <p className="text-[11px] leading-relaxed text-white/45">
        Hydration targets here are general estimates based on common formulas. Your needs may differ based on your health, medications, and lifestyle. For personalized guidance, talk with your healthcare provider. This feature supports your general wellness and is not intended to diagnose, treat, cure, or prevent any disease.
      </p>

      <HydrationEditPanel
        mealId={editTarget?.mealId ?? null}
        initialVolumeMl={editTarget?.volume ?? 250}
        initialBeverageKind={editTarget?.kind ?? 'pure_water'}
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null);
          void today.refresh();
          void week.refresh();
          void month.refresh();
        }}
        onDeleted={() => {
          setEditTarget(null);
          void today.refresh();
          void week.refresh();
          void month.refresh();
        }}
      />
    </div>
  );
}

export default HydrationFullSection;
