'use client';

// Prompt 183 Task 4 (2026-06-10): READ ONLY Today's Meals accordion, the full
// width Row 2 tile of the My Nutrition bento hub.
//
// Contract B: this surface is strictly read only. It never writes, inserts,
// updates, or deletes; there are no POST or DELETE calls and no createClient
// writes. It reads the meals the user already logged (via useUserMeals, the
// same hook DailyTotalsTab uses) plus today's hydration totals (via
// useHydrationToday, the same hook the existing card uses) and displays them.
// The existing TodaysMealsSummary carries delete + edit affordances; this is a
// fresh read only view and deliberately reuses none of that mutation code.
//
// Five rows in fixed order: Breakfast, Lunch, Dinner, Snack, Hydration. Each
// row collapses to a name + total + chevron and expands in flow (framer motion
// height auto, content below shifts down, no overlay). The expanded meal type
// panel shows the meals logged for that type today, the type's macro totals,
// and an enlarged Plasma gauge of the type's aggregate quality score. The
// hydration panel swaps calories for volume figures.
//
// Colors: chrome uses the brand tokens; the per meal type accent dots reuse
// the exact existing DATA codes from MealHistory.tsx (breakfast #FFB347, lunch
// #2DA5A0, dinner #B75E18, snack #7C6FE0) and the per type gradients reuse the
// exact existing classes from TodaysMealsSummary.tsx MEAL_TYPE_DEFS plus the
// hydration sky gradient. Per spec these data colors are kept as is and not
// forced onto a brand token.

import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, Coffee, Cookie, Droplet, Soup, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import type { Meal, MealType } from '@/lib/gordon/types';
import { PlasmaGauge } from '@/components/gauges/PlasmaGauge';
import { useUserMeals } from '@/hooks/useUserMeals';
import { useHydrationToday } from '@/components/hydration/useHydrationToday';
import { formatVolumeLabel } from '@/components/hydration/HydrationRing';
import {
  groupTodaysMealsByType,
  hydrationPercentToTarget,
  hydrationRemainingMl,
  mealTypeAggregateScore,
  mealTypeTotals,
  type MealTypeMacroTotals,
} from './nutritionTodaysMeals.helpers';

export interface NutritionTodaysMealsProps {
  // Optional; the component resolves the signed in user the same way
  // DailyTotalsTab + DailyMacrosCard do when this is not supplied.
  readonly userId?: string | null;
  readonly userTimezone?: string;
}

interface MealTypeDef {
  readonly id: MealType;
  readonly label: string;
  readonly icon: LucideIcon;
  // Per type idle gradient: reused verbatim from TodaysMealsSummary
  // MEAL_TYPE_DEFS (lines 48 to 53) so the surfaces read as one palette.
  readonly gradient: string;
  // Per type accent dot: reused verbatim from MealHistory DOT_COLORS (lines
  // 14 to 19). These are the existing DATA codes and are kept as is.
  readonly dot: string;
}

// Reused verbatim from TodaysMealsSummary.tsx MEAL_TYPE_DEFS (gradient) and
// MealHistory.tsx DOT_COLORS (dot). Snack label is singular here to match the
// mockup row labels (Breakfast, Lunch, Dinner, Snack).
const MEAL_TYPE_DEFS: ReadonlyArray<MealTypeDef> = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee, gradient: 'from-amber-600/40 via-orange-600/20 to-amber-700/30', dot: '#FFB347' },
  { id: 'lunch', label: 'Lunch', icon: Soup, gradient: 'from-purple-500/40 via-purple-600/20 to-purple-700/30', dot: '#2DA5A0' },
  { id: 'dinner', label: 'Dinner', icon: UtensilsCrossed, gradient: 'from-indigo-500/40 via-indigo-600/20 to-violet-600/30', dot: '#B75E18' },
  { id: 'snack', label: 'Snack', icon: Cookie, gradient: 'from-rose-500/40 via-pink-500/20 to-pink-600/30', dot: '#7C6FE0' },
];

// Reused verbatim from TodaysMealsSummary.tsx (hydration header, line 420).
const HYDRATION_GRADIENT = 'from-sky-600/40 via-blue-500/20 to-sky-700/30';
const HYDRATION_DOT = '#5B8DEF';

type SectionKey = MealType | 'hydration';

function kcalLabel(kcal: number): string {
  return `${Math.round(kcal)} kcal`;
}

function gramsLabel(grams: number): string {
  return `${Math.round(grams)} g`;
}

function mealDisplayName(meal: Meal, label: string): string {
  const name = meal.mealName?.trim();
  if (name) return name;
  return label;
}

// Shared collapsed header. Used by every row so the meal type rows and the
// hydration row read identically when closed: dot, name, total chip, chevron.
function RowHeader({
  icon: Icon,
  label,
  dot,
  gradient,
  total,
  isOpen,
  onToggle,
  panelId,
}: {
  icon: LucideIcon;
  label: string;
  dot: string;
  gradient: string;
  total: string;
  isOpen: boolean;
  onToggle: () => void;
  panelId: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls={panelId}
      className={`group relative flex w-full min-h-[44px] items-center justify-between gap-2 rounded-xl border border-white/15 bg-gradient-to-br px-3 py-2.5 text-[13px] font-semibold text-white backdrop-blur-xl transition-all duration-200 ease-out hover:shadow-lg hover:shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] md:text-[14px] ${gradient}`}
    >
      <span className="flex items-center gap-2">
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: dot }}
          />
          <Icon aria-hidden="true" className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
        </span>
        <span>{label}</span>
      </span>
      <span className="flex items-center gap-2">
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] tabular-nums text-white/85">
          {total}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          strokeWidth={1.5}
        />
      </span>
    </button>
  );
}

// One macro line inside the Macros column. Label left, value right.
function MacroLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[12px] md:text-[13px]">
      <span className="text-white/60">{label}</span>
      <span className="tabular-nums text-white/90">{value}</span>
    </div>
  );
}

// The expanded panel for one of the four meal types. Heading + gauge on top,
// then a tight Meal / Macros grid beneath. Stacks to one column on mobile. The
// parent already computes totals for the collapsed kcal chip and passes them
// down so the sum is not recomputed here.
function MealTypePanel({ def, meals, totals }: { def: MealTypeDef; meals: Meal[]; totals: MealTypeMacroTotals }) {
  const score = useMemo(() => mealTypeAggregateScore(meals), [meals]);
  const kcal = Math.round(totals.kcal);
  const isEmpty = meals.length === 0;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 md:px-4 md:py-4">
      <div className="flex items-start justify-between gap-3">
        {/* Heading top left: name + kcal. */}
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-white md:text-[15px]">{def.label}</h3>
          <p className="mt-0.5 text-[12px] tabular-nums text-white/55">{kcalLabel(kcal)}</p>
        </div>

        {/* Gauge top right: aggregate quality score, KCAL + total beneath. */}
        <div className="flex flex-shrink-0 flex-col items-center">
          <PlasmaGauge
            value={score ?? 0}
            metric="plasmateal"
            max={100}
            size={112}
            showUnit={false}
            ariaLabel={
              score === null
                ? `${def.label} quality score not available`
                : `${def.label} quality score ${score} of 100`
            }
          />
          <div className="mt-1 flex flex-col items-center leading-tight">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">KCAL</span>
            <span className="text-[13px] font-semibold tabular-nums text-white/85">{kcal}</span>
          </div>
        </div>
      </div>

      {/* Tight Meal / Macros grid directly beneath the heading. */}
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.10em] text-white/45">Meal</p>
          {isEmpty ? (
            <p className="text-[12px] text-white/50">No {def.label.toLowerCase()} logged yet today.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {meals.map((meal) => (
                <li key={meal.mealId} className="flex items-center gap-2 text-[12px] text-white/85 md:text-[13px]">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: def.dot }}
                  />
                  <span className="min-w-0 truncate">{mealDisplayName(meal, def.label)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.10em] text-white/45">Macros</p>
          <div className="flex flex-col gap-1">
            <MacroLine label="Protein" value={gramsLabel(totals.protein)} />
            <MacroLine label="Carbs" value={gramsLabel(totals.carbs)} />
            <MacroLine label="Fat" value={gramsLabel(totals.fat)} />
            <MacroLine label="Fiber" value={gramsLabel(totals.fiber)} />
            <MacroLine label="Sugar" value={gramsLabel(totals.sugar)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// The expanded hydration panel: volume figures (logged / target / remaining)
// instead of calories, with a Plasma gauge of percent to the hydration target.
function HydrationPanel({ totalMl, targetMl }: { totalMl: number; targetMl: number }) {
  const remaining = hydrationRemainingMl(totalMl, targetMl);
  const pct = hydrationPercentToTarget(totalMl, targetMl);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 md:px-4 md:py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-white md:text-[15px]">Hydration</h3>
          <p className="mt-0.5 text-[12px] tabular-nums text-white/55">{formatVolumeLabel(totalMl)}</p>
        </div>

        <div className="flex flex-shrink-0 flex-col items-center">
          <PlasmaGauge
            value={pct}
            metric="bioscore"
            max={100}
            size={112}
            unit="%"
            showUnit={false}
            ariaLabel={`Hydration ${pct} percent of target`}
          />
          <div className="mt-1 flex flex-col items-center leading-tight">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">TARGET</span>
            <span className="text-[13px] font-semibold tabular-nums text-white/85">{formatVolumeLabel(targetMl)}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.10em] text-white/45">Logged</span>
          <span className="mt-0.5 text-[14px] font-semibold tabular-nums text-white/90">{formatVolumeLabel(totalMl)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.10em] text-white/45">Target</span>
          <span className="mt-0.5 text-[14px] font-semibold tabular-nums text-white/90">{formatVolumeLabel(targetMl)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.10em] text-white/45">Remaining</span>
          <span className="mt-0.5 text-[14px] font-semibold tabular-nums text-white/90">{formatVolumeLabel(remaining)}</span>
        </div>
      </div>
    </div>
  );
}

export function NutritionTodaysMeals(props: NutritionTodaysMealsProps) {
  const { userId, userTimezone } = props;
  const tz = useMemo(
    () => userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [userTimezone],
  );

  // Read only sources. Same args DailyTotalsTab passes; the component never
  // writes through either hook.
  const { meals } = useUserMeals(userId ?? null, { days: 7, includeLegacy: true });
  const { data: hydrationToday } = useHydrationToday();

  const hydrationTotalMl = hydrationToday?.total_ml ?? 0;
  const hydrationTargetMl = hydrationToday?.target_ml ?? 0;

  const mealsByType = useMemo(
    () => groupTodaysMealsByType(meals, new Date(), tz),
    [meals, tz],
  );

  // Single open row at a time keeps the in flow accordion compact; tapping an
  // open row closes it. A closed default matches the read only summary intent.
  const [openKey, setOpenKey] = useState<SectionKey | null>(null);
  const toggle = (key: SectionKey) => setOpenKey((prev) => (prev === key ? null : key));

  // Honor prefers reduced motion: collapse the expand to an instant swap, the
  // same way the canonical shop Accordion does. Inlined at each motion.div so
  // the ease literal stays contextually typed against framer's Transition.
  const reducedMotion = useReducedMotion();

  return (
    <section className="font-[Instrument_Sans] rounded-2xl border border-white/10 bg-[#1E3054]/40 backdrop-blur-md text-white">
      <header className="flex items-center gap-2 px-4 py-3 md:px-5 md:py-4">
        <UtensilsCrossed className="h-4 w-4 text-white/70" strokeWidth={1.5} />
        <h2 className="text-[15px] font-semibold text-white">Today&apos;s meals</h2>
      </header>

      <div className="flex flex-col gap-3 px-3 pb-3 md:px-4 md:pb-4">
        {MEAL_TYPE_DEFS.map((def) => {
          const list = mealsByType[def.id];
          const isOpen = openKey === def.id;
          const totals = mealTypeTotals(list);
          const kcal = Math.round(totals.kcal);
          const panelId = `meals-panel-${def.id}`;
          return (
            <div key={def.id}>
              <RowHeader
                icon={def.icon}
                label={def.label}
                dot={def.dot}
                gradient={def.gradient}
                total={kcalLabel(kcal)}
                isOpen={isOpen}
                onToggle={() => toggle(def.id)}
                panelId={panelId}
              />
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    key="panel"
                    id={panelId}
                    role="region"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={reducedMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2">
                      <MealTypePanel def={def} meals={list} totals={totals} />
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Hydration: 5th row. Collapsed total is volume, not kcal. */}
        <div>
          <RowHeader
            icon={Droplet}
            label="Hydration"
            dot={HYDRATION_DOT}
            gradient={HYDRATION_GRADIENT}
            total={formatVolumeLabel(hydrationTotalMl)}
            isOpen={openKey === 'hydration'}
            onToggle={() => toggle('hydration')}
            panelId="meals-panel-hydration"
          />
          <AnimatePresence initial={false}>
            {openKey === 'hydration' ? (
              <motion.div
                key="panel"
                id="meals-panel-hydration"
                role="region"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="pt-2">
                  <HydrationPanel totalMl={hydrationTotalMl} targetMl={hydrationTargetMl} />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export default NutritionTodaysMeals;
