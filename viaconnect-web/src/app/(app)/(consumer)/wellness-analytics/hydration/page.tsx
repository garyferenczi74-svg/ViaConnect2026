/**
 * Prompt 170o Phase 1 Phase C: Hydration Detail view per Hannah §4.
 *
 * Route /wellness-analytics/hydration. Sections top to bottom: Today (ring
 * + full-size quick-log buttons + intake timeline) -> Log a Beverage
 * (172e Phase B catalog driven picker) -> This week (bar chart + average +
 * days-at-target count) -> This month (calendar heatmap + monthly average +
 * best day) -> Settings link -> FDA-verified disclaimer footer (Hannah-
 * revised copy supersedes spec §4.7 DSHEA boilerplate).
 *
 * Prompt 172e Phase B: BeveragePicker mounted between Today and This week.
 * The picker emits BeverageLogIntent on confirm; this page wires that
 * intent to the existing 170o useHydrationQuickLog write path so no new
 * write surface is introduced.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Droplet, Coffee, Wine, Beer, Milk } from 'lucide-react';
import { HydrationRing, formatVolumeLabel } from '@/components/hydration/HydrationRing';
import { HydrationQuickLogButtons } from '@/components/hydration/HydrationQuickLogButtons';
import { HydrationEditPanel } from '@/components/hydration/HydrationEditPanel';
import { useHydrationToday } from '@/components/hydration/useHydrationToday';
import { useHydrationHistory } from '@/components/hydration/useHydrationHistory';
import { useHydrationQuickLog } from '@/components/hydration/useHydrationQuickLog';
import type { HydrationTodayEvent } from '@/components/hydration/useHydrationToday';
import type { HydrationHistoryDay } from '@/components/hydration/useHydrationHistory';
import type { HydrationBeverageKind } from '@/components/hydration/useHydrationQuickLog';
import { BeveragePicker } from '@/components/nutrition/hydration/BeveragePicker';
import type { BeverageLogIntent } from '@/components/nutrition/hydration/BeveragePicker';

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

export default function HydrationDetailPage(): JSX.Element {
  const today = useHydrationToday();
  const week = useHydrationHistory('week');
  const month = useHydrationHistory('month');

  const [editTarget, setEditTarget] = useState<{ mealId: string; volume: number; kind: HydrationBeverageKind } | null>(null);
  const { log: logBeverage } = useHydrationQuickLog();

  const total = today.data?.total_ml ?? 0;
  const target = today.data?.target_ml ?? 1890;

  async function handleBeveragePickerLogged(intent: BeverageLogIntent): Promise<void> {
    const result = await logBeverage({
      volume_ml: intent.volume_ml,
      beverage_kind: intent.beverage_kind as HydrationBeverageKind,
      log_surface: 'hydration_detail_view',
    });
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
    <div className="min-h-screen w-full bg-[#1A2744] text-white">
      <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
        <header className="mb-6 flex items-center gap-3">
          <Link
            href="/wellness-analytics"
            aria-label="Back to Wellness Analytics"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/5 text-white/80 transition-colors hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <div className="flex items-center gap-2">
            <Droplet className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-white sm:text-2xl">Hydration</h1>
          </div>
        </header>

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
          <div className="mt-5">
            <HydrationQuickLogButtons
              surface="hydration_detail_view"
              variant="three"
              layout="row"
              size="large"
              onLogged={() => { void today.refresh(); void week.refresh(); void month.refresh(); }}
            />
          </div>

          {today.data && today.data.events_today.length > 0 ? (
            <div className="mt-6">
              <h3 className="mb-2 flex items-center justify-between text-[12px] font-medium uppercase tracking-wide text-white/55">
                <span>Today's intake</span>
                <span className="text-white/40">{today.data.events_today.length} entries</span>
              </h3>
              <ul className="flex flex-col gap-1">
                {today.data.events_today.map((event: HydrationTodayEvent) => {
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
        </section>

        <div className="mt-4">
          <BeveragePicker onLogged={handleBeveragePickerLogged} />
        </div>

        <section
          aria-labelledby="hydration-week-heading"
          className="mt-4 rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-5"
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
          className="mt-4 rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-5"
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

        <Link
          href="/settings/nutrivision"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#1E3054]/45 p-4 text-sm transition-colors hover:border-[#2DA5A0]/40 hover:bg-[#1E3054]/65"
        >
          <span className="flex-1 text-white/85">Adjust your hydration settings</span>
          <ArrowLeft className="h-4 w-4 rotate-180 text-white/55" strokeWidth={1.5} />
        </Link>

        <p className="mt-6 text-[11px] leading-relaxed text-white/45">
          Hydration targets here are general estimates based on common formulas. Your needs may differ based on your health, medications, and lifestyle. For personalized guidance, talk with your healthcare provider. This feature supports your general wellness and is not intended to diagnose, treat, cure, or prevent any disease.
        </p>
      </div>

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
