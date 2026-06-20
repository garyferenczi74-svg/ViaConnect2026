'use client';

// Prompt 183 Task 6 (2026-06-10): My Nutrition bento hub. The integration
// keystone that assembles the Task 1 to 5 pieces into the banded bento and
// becomes the body of the /nutrition page.
//
// Contract: this hub is a READ ONLY consumer + launcher. It opens no new write
// path and adds no new table. It calls useNutritionHubMetrics ONCE at the top
// and threads the result down. Every metric is treated as fail open: an
// undefined value renders the empty / neutral state, never a fabricated 0 and
// never an invented count. While loading the gauges sit in their own empty
// state (mealCount / counts undefined) rather than flashing a real looking zero.
//
// The body sits on plain Deep Navy (the page wrapper paints #1A2744); there is
// NO full bleed hero. Layout bands, in order:
//   header, getting started strip, conditional NutriVision handoff banner,
//   Row 1 triad (Nutrition Score, Log Your Meal, Daily Macros),
//   Row 2 Today's Meals (full width),
//   Row 3 triad (Save My Meal, Nutrition by Genetics, Nutrition Insights).
//     All three are navigation tiles whose Open links to their standalone
//     pages: /nutrition/saved-meals (Prompt 183c), /nutrition/genetics
//     (Prompt 187), and /nutrition/insights (Prompt 192 Task 4, which
//     replaced the old in flow Insights expander with a tap-through tile
//     that previews the top insight),
//   Row 4 Meal History (full width),
//   unmapped section (connected app dropdown) that self hides,
//   bottom strips (Connect, Assessment retake).
//
// Standing rules honored: tokens only (Navy #1A2744, Card #1E3054, Teal
// #2DA5A0, Orange #B75E18), Instrument Sans, Lucide strokeWidth 1.5, no emojis,
// no em or en dashes anywhere. Reuse, never reimplement: the Row 1 score and
// macro gauges are both PlasmaGauge (Prompt 183a, teal hub finish), and the per
// card media seam is the existing CardMedia. The score and macro values are NOT
// recomputed here; they arrive precomputed from the hook.
//
// Prompt 189 (2026-06-11): the Log Your Meal and Row 3 tiles render real
// background media (one image + four videos across the hub) through the same
// CardMedia seam, configured in nutritionHubMedia.ts; the gradient constants
// moved there verbatim. Presentational layering only: routing, content, and
// geometry are unchanged, and the Nutrition Score, Daily Macros, and Meal
// History tiles keep their gradient seams.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Camera, ChevronRight, Droplet, PenLine, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useNutrivisionManualLogHandoff } from '@/hooks/useNutrivisionManualLogHandoff';
import { PlasmaGauge, type PlasmaGaugeProps } from '@/components/gauges/PlasmaGauge';
import { ConnectedAppMealDropdown } from '@/components/nutrition/ConnectedAppMealDropdown';
import { CardMedia } from '@/components/body-tracker/hub/CardMedia';
import type { SurfaceMedia } from '@/components/body-tracker/hub/hubConfig';
import { AssessmentRetakeCard } from '@/components/body-tracker/hub/AssessmentRetakeCard';
import '@/components/body-tracker/hub/hub-card-frame.css';
import { useNutritionHubMetrics } from './useNutritionHubMetrics';
import { NutritionInsightsTile } from './NutritionInsightsTile';
import { NutritionHubHeader } from './NutritionHubHeader';
import { NutritionGettingStartedStrip } from './NutritionGettingStartedStrip';
import { NutritionConnectStrip } from './NutritionConnectStrip';
import { NutritionTodaysMeals } from './NutritionTodaysMeals';
import { NutritionMealHistoryTile } from './NutritionMealHistoryTile';
import {
  MEDIA_ORANGE_BR,
  MEDIA_TEAL_BC,
  MEDIA_TEAL_BL,
  MEDIA_TEAL_BR,
  MEDIA_TEAL_TL,
  MEDIA_TEAL_TR,
  NUTRITION_CARD_MEDIA,
} from './nutritionHubMedia';

// Per card media seam. ROW 1 and ROW 3 tiles drop CardMedia in as the z 0 back
// layer. Prompt 189: the gradient constants and the five real media
// descriptors live in nutritionHubMedia.ts; the gradient classes mirror the My
// Biology hub card palette (teal corners for the data tiles, an orange corner
// for the priority Log Your Meal tile) so the seam reads consistently with the
// body-tracker bento.

// Shared tile shell for the ROW 1 and ROW 3 bento cards. Layers back to front:
//   z 0: CardMedia gradient placeholder (the video drop in seam),
//   z 1: legibility scrim so content stays readable over any future frame,
//   z 2: content. The Prompt 183f hub-card-frame pseudo elements paint the
//        tapered luminous edge ring on the root (crisp ring at z 2 under the
//        content, blurred glow at z 1 with the scrim).
function HubTile({
  children,
  gradientClass,
  media,
  mediaLogKey,
  className,
  contentClassName,
}: {
  children: React.ReactNode;
  gradientClass: string;
  // Prompt 189 (2026-06-11): optional real media descriptor from
  // nutritionHubMedia. When present, CardMedia renders it (failing open to its
  // own gradientClass) with mediaLogKey as its structured log key; when
  // absent, the original gradient placeholder renders exactly as before.
  media?: SurfaceMedia;
  mediaLogKey?: string;
  className?: string;
  // Prompt 183a (2026-06-11): optional classes for the z 2 content column. The
  // Row 1 cards pass items-center text-center so the gauge, title, and caption
  // stack centered; omitted elsewhere so existing tiles are unchanged.
  contentClassName?: string;
}) {
  return (
    <div
      className={`hub-card-frame relative isolate flex min-h-[200px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md ${className ?? ''}`}
    >
      {/* z 0: per card media seam. Real media when wired, gradient otherwise. */}
      {media ? (
        <CardMedia media={media} logKey={mediaLogKey} />
      ) : (
        <CardMedia media={{ kind: 'gradient', gradientClass }} />
      )}

      {/* z 1: legibility scrim over any media frame. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#1A2744]/85 via-[#1A2744]/30 to-transparent"
      />

      {/* z 2: content. */}
      <div className={`relative z-[2] flex h-full flex-col p-4 md:p-5 ${contentClassName ?? ''}`}>
        {children}
      </div>
    </div>
  );
}

// A white glass pill used by the priority Log Your Meal tile (Gary
// 2026-06-11: switched from the teal fill to white translucent glass): white
// translucent fill, backdrop blur, soft white border, a faint top highlight,
// white text. The focus ring keeps the teal accent.
function GlassPill({ href, icon: Icon, label }: { href: string; icon: typeof PenLine; label: string }) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-[44px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/20 bg-white/[0.08] px-4 py-2.5 text-[13px] font-semibold text-white no-underline backdrop-blur-md transition-all duration-200 hover:border-white/35 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] active:scale-[0.98]"
    >
      {/* Faint top highlight on the glass. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent opacity-70"
      />
      <Icon aria-hidden="true" className="relative h-4 w-4" strokeWidth={1.5} />
      <span className="relative">{label}</span>
    </Link>
  );
}

// Prompt 200 (2026-06-15): the Progress Row 3 tile is a navigation card
// mirroring SaveMyMealTile, inserted before Save My Meal so the triad becomes a
// four tile row. Prompt 199a (2026-06-15): its Open now deep links to the
// canonical My Biology Progress surface (/body-tracker/progress, the Trajectory
// Planner) instead of a nutrition placeholder, so both Progress cards resolve to
// the same page.
function NutritionProgressTile({
  gradientClass,
  media,
  mediaLogKey,
}: {
  gradientClass: string;
  // Prompt 200: optional pass-throughs to the inner HubTile media seam.
  media?: SurfaceMedia;
  mediaLogKey?: string;
}) {
  return (
    <HubTile
      gradientClass={gradientClass}
      media={media}
      mediaLogKey={mediaLogKey}
      contentClassName="items-center text-center"
    >
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
        <h3 className="text-[15px] font-semibold leading-tight text-white md:text-base">
          Goals and Progress
        </h3>
        <p className="text-[12px] leading-relaxed text-white/[0.62] md:text-[13px]">
          Create and follow your wellness goals
        </p>
      </div>

      <div className="mt-auto flex pt-4">
        <Link
          href="/body-tracker/progress"
          data-analytics-event="nutrition_progress_open"
          className="inline-flex items-center gap-1 rounded-full border border-[#5B8DEF]/30 bg-[#2A4C9E]/[0.12] px-3 py-1.5 text-[12px] font-medium text-white no-underline backdrop-blur-md transition-all duration-200 hover:border-[#5B8DEF]/55 hover:bg-[#2A4C9E]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none"
        >
          <span>Open</span>
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Link>
      </div>
    </HubTile>
  );
}

// Prompt 183c (2026-06-11): the Save My Meal Row 3 tile is a navigation card,
// not an expander. It keeps the same HubTile chrome as its two siblings so the
// triad stays visually consistent, centers its content like the Row 1 cards,
// and pins an Open control to the bottom that is a Next.js Link to the standalone
// Save My Meals page. The saved count badge reads the real savedMealsCount and
// is omitted entirely when the count is not yet known.
function SaveMyMealTile({
  gradientClass,
  media,
  mediaLogKey,
  savedMealsCount,
}: {
  gradientClass: string;
  // Prompt 189: optional pass-throughs to the inner HubTile media seam.
  media?: SurfaceMedia;
  mediaLogKey?: string;
  savedMealsCount?: number;
}) {
  return (
    <HubTile
      gradientClass={gradientClass}
      media={media}
      mediaLogKey={mediaLogKey}
      contentClassName="items-center text-center"
    >
      {/* Gary (2026-06-11): heading block on the card's TRUE vertical center;
          Open stays bottom anchored. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
        <h3 className="text-[15px] font-semibold leading-tight text-white md:text-base">
          Save My Meal
        </h3>
        <p className="text-[12px] leading-relaxed text-white/[0.62] md:text-[13px]">
          Your saved meal library, ready to log in a tap
        </p>
        {typeof savedMealsCount === 'number' ? (
          <span className="mt-1 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium tabular-nums text-white/80 backdrop-blur-sm">
            {savedMealsCount} saved
          </span>
        ) : null}
      </div>

      {/* Bottom aligned Open that navigates to the Save My Meals page. */}
      <div className="mt-auto flex pt-4">
        <Link
          href="/nutrition/saved-meals"
          className="inline-flex items-center gap-1 rounded-full border border-[#5B8DEF]/30 bg-[#2A4C9E]/[0.12] px-3 py-1.5 text-[12px] font-medium text-white no-underline backdrop-blur-md transition-all duration-200 hover:border-[#5B8DEF]/55 hover:bg-[#2A4C9E]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none"
        >
          <span>Open</span>
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Link>
      </div>
    </HubTile>
  );
}

// Prompt 187 Task 4 (2026-06-11): the Nutrition by Genetics Row 3 tile is a
// navigation card mirroring SaveMyMealTile. Its Open is a Next.js Link to the
// standalone /nutrition/genetics page (the three tab bento); the old expand
// panel's three actions live on that page now. data-analytics-event is the
// event name seam only: no analytics infrastructure reads hub cards yet.
function NutritionGeneticsTile({
  gradientClass,
  media,
  mediaLogKey,
}: {
  gradientClass: string;
  // Prompt 189: optional pass-throughs to the inner HubTile media seam.
  media?: SurfaceMedia;
  mediaLogKey?: string;
}) {
  return (
    <HubTile
      gradientClass={gradientClass}
      media={media}
      mediaLogKey={mediaLogKey}
      contentClassName="items-center text-center"
    >
      {/* Gary (2026-06-11): heading block on the card's TRUE vertical center;
          Open stays bottom anchored. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
        <h3 className="text-[15px] font-semibold leading-tight text-white md:text-base">
          Nutrition by Genetics
        </h3>
        <p className="text-[12px] leading-relaxed text-white/[0.62] md:text-[13px]">
          Your NutrigenDX results and nutrition test uploads.
        </p>
      </div>

      {/* Bottom aligned Open that navigates to the Nutrition by Genetics page. */}
      <div className="mt-auto flex pt-4">
        <Link
          href="/nutrition/genetics"
          data-analytics-event="nutrition_genetics_open"
          className="inline-flex items-center gap-1 rounded-full border border-[#5B8DEF]/30 bg-[#2A4C9E]/[0.12] px-3 py-1.5 text-[12px] font-medium text-white no-underline backdrop-blur-md transition-all duration-200 hover:border-[#5B8DEF]/55 hover:bg-[#2A4C9E]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none"
        >
          <span>Open</span>
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Link>
      </div>
    </HubTile>
  );
}

export function NutritionHub() {
  // Single hook call at the top; its values are distributed to the tiles.
  const { metrics } = useNutritionHubMetrics();

  // Resolve the signed in user once, the same way DailyMacrosCard /
  // DailyTotalsTab do, and pass it to Today's Meals. The hub itself never
  // writes through this client.
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Conditional photo handoff banner state, reused from the old page.
  const { handoff, clearHandoff } = useNutrivisionManualLogHandoff();

  // Prompt 183a (2026-06-11): the Daily Macros readout row shows ABSOLUTE
  // GRAMS, not percentages. Only render a readout whose gram value is defined; a
  // missing macro is omitted, never shown as 0.
  const macroReadouts: ReadonlyArray<{ label: string; grams?: number }> = [
    { label: 'Protein', grams: metrics.proteinG },
    { label: 'Carbs', grams: metrics.carbsG },
    { label: 'Fat', grams: metrics.fatG },
    { label: 'Fiber', grams: metrics.fiberG },
  ];

  // Daily Macros gauge: render the real percent when defined, otherwise a
  // neutral empty gauge (value 0, animation off) with a caption so it never
  // reads as a real 0 percent.
  const hasMacroPct = typeof metrics.dailyMacrosPct === 'number';
  // Nutrition Score gauge: fail open. When the score is undefined render a
  // neutral empty gauge (value 0, animation off) with a muted note instead of a
  // fabricated number. Missing is treated as NULL, never 0.
  const hasScore = typeof metrics.nutritionScore === 'number';

  // Props shared by the real and empty Daily Macros gauge branches. The two
  // branches vary only value and animated; keeping the rest here avoids
  // drifting the gauge geometry between the two states. Prompt 183a: teal hub
  // finish, Row 1 size 176, percent-to-target caption.
  const macroGaugeProps: Pick<
    PlasmaGaugeProps,
    | 'metric'
    | 'variant'
    | 'max'
    | 'size'
    | 'showUnit'
    | 'subtleTrack'
    | 'plainNumber'
    | 'caption'
    | 'valueFontPx'
    | 'valueSuffix'
  > = {
    metric: 'plasmateal',
    variant: 'standard',
    max: 100,
    size: 176,
    showUnit: false,
    subtleTrack: true,
    plainNumber: true,
    caption: 'OF TARGET',
    valueFontPx: 24,
    valueSuffix: '%',
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <NutritionHubHeader />

      <NutritionGettingStartedStrip />

      {/* Conditional NutriVision handoff banner. Markup + behavior preserved
          from the old page; renders only when a handoff is present. */}
      {handoff ? (
        <div className="rounded-xl border border-[#2DA5A0]/40 bg-[#1E3054]/55 p-4 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-relaxed text-white/85">
              Your photo is ready. Tap Breakfast, Lunch, Dinner, or Snack below to log this meal
              manually.
            </p>
            <button
              type="button"
              onClick={clearHandoff}
              aria-label="Discard the attached photo"
              className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white/90"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
          <button
            type="button"
            onClick={clearHandoff}
            className="mt-3 inline-flex items-center text-xs font-medium text-[#2DA5A0] transition-colors hover:underline"
          >
            Discard photo
          </button>
        </div>
      ) : null}

      {/* ROW 1: triad. 1 col mobile, 3 cols at md+. Each card centers its
          content: the gauge (on the gauge cards), then the title below it,
          then the caption / readouts. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Nutrition Score: plain Plasma gauge in the teal hub finish, the
            title below the gauge, then the signal caption. No Open, no tier word.
            When the score is undefined a neutral empty gauge plus a muted note
            stands in for a fabricated number. */}
        <HubTile
          gradientClass={MEDIA_TEAL_TL}
          media={NUTRITION_CARD_MEDIA.nutritionScore}
          mediaLogKey="nutritionScore"
          contentClassName="items-center text-center"
        >
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            {hasScore ? (
              <PlasmaGauge
                metric="plasmateal"
                size={176}
                value={metrics.nutritionScore ?? 0}
                caption="OF 100"
                valueFontPx={30}
                plainNumber
                subtleTrack
                showUnit={false}
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <PlasmaGauge
                  metric="plasmateal"
                  size={176}
                  value={0}
                  animated={false}
                  caption="OF 100"
                  valueFontPx={30}
                  plainNumber
                  subtleTrack
                  showUnit={false}
                />
                <span className="text-[11px] text-white/55">Log a meal to see your score</span>
              </div>
            )}
            <h3 className="text-[15px] font-semibold leading-tight text-white md:text-base">
              Nutrition Score
            </h3>
            <p className="text-[12px] leading-relaxed text-white/[0.62] md:text-[13px]">
              Your nutrition signal feeding Bio Optimization
            </p>
          </div>
        </HubTile>

        {/* Log Your Meal: PRIORITY tile. The title, a caption, then the two
            teal glass pills routing to the two internal log surfaces. Gary
            (2026-06-11): sits BETWEEN Nutrition Score and Daily Macros. */}
        <HubTile
          gradientClass={MEDIA_ORANGE_BR}
          media={NUTRITION_CARD_MEDIA.logYourMeal}
          mediaLogKey="logYourMeal"
          contentClassName="items-center text-center"
        >
          {/* Gary (2026-06-20): the title and caption sit at the TOP of the
              card in normal flow, above the three pills, so the taller pill
              stack no longer covers the heading. The pills stay anchored at
              the bottom via mt-auto. */}
          <div className="flex flex-col items-center">
            <h3 className="text-[15px] font-semibold leading-tight text-white md:text-base">
              Log Your Meal
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-white/[0.62] md:text-[13px]">
              The fastest way to add what you ate
            </p>
          </div>
          {/* Gary (2026-06-11): NutriVision sits ABOVE Log a Full Meal.
              Prompt 207: Hydration pill added as the third entry point. */}
          <div className="mt-auto flex w-full flex-col items-center gap-3 pt-4">
            <GlassPill href="/nutrition/photo-ai" icon={Camera} label="NutriVision" />
            <GlassPill href="/nutrition/log-meal" icon={PenLine} label="Log a Full Meal" />
            <GlassPill href="/wellness-analytics/hydration" icon={Droplet} label="Hydration" />
          </div>
        </HubTile>

        {/* Daily Macros: single Plasma gauge of percent to target in the
            teal hub finish, the title below the gauge, then the absolute gram
            readout row. When the overall percent is undefined render a neutral
            empty gauge, not a real 0. */}
        <HubTile
          gradientClass={MEDIA_TEAL_TR}
          media={NUTRITION_CARD_MEDIA.dailyMacros}
          mediaLogKey="dailyMacros"
          contentClassName="items-center text-center"
        >
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            {hasMacroPct ? (
              <PlasmaGauge {...macroGaugeProps} value={metrics.dailyMacrosPct ?? 0} />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <PlasmaGauge {...macroGaugeProps} value={0} animated={false} />
                <span className="text-[11px] text-white/55">No macros logged today yet</span>
              </div>
            )}
            <h3 className="text-[15px] font-semibold leading-tight text-white md:text-base">
              Daily Macros
            </h3>
            {hasMacroPct ? (
              <div className="grid w-full grid-cols-4 gap-1.5">
                {macroReadouts.map((m) =>
                  typeof m.grams === 'number' ? (
                    <div key={m.label} className="flex flex-col items-center">
                      <span className="text-[10px] uppercase tracking-wide text-white/45">
                        {m.label}
                      </span>
                      <span className="text-[12px] font-semibold tabular-nums text-white/90">
                        {m.grams}g
                      </span>
                    </div>
                  ) : null,
                )}
              </div>
            ) : null}
          </div>
        </HubTile>
      </div>

      {/* ROW 2: Today's Meals, full width. Ships its own surface. */}
      <NutritionTodaysMeals userId={userId} />

      {/* ROW 3: triad. All three are navigation tiles whose Open links to
          their standalone pages, bottom aligned on a consistent line. Prompt
          192 Task 4: Nutrition Insights swapped its in flow expander for a
          tap-through tile that previews the top insight and opens
          /nutrition/insights. The cold start gate fails toward Getting
          Started while the hub metrics load. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <NutritionProgressTile
          gradientClass={MEDIA_TEAL_TL}
          media={NUTRITION_CARD_MEDIA.progress}
          mediaLogKey="progress"
        />
        <SaveMyMealTile
          gradientClass={MEDIA_TEAL_BL}
          media={NUTRITION_CARD_MEDIA.saveMyMeal}
          mediaLogKey="saveMyMeal"
          savedMealsCount={metrics.savedMealsCount}
        />
        <NutritionGeneticsTile
          gradientClass={MEDIA_TEAL_BC}
          media={NUTRITION_CARD_MEDIA.nutritionByGenetics}
          mediaLogKey="nutritionByGenetics"
        />
        <NutritionInsightsTile
          gradientClass={MEDIA_TEAL_BR}
          media={NUTRITION_CARD_MEDIA.nutritionInsights}
          mediaLogKey="nutritionInsights"
          coldStart={(metrics.dailyMealCounts?.reduce((sum, n) => sum + n, 0) ?? 0) < 3}
        />
      </div>

      {/* ROW 4: Meal History, full width. Ships its own surface; both props fail
          open inside the tile. While the hook is loading these are undefined, so
          the tile shows its calm placeholder rather than a fabricated streak. */}
      <NutritionMealHistoryTile
        streakDays={metrics.streakDays}
        dailyMealCounts={metrics.dailyMealCounts}
      />

      {/* Connected app meal source dropdown, kept reachable below the bento. It
          self hides behind its own connection state, so nothing is lost. The
          recipes library moved to its own /nutrition/saved-meals page (Prompt
          183c) and is reached from the Save My Meal tile above. */}
      <ConnectedAppMealDropdown />

      {/* Bottom strips. */}
      <NutritionConnectStrip />
      <AssessmentRetakeCard />
    </div>
  );
}

export default NutritionHub;
