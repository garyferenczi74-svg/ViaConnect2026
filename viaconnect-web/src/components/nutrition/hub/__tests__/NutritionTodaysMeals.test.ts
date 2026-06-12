// Prompt 183 Task 4 (2026-06-10): source as text contract tests for the read
// only Today's Meals accordion. Same convention the other hub tests use
// (readFileSync + assert on the source); full visual sign off happens at the
// Vercel preview. These lock the five rows, the Meal / Macros columns, the
// hydration volume framing, the PlasmaGauge reuse, the read only contract (no
// write calls), the data hook reuse, and the no dash rule.
//
// Prompt 191 (2026-06-11): adds the blue glass locks (GLASS_TIER1 rows,
// GLASS_CHIP totals, GLASS_TIER2_HEADER strip + ONE GLASS_TIER2_BODY panel
// per expanded section) and pins the framer-motion props so the glass pass
// stays presentation only.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'NutritionTodaysMeals.tsx');
const HELPERS = path.resolve(__dirname, '..', 'nutritionTodaysMeals.helpers.ts');

describe('NutritionTodaysMeals source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('is a client component', () => {
    expect(source.startsWith("'use client';")).toBe(true);
  });

  it('declares all five rows in order Breakfast, Lunch, Dinner, Snack, Hydration', () => {
    expect(source).toContain("label: 'Breakfast'");
    expect(source).toContain("label: 'Lunch'");
    expect(source).toContain("label: 'Dinner'");
    expect(source).toContain("label: 'Snack'");
    expect(source).toContain('label="Hydration"');

    const iBreakfast = source.indexOf("label: 'Breakfast'");
    const iLunch = source.indexOf("label: 'Lunch'");
    const iDinner = source.indexOf("label: 'Dinner'");
    const iSnack = source.indexOf("label: 'Snack'");
    expect(iBreakfast).toBeLessThan(iLunch);
    expect(iLunch).toBeLessThan(iDinner);
    expect(iDinner).toBeLessThan(iSnack);
    const iHydration = source.indexOf('label="Hydration"');
    expect(iSnack).toBeLessThan(iHydration);
  });

  it('delegates the per type gauge score to mealTypeAggregateScore', () => {
    expect(source).toContain('mealTypeAggregateScore(meals)');
  });

  it('lists exactly Protein, Carbs, Fat, Fiber, Sugar in grams in the Macros column', () => {
    // Prompt 183b: macros are built as rows, each value in grams (gramsLabel),
    // omitting any whose value is missing (fail open).
    expect(source).toContain("macroRow('Protein', totals.protein)");
    expect(source).toContain("macroRow('Carbs', totals.carbs)");
    expect(source).toContain("macroRow('Fat', totals.fat)");
    expect(source).toContain("macroRow('Fiber', totals.fiber)");
    expect(source).toContain("macroRow('Sugar', totals.sugar)");
    expect(source).toContain('return { label, value: gramsLabel(grams) };');
    // No separate Total row in the macros grid.
    expect(source).not.toContain("macroRow('Total'");
  });

  it('reuses PlasmaGauge for the per type and hydration gauges', () => {
    expect(source).toContain("import { PlasmaGauge } from '@/components/gauges/PlasmaGauge'");
    expect(source).toContain('<PlasmaGauge');
  });

  it('Prompt 183a/183b: the per meal type gauge uses the teal hub metric', () => {
    // The per-meal-type gauge moved from mealscore (green) to the teal hub
    // finish. Prompt 183b grew it to 132 so the kcal sits inside the orb.
    expect(source).toContain('metric="plasmateal"');
    expect(source).toContain('size={132}');
    expect(source).not.toContain('metric="mealscore"');
  });

  it('icon removal (Gary 2026-06-11): the card-top Utensils chip is gone, the row icons stay', () => {
    // The 40x40 teal badge above the title was removed; the title and the
    // functional meal row icons stay. Word bounded so UtensilsCrossed (the
    // dinner row icon) still passes.
    expect(source).not.toMatch(/\bUtensils\b/);
    expect(source).not.toContain('width: 40, height: 40, borderRadius: 12');
    expect(source).not.toContain('rgba(45,165,160,0.12)');
    expect(source).toContain('Today&apos;s meals');
    // Gary (2026-06-11): with the hero removed, the heading is plain text on
    // the card surface again, no pill container.
    expect(source).toContain(
      '<h2 className="text-[15px] font-semibold text-white">Today&apos;s meals</h2>',
    );
    expect(source).not.toContain('rounded-full px-3 py-1 text-[15px]');
    expect(source).toContain('Coffee');
    expect(source).toContain('Soup');
    expect(source).toContain('UtensilsCrossed');
    expect(source).toContain('Cookie');
    expect(source).toContain('Droplet');
    // Still no BadgeChip import or render.
    expect(source).not.toMatch(/import[^\n]*BadgeChip/);
    expect(source).not.toContain('<BadgeChip');
  });

  it('Prompt 183b: the expanded inner is a compact flex row, not a vertical stack', () => {
    // gap 30, padding 18, top aligned items. The wrap lets it stack on mobile.
    expect(source).toContain('flex flex-wrap items-start gap-[30px] p-[18px]');
  });

  it('Prompt 183b: the Meal/Macros grid is contained 1.4fr 1fr with space-between lines', () => {
    expect(source).toContain('sm:grid-cols-[1.4fr_1fr]');
    // Each line right-aligns its value within its own column, not at the page
    // edge: a flex row justified apart.
    expect(source).toContain('flex items-baseline justify-between');
  });

  it('Prompt 183b: the Meal and Macros columns have teal headers with a teal bottom rule', () => {
    expect(source).toContain('<ColumnHeader>Meal</ColumnHeader>');
    expect(source).toContain('<ColumnHeader>Macros</ColumnHeader>');
    expect(source).toContain("color: '#2DA5A0', borderBottom: '1px solid rgba(45,165,160,0.28)'");
    // Faint hairline between lines, none on the last.
    expect(source).toContain("borderBottom: '1px solid rgba(255,255,255,0.05)'");
  });

  it('Prompt 183b: the gauge shows KCAL in the center via displayValue', () => {
    expect(source).toContain('displayValue={kcal}');
    expect(source).toContain('caption="KCAL"');
    expect(source).toContain('valueFontPx={36}');
    // The old separate KCAL label beneath the gauge is gone.
    expect(source).not.toContain(">KCAL</span>");
  });

  it('reuses useUserMeals with the same args DailyTotalsTab passes', () => {
    expect(source).toContain("import { useUserMeals } from '@/hooks/useUserMeals'");
    expect(source).toContain('useUserMeals(userId ?? null, { days: 7, includeLegacy: true })');
  });

  it('reuses useHydrationToday for the hydration volumes', () => {
    expect(source).toContain("import { useHydrationToday } from '@/components/hydration/useHydrationToday'");
    expect(source).toContain('useHydrationToday()');
  });

  it('drives the hydration row with volume, not kcal', () => {
    // Hydration header total is a volume label, and the hydration panel reads
    // total_ml / target_ml off the hook rather than calories.
    expect(source).toContain('formatVolumeLabel(hydrationTotalMl)');
    expect(source).toContain('hydrationToday?.total_ml');
    expect(source).toContain('hydrationToday?.target_ml');
    expect(source).toContain('Remaining');
  });

  it('expands in flow via framer motion height auto, not an overlay', () => {
    expect(source).toContain("from 'framer-motion'");
    expect(source).toContain("height: 'auto'");
    // No fixed positioned expansion layer. (Prompt 189 added absolute inset-0
    // BACKGROUND layers, media + scrim, behind the content; the expansion
    // itself stays in flow.)
    expect(source).not.toContain('fixed inset-0');
    expect(source).toContain('className="overflow-hidden"');
  });

  it('Gary (2026-06-11): the background hero and scrim are removed, plain card surface', () => {
    // The 189 media layer is gone again: no CardMedia, no config read, no
    // scrim on this card.
    expect(source).not.toContain('CardMedia');
    expect(source).not.toContain('NUTRITION_CARD_MEDIA');
    expect(source).not.toContain(
      'pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#1A2744]/85 via-[#1A2744]/30 to-transparent',
    );
    // The root keeps its plain translucent surface, radius, and hairline.
    expect(source).toContain('relative isolate overflow-hidden');
    // Prompt 183f: the teal accent is the hub-card-frame luminous edge ring on
    // the root; AccentLine is gone and the base hairline border stays on all
    // four sides with no top border treatment anywhere in the file.
    expect(source).toContain("import '@/components/body-tracker/hub/hub-card-frame.css'");
    expect(source).toContain('hub-card-frame font-[Instrument_Sans] relative isolate overflow-hidden');
    expect(source).toContain('rounded-2xl border border-white/10 bg-[#1E3054]/40 backdrop-blur-md');
    expect(source).not.toContain('AccentLine');
    expect(source).not.toContain('border-t-2');
    expect(source).not.toContain('borderTopColor');
    // The content wrappers stay above the 183f frame glow.
    const raised = source.match(/relative z-\[2\]/g) ?? [];
    expect(raised.length).toBeGreaterThanOrEqual(2);
  });

  it('reuses the exact meal type accent codes from MealHistory for the left edge', () => {
    // The existing DATA codes are kept as is; Prompt 183b drives the 4px row
    // left edge with them instead of a full gradient fill.
    expect(source).toContain("dot: '#FFB347'"); // breakfast
    expect(source).toContain("dot: '#2DA5A0'"); // lunch
    expect(source).toContain("dot: '#B75E18'"); // dinner
    expect(source).toContain("dot: '#7C6FE0'"); // snack
    expect(source).toContain("const HYDRATION_DOT = '#5B8DEF'"); // hydration
  });

  it('Gary white glass: collapsed rows are GLASS_WHITE keeping the 4px colored left edge, no gradient fill', () => {
    expect(source).toContain(
      "import { GLASS_CHIP, GLASS_TIER2_BODY, GLASS_TIER2_HEADER, GLASS_WHITE } from './glass'",
    );
    expect(source).toContain('${GLASS_WHITE}');
    // The expanded section flips to the dark navy tiers (unchanged).
    expect(source).toContain('GLASS_TIER2_HEADER');
    expect(source).toContain('GLASS_TIER2_BODY');
    // Geometry unchanged: radius and the inline accent edge render on top.
    expect(source).toContain('borderRadius: 12');
    expect(source).toContain('borderLeft: `4px solid ${dot}`');
    // The 183b inline surface moved into glass.ts and is GONE here.
    expect(source).not.toContain("background: 'rgba(26,39,68,0.5)'");
    expect(source).not.toContain("border: '1px solid rgba(255,255,255,0.07)'");
    // The full per type gradient row FILL stays gone.
    expect(source).not.toContain('from-amber-600/40 via-orange-600/20 to-amber-700/30');
    expect(source).not.toContain('from-sky-600/40 via-blue-500/20 to-sky-700/30');
    expect(source).not.toContain('bg-gradient-to-br px-3');
  });

  it('Prompt 191: the collapsed kcal / volume chip is a GLASS_CHIP', () => {
    expect(source).toContain('${GLASS_CHIP}');
    // The old white wash chip classes are gone (text-white now comes from the
    // recipe itself).
    expect(source).not.toContain('bg-white/15');
    expect(source).not.toContain('text-white/85');
  });

  it('Prompt 191: each expanded section is a GLASS_TIER2_HEADER strip + ONE GLASS_TIER2_BODY panel', () => {
    const headers = source.match(/\$\{GLASS_TIER2_HEADER\}/g) ?? [];
    const bodies = source.match(/\{GLASS_TIER2_BODY\}/g) ?? [];
    expect(headers.length).toBe(2); // MealTypePanel + HydrationPanel strips
    expect(bodies.length).toBe(2); // one body panel each, no second surface
    // A small gap between strip and body lets the photo show through.
    expect(source).toContain('flex flex-col gap-2.5');
    // The old expanded wrapper surface is gone.
    expect(source).not.toContain('border-white/[0.06] bg-white/[0.02]');
  });

  it('Prompt 191: framer-motion expand/collapse props are untouched (presentation only)', () => {
    expect(source).toContain('initial={{ height: 0, opacity: 0 }}');
    expect(source).toContain("animate={{ height: 'auto', opacity: 1 }}");
    expect(source).toContain('exit={{ height: 0, opacity: 0 }}');
    expect(source).toContain(
      "transition={reducedMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}",
    );
    // Blur never rides the animated container: the motion.div keeps only
    // overflow-hidden and the glass sits on its static children. Blur ceiling
    // holds at md and nothing declares will-change.
    expect(source).toContain('className="overflow-hidden"');
    expect(source).not.toContain('backdrop-blur-xl');
    expect(source).not.toContain('backdrop-blur-lg');
    expect(source).not.toContain('will-change');
  });

  it('mirrors the existing empty state copy', () => {
    expect(source).toContain('logged yet today.');
  });

  it('uses Lucide strokeWidth 1.5 only', () => {
    expect(source).toContain("from 'lucide-react'");
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).not.toContain('strokeWidth={2}');
    expect(source).not.toContain('strokeWidth={1}');
  });

  it('performs ZERO writes (read only contract)', () => {
    expect(source).not.toContain('.insert(');
    expect(source).not.toContain('.update(');
    expect(source).not.toContain('.delete(');
    expect(source).not.toContain('.upsert(');
    // No fetch with a POST or DELETE method.
    expect(source).not.toMatch(/method:\s*['"]POST['"]/i);
    expect(source).not.toMatch(/method:\s*['"]DELETE['"]/i);
    expect(source).not.toContain('fetch(');
    // It does not import or render the delete/edit summary (a passing mention
    // in a comment explaining why it is NOT reused is allowed).
    expect(source).not.toMatch(/import[^\n]*TodaysMealsSummary/);
    expect(source).not.toContain('<TodaysMealsSummary');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('nutritionTodaysMeals.helpers source', () => {
  const source = readFileSync(HELPERS, 'utf-8');

  it('reuses calorieWeightedMealQualityScore rather than authoring new scoring', () => {
    expect(source).toContain("import { calorieWeightedMealQualityScore } from '@/lib/gordon/daily-aggregate'");
  });

  it('performs no reads or writes (pure transforms only)', () => {
    expect(source).not.toContain('createClient');
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('.insert(');
    expect(source).not.toContain('.update(');
    expect(source).not.toContain('.delete(');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
