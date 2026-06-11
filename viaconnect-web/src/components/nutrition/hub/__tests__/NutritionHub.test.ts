// Prompt 183 Task 6 (2026-06-10): source as text contract tests for the My
// Nutrition bento hub and the thin page wrapper. Same convention the other hub
// tests use (readFileSync + assert on the source); full visual sign off happens
// at the Vercel preview. These lock the single metrics hook call, the band
// order and reuse of every Task 1 to 5 piece, the gauge reuse (no recompute),
// the teal glass pills + internal routes, the Open expand wiring of the three
// Row 3 tiles, the CardMedia seam on Row 1 / Row 3, the absence of an Open
// button on the inline gauges + full width tiles, the fail open posture (no
// fabricated 24 saved / 2 new this week), the read only contract, and the no
// dash rule. The page test locks the hub mount and the removal of the full
// bleed hero.

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
    expect(source).toContain('value={metrics.nutritionScore ?? 0}');
    expect(source).toContain('valueFontPx={30}');
    // The meal count still feeds the Insights panel, so the metric is preserved.
    expect(source).toContain('metrics.nutritionMealCount ?? 0');
    // The hub does not author scoring math.
    expect(source).not.toContain('calorieWeightedMealQualityScore');
    expect(source).not.toContain('totalDailyMacrosScore');
  });

  it('Row 1 score and macro gauges use the teal hub metric at size 176', () => {
    expect(source).toContain("from '@/components/gauges/PlasmaGauge'");
    expect(source).toContain('<PlasmaGauge');
    // Both Row 1 gauges carry the teal hub finish, not nutrition / mealscore.
    expect(source).toContain("metric=\"plasmateal\"");
    expect(source).toContain("metric: 'plasmateal'");
    // Row 1 gauges are size 176 (the props object and the score call site).
    expect(source).toContain('size: 176');
    expect(source).toContain('size={176}');
  });

  it('Row 1 captions read OF 100 on the score and TO TARGET on the macros gauge', () => {
    expect(source).toContain('caption="OF 100"');
    expect(source).toContain("caption: 'TO TARGET'");
  });

  it('Row 1 Daily Macros reuses PlasmaGauge for the percent to target', () => {
    expect(source).toContain('value={metrics.dailyMacrosPct ?? 0}');
    // The shared gauge props object caps the gauge at the 100 percent target.
    expect(source).toContain('max: 100');
  });

  it('Row 1 gauges fail open to a neutral empty gauge when the value is undefined (no real 0)', () => {
    expect(source).toContain("const hasMacroPct = typeof metrics.dailyMacrosPct === 'number'");
    expect(source).toContain("const hasScore = typeof metrics.nutritionScore === 'number'");
    // The empty branches turn the animation off and show a muted note, not a real 0.
    expect(source).toContain('No macros logged today yet');
    expect(source).toContain('Log a meal to see your score');
    expect(source).toContain('animated={false}');
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

  it('Row 1 cards carry the badge chips Gauge, PieChart, and Plus', () => {
    expect(source).toContain('<BadgeChip icon={Gauge} />');
    expect(source).toContain('<BadgeChip icon={PieChart} />');
    expect(source).toContain('<BadgeChip icon={Plus} />');
  });

  it('Row 1 cards center their content and place the title below the gauge', () => {
    // The badge / gauge / title / caption stack is centered via the content column.
    expect(source).toContain('contentClassName="items-center text-center"');
  });

  it('Row 1 carries no tier word and no Open affordance on the gauge cards', () => {
    // The POOR / Fair / Good tier wording is gone from the hub entirely.
    expect(source).not.toMatch(/\bPOOR\b/);
    expect(source).not.toMatch(/\bFair\b/);
    // The score and macro cards carry the new copy strings.
    expect(source).toContain('Your nutrition signal feeding Bio Optimization');
    expect(source).toContain('The fastest way to add what you ate');
  });

  it('Row 1 Log Your Meal has two internal teal glass pills to the two log routes', () => {
    expect(source).toContain('TealGlassPill');
    expect(source).toContain('href="/nutrition/log-meal"');
    expect(source).toContain('href="/nutrition/photo-ai"');
    expect(source).toContain('Log a Full Meal');
    expect(source).toContain('NutriVision');
    // Internal Next.js Link, not an absolute URL.
    expect(source).toContain("import Link from 'next/link'");
    expect(source).not.toMatch(/href=["']https?:\/\//);
  });

  it('the teal glass pill is a semi transparent teal fill with blur, border, and a top highlight', () => {
    expect(source).toContain('bg-[#2DA5A0]/[0.18]');
    expect(source).toContain('border-[#2DA5A0]/40');
    expect(source).toContain('backdrop-blur-md');
    // Faint top highlight band.
    expect(source).toContain('from-white/20 to-transparent');
  });

  it('Row 2 renders Today’s Meals full width with the resolved userId', () => {
    expect(source).toContain("import { NutritionTodaysMeals } from './NutritionTodaysMeals'");
    expect(source).toContain('<NutritionTodaysMeals userId={userId} />');
    // The userId is resolved once via supabase auth, the DailyMacrosCard pattern.
    expect(source).toContain('supabase.auth.getUser()');
    expect(source).toContain('setUserId(data.user?.id ?? null)');
  });

  it('Row 3 wires the three Open expand tiles to MyMeals, genetics links, and NutritionInsights', () => {
    expect(source).toContain("import { MyMeals } from '@/components/nutrition/MyMeals'");
    expect(source).toContain('<MyMeals');
    expect(source).toContain(
      "import { NutritionInsights } from '@/components/nutrition/NutritionInsights'",
    );
    expect(source).toContain('<NutritionInsights');
    // Genetics actions reproduced from the old page: two /genetics links plus the guide.
    const geneticsLinks = source.match(/href="\/genetics"/g) ?? [];
    expect(geneticsLinks.length).toBe(2);
    expect(source).toContain('href="/nutrition/guide"');
    expect(source).toContain('See NutrigenDX Results');
    expect(source).toContain('Upload Nutrition Test');
    expect(source).toContain('Review Nutrition Results');
  });

  it('the genetics upload caption uses commas, never a middot or dash separator', () => {
    expect(source).toContain('23andMe, AncestryDNA, MyHeritage, Viome, other raw files');
    expect(source).not.toContain('·'); // middot
  });

  it('the three Row 3 panels expand in flow via framer motion height auto, not an overlay', () => {
    expect(source).toContain("from 'framer-motion'");
    expect(source).toContain("height: 'auto'");
    // No absolute / fixed positioned expansion layer for the panels.
    expect(source).not.toContain('fixed inset-0');
  });

  it('only one Row 3 panel is open at a time', () => {
    expect(source).toContain("type OpenPanel = 'saved' | 'genetics' | 'insights' | null");
    expect(source).toContain('setOpenPanel((prev) => (prev === key ? null : key))');
  });

  it('wires each Row 3 disclosure with aria-controls on the button and aria-labelledby on the panel', () => {
    // The toggle button points at the panel it controls, and the panel names
    // its own heading, matching the canonical shop Accordion region wiring.
    expect(source).toContain('aria-controls={panelId}');
    expect(source).toContain('aria-labelledby={`${panelId}-label`}');
    expect(source).toContain('id={`${panelId}-label`}');

    // The three panel ids are the literal strings threaded to the tile and the
    // panel. Each must appear on BOTH the ExpandTile button call site and the
    // ExpandPanel id, so each string occurs at least twice in the source.
    const panelIds = [
      'nutrition-hub-panel-saved',
      'nutrition-hub-panel-genetics',
      'nutrition-hub-panel-insights',
    ];
    for (const panelId of panelIds) {
      const occurrences = source.split(`panelId="${panelId}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });

  it('Row 4 renders the Meal History tile fed the precomputed streak + counts', () => {
    expect(source).toContain(
      "import { NutritionMealHistoryTile } from './NutritionMealHistoryTile'",
    );
    expect(source).toContain('<NutritionMealHistoryTile');
    expect(source).toContain('streakDays={metrics.streakDays}');
    expect(source).toContain('dailyMealCounts={metrics.dailyMealCounts}');
  });

  it('keeps the two unmapped sections reachable below the bento', () => {
    expect(source).toContain(
      "import { RecipesLibrarySection } from '@/components/recipes/RecipesLibrarySection'",
    );
    expect(source).toContain('<RecipesLibrarySection />');
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

  it('leaves the per card media seam on Row 1 and Row 3 tiles via CardMedia gradient', () => {
    expect(source).toContain(
      "import { CardMedia } from '@/components/body-tracker/hub/CardMedia'",
    );
    expect(source).toContain("<CardMedia media={{ kind: 'gradient'");
    // The seam is a gradient placeholder, never a baked in video.
    expect(source).not.toContain("kind: 'video'");
  });

  it('renders a legibility scrim above the media seam', () => {
    expect(source).toContain('from-[#1A2744]/85 via-[#1A2744]/30 to-transparent');
  });

  it('puts an Open button only on the three Row 3 tiles, never on the gauges or full width tiles', () => {
    // The Open affordance lives in the single shared ExpandTile (one source
    // occurrence of the label and the aria-expanded button) and is instantiated
    // exactly three times, once per Row 3 tile. The inline gauges and the full
    // width tiles do not render ExpandTile, so they carry no Open.
    const opens = source.match(/<span>Open<\/span>/g) ?? [];
    expect(opens.length).toBe(1);
    const ariaExpanded = source.match(/aria-expanded=\{isOpen\}/g) ?? [];
    expect(ariaExpanded.length).toBe(1);
    const tiles = source.match(/<ExpandTile/g) ?? [];
    expect(tiles.length).toBe(3);
  });

  it('never fabricates a saved count or a new this week badge', () => {
    expect(source).toContain("const savedCountKnown = typeof metrics.savedMealsCount === 'number'");
    // The saved badge is gated on a known count and reads the real value.
    expect(source).toContain('`${metrics.savedMealsCount} saved`');
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
