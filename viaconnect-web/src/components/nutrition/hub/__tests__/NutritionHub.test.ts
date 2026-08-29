// Prompt 183 Task 6 (2026-06-10): source as text contract tests for the My
// Nutrition bento hub and the thin page wrapper. Same convention the other hub
// tests use (readFileSync + assert on the source); full visual sign off happens
// at the Vercel preview. These lock the single metrics hook call, the band
// order and reuse of every Task 1 to 5 piece, the gauge reuse (no recompute),
// the teal glass pills + internal routes, the navigation wiring of the three
// Row 3 tiles, the CardMedia seam on Row 1 / Row 3, the absence of an Open
// button on the inline gauges + full width tiles, the fail open posture (no
// fabricated 24 saved / 2 new this week), the read only contract, and the no
// dash rule. The page test locks the hub mount and the removal of the full
// bleed hero.
//
// Prompt 192 Task 4 (2026-06-12): the Insights expander machinery (ExpandTile,
// ExpandPanel, the OpenPanel state, the inline NutritionInsights panel) left
// the hub for the NutritionInsightsTile navigation card; negative locks below
// keep it from returning.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const HUB = path.resolve(__dirname, '..', 'NutritionHub.tsx');
const PAGE = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'app',
  '(app)',
  '(consumer)',
  'nutrition',
  'page.tsx',
);

describe('NutritionHub source', () => {
  const source = readFileSync(HUB, 'utf-8');

  it('is a client component', () => {
    expect(source.startsWith("'use client';")).toBe(true);
  });

  it('calls useNutritionHubMetrics exactly once', () => {
    expect(source).toContain("import { useNutritionHubMetrics } from './useNutritionHubMetrics'");
    const calls = source.match(/useNutritionHubMetrics\(/g) ?? [];
    // One import reference plus one call site. The call form appears once.
    expect(calls.length).toBe(1);
    expect(source).toContain('const { metrics } = useNutritionHubMetrics();');
  });

  it('renders the header and the getting started strip', () => {
    expect(source).toContain("import { NutritionHubHeader } from './NutritionHubHeader'");
    expect(source).toContain('<NutritionHubHeader />');
    expect(source).toContain(
      "import { NutritionGettingStartedStrip } from './NutritionGettingStartedStrip'",
    );
    expect(source).toContain('<NutritionGettingStartedStrip />');
  });

  it('preserves the conditional NutriVision handoff banner from the old page', () => {
    expect(source).toContain(
      "import { useNutrivisionManualLogHandoff } from '@/hooks/useNutrivisionManualLogHandoff'",
    );
    expect(source).toContain('const { handoff, clearHandoff } = useNutrivisionManualLogHandoff();');
    // Gated on handoff presence, never rendered unconditionally.
    expect(source).toContain('{handoff ? (');
    expect(source).toContain('Discard photo');
  });

  it('Row 1 Nutrition Score renders a plain teal PlasmaGauge, not the tier circle gauge', () => {
    // Prompt 183a: the score card no longer uses NutritionScoreCircleGauge; it
    // renders a plain teal PlasmaGauge at size 176 fed the precomputed score.
    expect(source).not.toContain('NutritionScoreCircleGauge');
    expect(source).toContain('value={scoreCenter.value}');
    expect(source).toContain('valueFontPx={30}');
    // The hub does not author scoring math.
    expect(source).not.toContain('calorieWeightedMealQualityScore');
    expect(source).not.toContain('totalDailyMacrosScore');
  });

  it('Row 1 score and macro gauges use the teal hub metric at the shared main plasma floor', () => {
    expect(source).toContain("from '@/components/gauges/PlasmaGauge'");
    expect(source).toContain('<PlasmaGauge');
    // Both Row 1 gauges carry the teal hub finish, not nutrition / mealscore.
    expect(source).toContain("metric=\"plasmateal\"");
    expect(source).toContain("metric: 'plasmateal'");
    expect(source).toContain('PLASMA_MAIN_MOBILE');
    expect(source).toContain('size: PLASMA_MAIN_MOBILE');
    expect(source).toContain('size={PLASMA_MAIN_MOBILE}');
  });

  it('Row 1 captions read OF 100 on the score and OF TARGET on the macros gauge', () => {
    expect(source).toContain('caption="OF 100"');
    expect(source).toContain("caption: 'OF TARGET'");
    expect(source).toContain("valueSuffix: '%'");
  });

  it('Row 1 Daily Macros reuses PlasmaGauge for the percent to target', () => {
    expect(source).toContain('value={macroCenter.value}');
    // The shared gauge props object caps the gauge at the 100 percent target.
    expect(source).toContain('max: 100');
  });

  it('Row 1 empty score rings always mount PlasmaGauge, never Connections dashes or a fake 0 OF 100', () => {
    expect(source).not.toContain('ConnectionsBosDial');
    expect(source).toContain('from \'./nutritionHubScoreDisplay\'');
    expect(source).toContain('nutritionHubScoreCenter(metrics.nutritionScore)');
    expect(source).toContain('nutritionHubMacroCenter(metrics.dailyMacrosPct)');
    expect(source).toContain('scoreCenter.kind === \'score\'');
    expect(source).toContain('macroCenter.kind === \'macros\'');
    expect(source).toContain('<PlasmaGauge');
    expect(source).toContain('empty');
    expect(source).toContain('<PlasmaGauge {...macroGaugeProps} empty />');
    expect(source).toContain('No macros logged today yet');
    expect(source).toContain('Log a meal to see your score');
    // Empty branch must not feed PlasmaGauge a fake 0 score with OF 100.
    expect(source).not.toMatch(/<PlasmaGauge[\s\S]{0,400}value=\{0\}/);
    expect(source).not.toContain('value={0}');
    expect(source).not.toContain('animated={false}');
  });

  it('Row 1 Daily Macros readout shows absolute grams, not percentages', () => {
    // The readout row reads the gram fields and omits an undefined one.
    expect(source).toContain('metrics.proteinG');
    expect(source).toContain('metrics.carbsG');
    expect(source).toContain('metrics.fatG');
    expect(source).toContain('metrics.fiberG');
    expect(source).toContain("typeof m.grams === 'number'");
    // A g suffix off the gram value, not a percent sign, in the readout cell.
    expect(source).toContain('{m.grams}g');
    expect(source).not.toContain('{m.pct}%');
  });

  it('icon removal (Gary 2026-06-11): no decorative badge chips remain on any card', () => {
    // BadgeChip and its six call sites are gone. Prompt 219e: meal action icons
    // (Camera, PenLine, Droplet) live on LogYourMealActions; the hub keeps
    // Open chevrons and the handoff banner X.
    expect(source).not.toContain('BadgeChip');
    expect(source).toContain(
      "import { ChevronRight, X } from 'lucide-react'",
    );
  });

  it('Row 1 cards center their content and place the title below the gauge', () => {
    // The badge / gauge / title / caption stack is centered via the content column.
    expect(source).toContain('contentClassName="items-center text-center"');
  });

  it('183e + Gary: heading blocks sit on the card true vertical center, actions bottom anchored', () => {
    // Three heading wrappers (Progress, Save My Meal, Genetics) are absolutely
    // centered text layers with pointer events passing through, so the Open
    // controls beneath stay clickable. Prompt 192: the Insights wrapper moved
    // into NutritionInsightsTile.tsx with the tile. Prompt 207a (2026-06-20):
    // the Log Your Meal heading moved OUT of the centered layer to the top of
    // the card in normal flow, so its three pills no longer cover the heading.
    const centered =
      source.match(
        /pointer-events-none absolute inset-0 flex flex-col items-center justify-center/g,
      ) ?? [];
    expect(centered.length).toBe(3);
    // The controls keep their bottom anchor + guaranteed gap.
    expect(source).toContain('mt-auto flex pt-4');
    // Prompt 219e: Log Your Meal actions share LogYourMealActions; hub wraps with mt-auto.
    expect(source).toContain('mt-auto w-full pt-4');
  });

  it('Row 1 carries no tier word and no Open affordance on the gauge cards', () => {
    // The POOR / Fair / Good tier wording is gone from the hub entirely.
    expect(source).not.toMatch(/\bPOOR\b/);
    expect(source).not.toMatch(/\bFair\b/);
    // The score and macro cards carry the new copy strings.
    expect(source).toContain('Your nutrition signal feeding Bio Optimization');
    expect(source).toContain('The fastest way to add what you ate');
  });

  it('Row 1 Log Your Meal has three internal glass pills: NutriVision, Log a Full Meal, Hydration', () => {
    // Prompt 219e: shared LogYourMealActions (same component as Dashboard).
    expect(source).not.toContain('TealGlassPill');
    expect(source).not.toContain('function GlassPill');
    expect(source).toContain('LogYourMealActions');
    expect(source).toContain("import { LogYourMealActions } from '@/components/nutrition/LogYourMealActions'");
    // Internal Next.js Link, not an absolute URL (actions component owns routes).
    expect(source).toContain("import Link from 'next/link'");
    expect(source).not.toMatch(/href=["']https?:\/\//);
  });

  it('the glass pill is a WHITE translucent fill with blur, border, and a top highlight', () => {
    // Prompt 219e: glass styles live on LogYourMealActions (shared with Dashboard).
    const actions = readFileSync(
      path.resolve(__dirname, '..', '..', 'LogYourMealActions.tsx'),
      'utf8',
    );
    expect(actions).toContain('bg-white/[0.08]');
    expect(actions).toContain('border border-white/20');
    expect(actions).not.toContain('bg-[#2DA5A0]/[0.18]');
    expect(actions).toContain('backdrop-blur-md');
    expect(actions).toContain('from-white/20 to-transparent');
    // Order: NutriVision, Log a Full Meal, Hydration.
    const n = actions.indexOf('NutriVision');
    const f = actions.indexOf('Log a Full Meal');
    const h = actions.indexOf('Hydration');
    expect(n).toBeLessThan(f);
    expect(f).toBeLessThan(h);
    // The Open pills on hub tiles remain halved (media visible through them).
    expect(source).toContain('bg-[#2A4C9E]/[0.12]');
    expect(source).not.toContain('bg-[#2A4C9E]/25');
  });

  it('Row 2 renders Today’s Meals full width with the resolved userId', () => {
    expect(source).toContain("import { NutritionTodaysMeals } from './NutritionTodaysMeals'");
    expect(source).toContain('<NutritionTodaysMeals userId={userId} />');
    // The userId is resolved once via supabase auth, the DailyMacrosCard pattern.
    expect(source).toContain('supabase.auth.getUser()');
    expect(source).toContain('setUserId(data.user?.id ?? null)');
  });

  it('Prompt 192: Row 3 Insights is the NutritionInsightsTile, the inline panel is gone', () => {
    // Prompt 183c: MyMeals no longer renders on the hub. Prompt 192: the old
    // NutritionInsights inline panel and its import left too; the tile owns
    // its own data fetch and links to /nutrition/insights. The old component
    // file survives unrendered.
    expect(source).not.toContain('@/components/nutrition/MyMeals');
    expect(source).not.toContain('<MyMeals');
    expect(source).not.toContain('@/components/nutrition/NutritionInsights');
    expect(source).not.toContain('mealsLoggedToday');
    expect(source).toContain(
      "import { NutritionInsightsTile } from './NutritionInsightsTile'",
    );
    expect(source).toContain('<NutritionInsightsTile');
    // The tile keeps the media descriptor + log key and receives the cold
    // start gate computed from the existing 7 day meal counts metric.
    expect(source).toContain('media={NUTRITION_CARD_MEDIA.nutritionInsights}');
    expect(source).toContain('mediaLogKey="nutritionInsights"');
    expect(source).toContain(
      'coldStart={(metrics.dailyMealCounts?.reduce((sum, n) => sum + n, 0) ?? 0) < 3}',
    );
  });

  it('Prompt 187: the genetics links left the hub for the /nutrition/genetics page', () => {
    // The old expand panel's three actions (See NutrigenDX Results, Upload
    // Nutrition Test, Review Nutrition Results) moved INTO the new page, so no
    // /genetics or /nutrition/guide link remains on the hub.
    expect(source).not.toContain('href="/genetics"');
    expect(source).not.toContain('href="/nutrition/guide"');
    expect(source).not.toContain('See NutrigenDX Results');
    expect(source).not.toContain('Upload Nutrition Test');
    expect(source).not.toContain('Review Nutrition Results');
    expect(source).not.toContain('nutrition-hub-panel-genetics');
  });

  it('Prompt 187: the Nutrition by Genetics card is a navigation Link, not an expander', () => {
    // Mirrors the SaveMyMealTile precedent: HubTile chrome, centered content,
    // the kept description, and a bottom aligned Open Link to the standalone
    // page carrying the analytics event name seam and a right chevron.
    expect(source).toContain('<NutritionGeneticsTile');
    expect(source).toContain('Nutrition by Genetics');
    expect(source).toContain('Your NutrigenDX results and nutrition test uploads.');
    expect(source).toContain('href="/nutrition/genetics"');
    expect(source).toContain('data-analytics-event="nutrition_genetics_open"');
    expect(source).toContain('ChevronRight');
  });

  it('Prompt 183c: the Save My Meal card is a navigation Link, not an expander', () => {
    // The card keeps its singular label, links to the standalone saved meals
    // page with a right chevron, and shows the real saved count badge (never a
    // hardcoded 24). It does not toggle any panel.
    expect(source).toContain('<SaveMyMealTile');
    expect(source).toContain('Save My Meal');
    expect(source).toContain('href="/nutrition/saved-meals"');
    expect(source).toContain('ChevronRight');
    expect(source).toContain('savedMealsCount={metrics.savedMealsCount}');
    expect(source).toContain('Your saved meal library, ready to log in a tap');
    // No saved expand panel remains anywhere.
    expect(source).not.toContain('nutrition-hub-panel-saved');
  });

  it('Prompt 200: the Progress tile is a navigation Link inserted before Save My Meal', () => {
    expect(source).toContain('<NutritionProgressTile');
    // Prompt 199a: deep links to the canonical My Biology Progress surface,
    // not the removed nutrition placeholder.
    expect(source).toContain('href="/body-tracker/progress"');
    expect(source).not.toContain('href="/nutrition/progress"');
    expect(source).toContain('data-analytics-event="nutrition_progress_open"');
    const iProgress = source.indexOf('<NutritionProgressTile');
    const iSaved = source.indexOf('<SaveMyMealTile');
    expect(iProgress).toBeGreaterThan(-1);
    expect(iProgress).toBeLessThan(iSaved);
    // Row 3 grid widened to four columns to fit the new tile on one line.
    expect(source).toContain('md:grid-cols-4');
  });

  it('uses no middot separators anywhere', () => {
    // The genetics provider caption left the hub with its panel (Prompt 187);
    // the hub still never uses a middot separator.
    expect(source).not.toContain('·'); // middot
  });

  it('Prompt 192: the expander machinery is gone (ExpandTile, ExpandPanel, OpenPanel)', () => {
    // Negative locks: the Insights expander was the machinery's last
    // consumer, so the components, the state union, the toggle, the panel id,
    // and the disclosure aria wiring all left the hub.
    expect(source).not.toContain('ExpandTile');
    expect(source).not.toContain('ExpandPanel');
    expect(source).not.toContain('OpenPanel');
    expect(source).not.toContain('openPanel');
    expect(source).not.toContain('nutrition-hub-panel-insights');
    expect(source).not.toContain('aria-expanded');
    expect(source).not.toContain('aria-controls');
    expect(source).not.toContain('ChevronDown');
  });

  it('Prompt 192: framer motion left the hub with the expander machinery', () => {
    expect(source).not.toContain("from 'framer-motion'");
    expect(source).not.toContain('AnimatePresence');
    expect(source).not.toContain('useReducedMotion');
    expect(source).not.toContain("height: 'auto'");
    // Still no absolute / fixed positioned expansion layer anywhere.
    expect(source).not.toContain('fixed inset-0');
  });

  it('Row 4 renders the Meal History tile fed the precomputed streak + counts', () => {
    expect(source).toContain(
      "import { NutritionMealHistoryTile } from './NutritionMealHistoryTile'",
    );
    expect(source).toContain('<NutritionMealHistoryTile');
    expect(source).toContain('streakDays={metrics.streakDays}');
    expect(source).toContain('dailyMealCounts={metrics.dailyMealCounts}');
  });

  it('keeps the connected app dropdown below the bento and removes the inline recipes library', () => {
    // Prompt 183c: RecipesLibrarySection moved to its own /nutrition/saved-meals
    // page and no longer renders or imports on the hub. ConnectedAppMealDropdown
    // stays exactly as it was.
    expect(source).not.toContain('RecipesLibrarySection');
    expect(source).not.toContain('@/components/recipes/RecipesLibrarySection');
    expect(source).toContain(
      "import { ConnectedAppMealDropdown } from '@/components/nutrition/ConnectedAppMealDropdown'",
    );
    expect(source).toContain('<ConnectedAppMealDropdown />');
  });

  it('renders the two bottom strips, reusing the body-tracker AssessmentRetakeCard', () => {
    expect(source).toContain("import { NutritionConnectStrip } from './NutritionConnectStrip'");
    expect(source).toContain('<NutritionConnectStrip />');
    expect(source).toContain(
      "import { AssessmentRetakeCard } from '@/components/body-tracker/hub/AssessmentRetakeCard'",
    );
    expect(source).toContain('<AssessmentRetakeCard />');
  });

  it('runs every tile seam through CardMedia: config media when wired, gradient otherwise', () => {
    expect(source).toContain(
      "import { CardMedia } from '@/components/body-tracker/hub/CardMedia'",
    );
    // Prompt 189: HubTile renders a provided media descriptor with its log
    // key, and the original gradient placeholder branch is preserved exactly
    // for the unwired tiles.
    expect(source).toContain('<CardMedia media={media} logKey={mediaLogKey} />');
    expect(source).toContain("<CardMedia media={{ kind: 'gradient', gradientClass }} />");
    // No media descriptor is ever inlined in the hub; kinds and URLs live
    // only in nutritionHubMedia.ts.
    expect(source).not.toContain("kind: 'video'");
    expect(source).not.toContain('https://');
  });

  it('Prompt 189: the four media cards pass their nutritionHubMedia keys with log keys', () => {
    expect(source).toContain("} from './nutritionHubMedia'");
    expect(source).toContain('media={NUTRITION_CARD_MEDIA.logYourMeal}');
    expect(source).toContain('mediaLogKey="logYourMeal"');
    expect(source).toContain('media={NUTRITION_CARD_MEDIA.saveMyMeal}');
    expect(source).toContain('mediaLogKey="saveMyMeal"');
    expect(source).toContain('media={NUTRITION_CARD_MEDIA.nutritionByGenetics}');
    expect(source).toContain('mediaLogKey="nutritionByGenetics"');
    expect(source).toContain('media={NUTRITION_CARD_MEDIA.nutritionInsights}');
    expect(source).toContain('mediaLogKey="nutritionInsights"');
    // Gary (2026-06-11): Daily Macros gains the Food 5 background video and
    // Nutrition Score gains the Mountain top background video.
    expect(source).toContain('media={NUTRITION_CARD_MEDIA.dailyMacros}');
    expect(source).toContain('mediaLogKey="dailyMacros"');
    expect(source).toContain('media={NUTRITION_CARD_MEDIA.nutritionScore}');
    expect(source).toContain('mediaLogKey="nutritionScore"');
    // Prompt 200: the Progress tile gains the attractive-fit-woman background video.
    expect(source).toContain('media={NUTRITION_CARD_MEDIA.progress}');
    expect(source).toContain('mediaLogKey="progress"');
    // Exactly the seven wired call sites; nothing else on the hub reads the
    // config (Today's Meals no longer renders media at all).
    const reads = source.match(/NUTRITION_CARD_MEDIA\./g) ?? [];
    expect(reads.length).toBe(7);
    expect(source).not.toContain('NUTRITION_CARD_MEDIA.todaysMeals');
  });

  it('Prompt 189: HubTile media props stay optional with the gradient fallback', () => {
    expect(source).toContain('media?: SurfaceMedia');
    expect(source).toContain('mediaLogKey?: string');
    expect(source).toContain("<CardMedia media={{ kind: 'gradient', gradientClass }} />");
  });

  it('renders a legibility scrim above the media seam', () => {
    expect(source).toContain('from-[#1A2744]/85 via-[#1A2744]/30 to-transparent');
  });

  it('Prompt 183f: every HubTile carries the hub-card-frame luminous edge ring and AccentLine is gone', () => {
    // The shared css module is imported once; the bundler dedupes it.
    expect(source).toContain("import '@/components/body-tracker/hub/hub-card-frame.css'");
    // The frame class rides the tile root; the base hairline border stays on
    // all four sides.
    expect(source).toContain(
      'hub-card-frame relative isolate flex min-h-[200px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md',
    );
    // The prior SVG AccentLine implementation is fully removed.
    expect(source).not.toContain('AccentLine');
    expect(source).not.toContain('border-t-2');
    expect(source).not.toContain('borderTopColor');
    // No square cornered solid 2px span returns either.
    expect(source).not.toContain('h-[2px]');
  });

  it('Prompt 183f: the now dead accent prop left HubTile entirely', () => {
    // Its only consumer was the removed line; Log Your Meal dropped
    // accent={TEAL} and the orphaned TEAL const is gone with it.
    expect(source).not.toContain('accent?: string');
    expect(source).not.toContain('accent={TEAL}');
    expect(source).not.toContain("const TEAL = '#2DA5A0'");
  });

  it('puts an Open control only on the Row 3 tiles, never on the gauges or full width tiles', () => {
    // Prompt 192: Save My Meal and Nutrition by Genetics render their Open
    // Links here; Prompt 200 adds the Progress tile's Open Link; the Nutrition
    // Insights tile renders its own Open Link in its own file
    // (NutritionInsightsTile.tsx), so the hub source carries exactly three. The
    // inline gauges and the full width tiles render none.
    const opens = source.match(/<span>Open<\/span>/g) ?? [];
    expect(opens.length).toBe(3);
    const savedTiles = source.match(/<SaveMyMealTile/g) ?? [];
    expect(savedTiles.length).toBe(1);
    const geneticsTiles = source.match(/<NutritionGeneticsTile/g) ?? [];
    expect(geneticsTiles.length).toBe(1);
    const insightTiles = source.match(/<NutritionInsightsTile/g) ?? [];
    expect(insightTiles.length).toBe(1);
  });

  it('never fabricates a saved count or a new this week badge', () => {
    // Prompt 183c: the saved count badge moved into SaveMyMealTile. It is gated
    // on a known number and reads the real savedMealsCount, never a literal.
    expect(source).toContain("typeof savedMealsCount === 'number'");
    expect(source).toContain('{savedMealsCount} saved');
    expect(source).toContain('savedMealsCount={metrics.savedMealsCount}');
    // No hardcoded fabricated literals.
    expect(source).not.toContain('24 saved');
    expect(source).not.toMatch(/2 new this week/i);
    expect(source).not.toMatch(/new this week/i);
  });

  it('opens no write path: no inserts, updates, deletes, or fetches from the hub itself', () => {
    expect(source).not.toContain('.insert(');
    expect(source).not.toContain('.update(');
    expect(source).not.toContain('.delete(');
    expect(source).not.toContain('.upsert(');
    expect(source).not.toContain('fetch(');
    expect(source).not.toMatch(/method:\s*['"]POST['"]/i);
    expect(source).not.toMatch(/method:\s*['"]DELETE['"]/i);
  });

  it('uses Lucide strokeWidth 1.5 only', () => {
    expect(source).toContain("from 'lucide-react'");
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).not.toContain('strokeWidth={2}');
    expect(source).not.toContain('strokeWidth={1}');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('nutrition page.tsx wrapper', () => {
  const source = readFileSync(PAGE, 'utf-8');

  it('renders the NutritionHub', () => {
    expect(source).toContain("import { NutritionHub } from '@/components/nutrition/hub/NutritionHub'");
    expect(source).toContain('<NutritionHub />');
  });

  it('no longer imports or renders the full bleed MobileHeroBackground hero', () => {
    expect(source).not.toContain('MobileHeroBackground');
  });

  it('paints plain Deep Navy behind the hub', () => {
    expect(source).toContain('bg-[#1A2744]');
  });

  it('keeps a Suspense boundary and a default export', () => {
    expect(source).toContain("import { Suspense } from 'react'");
    expect(source).toContain('<Suspense');
    expect(source).toContain('export default function NutritionPage()');
  });

  it('does not render the superseded long scroll components on this page', () => {
    expect(source).not.toContain('NutritionScoreCard');
    expect(source).not.toContain('DailyMacrosCard');
    expect(source).not.toContain('DailyTotalsTab');
    expect(source).not.toContain('MealHistory');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

// Icon removal exceptions (Gary 2026-06-11): the Connections strip and the
// Update Your Assessment card KEEP their icons on both hubs. Read only locks
// on those untouched files so a future sweep cannot strip them silently.
describe('icon removal exceptions keep their icons', () => {
  const CONNECT = path.resolve(__dirname, '..', 'NutritionConnectStrip.tsx');
  const RETAKE = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'body-tracker',
    'hub',
    'AssessmentRetakeCard.tsx',
  );

  it('NutritionConnectStrip still renders its Plug chip', () => {
    const src = readFileSync(CONNECT, 'utf-8');
    expect(src).toContain("import { ArrowRight, Plug } from 'lucide-react'");
    expect(src).toContain('<Plug');
  });

  it('AssessmentRetakeCard still renders its RefreshCw icons', () => {
    const src = readFileSync(RETAKE, 'utf-8');
    expect(src).toContain("import { RefreshCw, Check } from 'lucide-react'");
    expect(src).toContain('<RefreshCw');
  });
});
