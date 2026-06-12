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
// height auto, content below shifts down, no overlay). The collapsed header
// hides while its panel is open. The expanded meal type panel is a compact
// side-by-side flex row: meal-main (heading + a contained Meal / Macros grid)
// on the left, an enlarged Plasma gauge beside it showing the type's KCAL in
// the orb while the ring fills to the aggregate quality score. The hydration
// panel swaps calories for volume figures.
//
// Prompt 183b (2026-06-11): presentational pass to the v21 mockup. The full per
// type gradient row FILL is replaced by a translucent navy row with a 4px
// colored LEFT EDGE; the expanded panel is the side-by-side flex row above; the
// gauge center shows KCAL via PlasmaGauge's additive displayValue prop.
//
// Colors: chrome uses the brand tokens; the per meal type accent codes reuse
// the exact existing DATA codes from MealHistory.tsx (breakfast #FFB347, lunch
// #2DA5A0, dinner #B75E18, snack #7C6FE0) for the 4px left edge and the in
// panel item dots. Per spec these data codes are kept as is and not forced onto
// a brand token.
//
// Prompt 189 then Gary (2026-06-11): the card briefly carried the todaysMeals
// background still + scrim; both are REMOVED again per Gary, returning the
// card to its plain translucent surface. The z-[2] content wrappers remain so
// content stacks above the 183f frame glow.
//
// Prompt 191 (2026-06-11): blue glass containment over the 189 photo. The
// collapsed rows, the kcal / volume chips, and the expanded header strip +
// single body panel all sit on the shared Deep Navy glass recipes in
// ./glass.ts so no text ever sits raw on the background photography while the
// photo stays visible through the tint. Presentation only: expand/collapse
// logic, data, ordering, aria wiring, and the framer-motion wrappers are
// untouched; blur lives on the static children, never on the animated
// motion.div (backdrop-filter during a height animation janks). Tailwind's
// backdrop-blur utilities emit -webkit-backdrop-filter, so Safari needs
// nothing extra.

import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, Coffee, Cookie, Droplet, Soup, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import type { Meal, MealType } from '@/lib/gordon/types';
import { PlasmaGauge } from '@/components/gauges/PlasmaGauge';
import '@/components/body-tracker/hub/hub-card-frame.css';
import { useUserMeals } from '@/hooks/useUserMeals';
import { useHydrationToday } from '@/components/hydration/useHydrationToday';
import { formatVolumeLabel } from '@/components/hydration/HydrationRing';
import { GLASS_CHIP, GLASS_TIER2_BODY, GLASS_TIER2_HEADER, GLASS_WHITE } from './glass';
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
  // Per type accent: the existing DATA code reused verbatim from MealHistory
  // DOT_COLORS (lines 15 to 18). Prompt 183b drives the collapsed row's 4px
  // LEFT EDGE and the in panel item dots with this code; it is kept as is and
  // is NOT swapped for a brand token or the mockup reference hex.
  readonly dot: string;
}

// Snack label is singular here to match the mockup row labels (Breakfast,
// Lunch, Dinner, Snack). dot codes reused verbatim from MealHistory.tsx
// DOT_COLORS (lines 15 to 18).
const MEAL_TYPE_DEFS: ReadonlyArray<MealTypeDef> = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee, dot: '#FFB347' },
  { id: 'lunch', label: 'Lunch', icon: Soup, dot: '#2DA5A0' },
  { id: 'dinner', label: 'Dinner', icon: UtensilsCrossed, dot: '#B75E18' },
  { id: 'snack', label: 'Snack', icon: Cookie, dot: '#7C6FE0' },
];

// Hydration accent, reused verbatim from NutritionTodaysMeals' own prior
// HYDRATION_DOT (the existing sky code) for the hydration row's 4px left edge.
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
//
// Prompt 183b (2026-06-11): the full per type gradient FILL is removed in
// favor of a translucent Deep Navy panel with a hairline border and a 4px
// colored LEFT EDGE in the per type accent (the existing `dot` code, reused
// as is). The accent reads as an edge, not a wash.
//
// Prompt 191 + Gary (2026-06-11): the COLLAPSED row is WHITE glass
// (GLASS_WHITE) so closed rows read light over the photo; the section flips
// to the dark navy glass tiers when expanded. Geometry is unchanged: the
// radius and the inline 4px left accent edge render on top of the glass
// exactly as before.
function RowHeader({
  icon: Icon,
  label,
  dot,
  total,
  isOpen,
  onToggle,
  panelId,
}: {
  icon: LucideIcon;
  label: string;
  dot: string;
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
      className={`group relative flex w-full min-h-[44px] items-center justify-between gap-2 px-3 py-2.5 text-[13px] font-semibold text-white transition-all duration-200 ease-out hover:shadow-lg hover:shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] md:text-[14px] ${GLASS_WHITE}`}
      style={{
        borderRadius: 12,
        borderLeft: `4px solid ${dot}`,
      }}
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
        {/* Prompt 191: the total chip is a GLASS_CHIP (text-white lives in the
            recipe); content and tap behavior are identical. */}
        <span className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${GLASS_CHIP}`}>
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

// One line inside a contained column (Meal item or Macros). Label left, value
// right, justified apart so the value right-aligns within its own narrow column
// rather than at the page edge. A faint hairline sits beneath every line except
// the last. Prompt 183b.
function ColumnLine({ label, value, isLast }: { label: string; value: string; isLast: boolean }) {
  return (
    <div
      className="flex items-baseline justify-between gap-3 py-1 text-[12px] md:text-[13px]"
      style={isLast ? undefined : { borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <span className="min-w-0 truncate text-white/55">{label}</span>
      <span className="flex-shrink-0 tabular-nums text-white/90">{value}</span>
    </div>
  );
}

// The small uppercase teal column header with a thin teal bottom rule. Prompt
// 183b: caps both the Meal and the Macros columns inside meal-main.
function ColumnHeader({ children }: { children: string }) {
  return (
    <p
      className="mb-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.10em]"
      style={{ color: '#2DA5A0', borderBottom: '1px solid rgba(45,165,160,0.28)' }}
    >
      {children}
    </p>
  );
}

// One macro paired with its gram value, or null when the value is missing so
// the row is omitted (fail open, NULL not zero). Prompt 183b.
function macroRow(label: string, grams: number | null | undefined): { label: string; value: string } | null {
  if (grams === null || grams === undefined || !Number.isFinite(grams)) return null;
  return { label, value: gramsLabel(grams) };
}

// The expanded panel for one of the four meal types. Prompt 183b: a single
// compact horizontal flex row, not a tall stack. meal-main (the contained
// Meal / Macros grid) flexes to fill the left; the gauge sits BESIDE it on
// the right, top aligned, so the panel height is the taller block with no
// empty vertical gap. Under sm the inner WRAPS: meal-main full width, the
// gauge centers beneath. The parent already computes totals for the collapsed
// kcal chip and passes them down so the sum is not recomputed here.
//
// Prompt 191: the heading (name + kcal + collapse chevron) moves onto its own
// GLASS_TIER2_HEADER strip and everything else sits inside ONE
// GLASS_TIER2_BODY panel, with a 10px gap between them so the photo shows
// through. The 183b flex row and its 18px / 30px spacing are unchanged inside
// the body panel.
function MealTypePanel({
  def,
  meals,
  totals,
  onCollapse,
}: {
  def: MealTypeDef;
  meals: Meal[];
  totals: MealTypeMacroTotals;
  onCollapse: () => void;
}) {
  const score = useMemo(() => mealTypeAggregateScore(meals), [meals]);
  const kcal = Math.round(totals.kcal);
  const isEmpty = meals.length === 0;

  // Macros, omitting any whose gram value is missing (fail open, NULL not zero).
  const macros = [
    macroRow('Protein', totals.protein),
    macroRow('Carbs', totals.carbs),
    macroRow('Fat', totals.fat),
    macroRow('Fiber', totals.fiber),
    macroRow('Sugar', totals.sugar),
  ].filter((m): m is { label: string; value: string } => m !== null);

  return (
    // Prompt 191: glass strip + glass body. Blur sits on these STATIC children
    // inside the animated motion.div, never on the motion.div itself.
    <div className="flex flex-col gap-2.5">
      {/* Header strip: name + kcal + collapse chevron on its own glass. */}
      <div className={`flex items-baseline justify-between gap-2 rounded-xl px-[18px] py-3 ${GLASS_TIER2_HEADER}`}>
        <h3 className="flex items-baseline gap-2 text-[14px] font-semibold text-white md:text-[15px]">
          <span>{def.label}</span>
          <span className="text-[12px] font-medium tabular-nums text-white/70">{kcalLabel(kcal)}</span>
        </h3>
        <button
          type="button"
          onClick={onCollapse}
          aria-label={`Collapse ${def.label}`}
          className="flex-shrink-0 rounded-md p-0.5 text-white/70 transition-colors hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <ChevronDown className="h-4 w-4 rotate-180" strokeWidth={1.5} />
        </button>
      </div>

      {/* Body panel: ALL remaining expanded content on ONE glass surface. */}
      <div className={GLASS_TIER2_BODY}>
        {/* Inner side-by-side row. Wraps under sm. (183b, unchanged.) */}
        <div className="flex flex-wrap items-start gap-[30px] p-[18px]">
          {/* meal-main: the contained two column grid. */}
          <div className="grow basis-full sm:basis-0" style={{ minWidth: 0 }}>
            {/* Contained Meal / Macros grid: values sit close to their labels,
                not at the page edge. 1.4fr 1fr at sm+, one column on mobile. */}
            <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-[1.4fr_1fr] sm:gap-[34px]">
              <div>
                <ColumnHeader>Meal</ColumnHeader>
                {isEmpty ? (
                  <p className="py-1 text-[12px] text-white/50">No {def.label.toLowerCase()} logged yet today.</p>
                ) : (
                  <div className="flex flex-col">
                    {meals.map((meal, i) => (
                      <ColumnLine
                        key={meal.mealId}
                        label={mealDisplayName(meal, def.label)}
                        value={kcalLabel(Math.round(meal.caloriesKcal))}
                        isLast={i === meals.length - 1}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <ColumnHeader>Macros</ColumnHeader>
                {macros.length === 0 ? (
                  <p className="py-1 text-[12px] text-white/50">No macros yet.</p>
                ) : (
                  <div className="flex flex-col">
                    {macros.map((m, i) => (
                      <ColumnLine key={m.label} label={m.label} value={m.value} isLast={i === macros.length - 1} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gauge: BESIDE the content, top aligned, text centered. The orb
              shows the meal-type KCAL (displayValue); the ring stays driven by
              the aggregate quality score (value), unchanged. No KCAL label
              beneath. */}
          <div className="flex flex-[0_0_auto] flex-col items-center text-center max-sm:w-full">
            <PlasmaGauge
              value={score ?? 0}
              displayValue={kcal}
              caption="KCAL"
              valueFontPx={36}
              metric="plasmateal"
              max={100}
              size={132}
              showUnit={false}
              ariaLabel={
                score === null
                  ? `${def.label} ${kcal} kilocalories, quality score not available`
                  : `${def.label} ${kcal} kilocalories, quality score ${score} of 100`
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// The expanded hydration panel. Prompt 183b: same compact side-by-side flex
// row as the meal panels (so it does not stretch tall either), but framed in
// VOLUME, not kcal. meal-main holds a contained Logged / Target / Remaining
// column; the gauge sits beside it showing percent to target in the orb, top
// aligned. Under sm the inner wraps and the gauge centers. Prompt 191: the
// identical glass treatment as MealTypePanel, a GLASS_TIER2_HEADER strip
// (heading + volume + chevron) over ONE GLASS_TIER2_BODY panel.
function HydrationPanel({
  totalMl,
  targetMl,
  onCollapse,
}: {
  totalMl: number;
  targetMl: number;
  onCollapse: () => void;
}) {
  const remaining = hydrationRemainingMl(totalMl, targetMl);
  const pct = hydrationPercentToTarget(totalMl, targetMl);

  const lines: ReadonlyArray<{ label: string; value: string }> = [
    { label: 'Logged', value: formatVolumeLabel(totalMl) },
    { label: 'Target', value: formatVolumeLabel(targetMl) },
    { label: 'Remaining', value: formatVolumeLabel(remaining) },
  ];

  return (
    // Prompt 191: glass strip + glass body, same composition as MealTypePanel.
    <div className="flex flex-col gap-2.5">
      {/* Header strip: name + volume + collapse chevron on its own glass. */}
      <div className={`flex items-baseline justify-between gap-2 rounded-xl px-[18px] py-3 ${GLASS_TIER2_HEADER}`}>
        <h3 className="flex items-baseline gap-2 text-[14px] font-semibold text-white md:text-[15px]">
          <span>Hydration</span>
          <span className="text-[12px] font-medium tabular-nums text-white/70">{formatVolumeLabel(totalMl)}</span>
        </h3>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse Hydration"
          className="flex-shrink-0 rounded-md p-0.5 text-white/70 transition-colors hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <ChevronDown className="h-4 w-4 rotate-180" strokeWidth={1.5} />
        </button>
      </div>

      {/* Body panel: volumes + gauge on ONE glass surface. */}
      <div className={GLASS_TIER2_BODY}>
        <div className="flex flex-wrap items-start gap-[30px] p-[18px]">
          {/* meal-main: the contained volume column. */}
          <div className="grow basis-full sm:basis-0" style={{ minWidth: 0 }}>
            <div className="max-w-[18rem]">
              <ColumnHeader>Volume</ColumnHeader>
              <div className="flex flex-col">
                {lines.map((l, i) => (
                  <ColumnLine key={l.label} label={l.label} value={l.value} isLast={i === lines.length - 1} />
                ))}
              </div>
            </div>
          </div>

          {/* Gauge beside the content: percent to the hydration target in the orb. */}
          <div className="flex flex-[0_0_auto] flex-col items-center text-center max-sm:w-full">
            <PlasmaGauge
              value={pct}
              displayValue={pct}
              valueSuffix="%"
              caption="OF TARGET"
              valueFontPx={32}
              metric="bioscore"
              max={100}
              size={132}
              showUnit={false}
              ariaLabel={`Hydration ${pct} percent of target`}
            />
          </div>
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

  // Prompt 183f (2026-06-11): the teal accent is the hub-card-frame tapered
  // luminous edge ring, painted by the class's pseudo elements so it follows
  // the card radius and never bleeds past the rounded corners.
  return (
    <section className="hub-card-frame font-[Instrument_Sans] relative isolate overflow-hidden rounded-2xl border border-white/10 bg-[#1E3054]/40 backdrop-blur-md text-white">
      {/* Gary (2026-06-11): the 189 background hero and its scrim are removed
          from this card; the surface is the plain translucent card again. The
          z-[2] content wrappers stay so content sits above the frame glow. */}
      <header className="relative z-[2] px-4 py-3 md:px-5 md:py-4">
        <h2 className="text-[15px] font-semibold text-white">Today&apos;s meals</h2>
      </header>

      <div className="relative z-[2] flex flex-col gap-3 px-3 pb-3 md:px-4 md:pb-4">
        {MEAL_TYPE_DEFS.map((def) => {
          const list = mealsByType[def.id];
          const isOpen = openKey === def.id;
          const totals = mealTypeTotals(list);
          const kcal = Math.round(totals.kcal);
          const panelId = `meals-panel-${def.id}`;
          return (
            <div key={def.id}>
              {/* The collapsed header hides while the panel is open; the panel
                  carries its own collapse chevron. */}
              {!isOpen ? (
                <RowHeader
                  icon={def.icon}
                  label={def.label}
                  dot={def.dot}
                  total={kcalLabel(kcal)}
                  isOpen={isOpen}
                  onToggle={() => toggle(def.id)}
                  panelId={panelId}
                />
              ) : null}
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
                    <MealTypePanel
                      def={def}
                      meals={list}
                      totals={totals}
                      onCollapse={() => toggle(def.id)}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Hydration: 5th row. Collapsed total is volume, not kcal. */}
        <div>
          {openKey !== 'hydration' ? (
            <RowHeader
              icon={Droplet}
              label="Hydration"
              dot={HYDRATION_DOT}
              total={formatVolumeLabel(hydrationTotalMl)}
              isOpen={false}
              onToggle={() => toggle('hydration')}
              panelId="meals-panel-hydration"
            />
          ) : null}
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
                <HydrationPanel
                  totalMl={hydrationTotalMl}
                  targetMl={hydrationTargetMl}
                  onCollapse={() => toggle('hydration')}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export default NutritionTodaysMeals;
