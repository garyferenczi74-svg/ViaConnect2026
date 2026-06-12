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
//   Row 1 triad (Nutrition Score, Daily Macros, Log Your Meal),
//   Row 2 Today's Meals (full width),
//   Row 3 triad (Save My Meal, Nutrition by Genetics, Nutrition Insights).
//     Save My Meal is a navigation tile whose Open links to the standalone
//     /nutrition/saved-meals page (Prompt 183c); Nutrition by Genetics is a
//     navigation tile whose Open links to the standalone /nutrition/genetics
//     page (Prompt 187); Insights keeps its bottom aligned Open that expands
//     an in flow panel below the row,
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
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Camera, ChevronDown, ChevronRight, PenLine, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useNutrivisionManualLogHandoff } from '@/hooks/useNutrivisionManualLogHandoff';
import { PlasmaGauge, type PlasmaGaugeProps } from '@/components/gauges/PlasmaGauge';
import { NutritionInsights } from '@/components/nutrition/NutritionInsights';
import { ConnectedAppMealDropdown } from '@/components/nutrition/ConnectedAppMealDropdown';
import { CardMedia } from '@/components/body-tracker/hub/CardMedia';
import type { SurfaceMedia } from '@/components/body-tracker/hub/hubConfig';
import { AssessmentRetakeCard } from '@/components/body-tracker/hub/AssessmentRetakeCard';
import { useNutritionHubMetrics } from './useNutritionHubMetrics';
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

const TEAL = '#2DA5A0';

// Per card media seam. ROW 1 and ROW 3 tiles drop CardMedia in as the z 0 back
// layer. Prompt 189: the gradient constants and the five real media
// descriptors live in nutritionHubMedia.ts; the gradient classes mirror the My
// Biology hub card palette (teal corners for the data tiles, an orange corner
// for the priority Log Your Meal tile) so the seam reads consistently with the
// body-tracker bento.

// Shared tile shell for the ROW 1 and ROW 3 bento cards. Layers back to front:
//   z 0: CardMedia gradient placeholder (the video drop in seam),
//   z 1: legibility scrim so content stays readable over any future frame,
//   z 2: content. An optional 2px top accent rule carries the priority accent.
function HubTile({
  children,
  gradientClass,
  media,
  mediaLogKey,
  accent,
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
  accent?: string;
  className?: string;
  // Prompt 183a (2026-06-11): optional classes for the z 2 content column. The
  // Row 1 cards pass items-center text-center so the gauge, title, and caption
  // stack centered; omitted elsewhere so existing tiles are unchanged.
  contentClassName?: string;
}) {
  return (
    <div
      className={`relative isolate flex min-h-[200px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md ${
        accent ? 'border-t-0' : ''
      } ${className ?? ''}`}
    >
      {accent ? (
        <span
          aria-hidden="true"
          className="absolute left-0 right-0 top-0 z-[3] h-[2px]"
          style={{ backgroundColor: accent }}
        />
      ) : null}

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

// A teal glass pill used by the priority Log Your Meal tile: semi transparent
// teal fill, backdrop blur, soft teal border, a faint top highlight, white text.
function TealGlassPill({ href, icon: Icon, label }: { href: string; icon: typeof PenLine; label: string }) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-[44px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/[0.18] px-4 py-2.5 text-[13px] font-semibold text-white no-underline backdrop-blur-md transition-all duration-200 hover:border-[#2DA5A0]/60 hover:bg-[#2DA5A0]/[0.28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] active:scale-[0.98]"
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

// One of the three ROW 3 tiles. The header text sits at the top; the Open
// button is pinned to the bottom on a consistent line with a guaranteed gap
// above it (mt-auto + pt-4) so it never crowds the copy. Open toggles a panel
// rendered by the parent BELOW the triad row.
function ExpandTile({
  title,
  description,
  badge,
  gradientClass,
  media,
  mediaLogKey,
  isOpen,
  onToggle,
  panelId,
}: {
  title: string;
  description: string;
  badge?: string;
  gradientClass: string;
  // Prompt 189: optional pass-throughs to the inner HubTile media seam.
  media?: SurfaceMedia;
  mediaLogKey?: string;
  isOpen: boolean;
  onToggle: () => void;
  panelId: string;
}) {
  // Centered layout (Gary 2026-06-11): the expander tile mirrors its two
  // navigation siblings (SaveMyMealTile, NutritionGeneticsTile) so the Row 3
  // triad reads consistently: centered title and description, the optional
  // badge pill beneath, and the Open control bottom aligned on the centered
  // column.
  return (
    <HubTile
      gradientClass={gradientClass}
      media={media}
      mediaLogKey={mediaLogKey}
      contentClassName="items-center text-center"
    >
      {/* Prompt 183e (2026-06-11): the heading block centers vertically in the
          space above the bottom anchored Open instead of hugging the top edge. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-1">
        <h3
          id={`${panelId}-label`}
          className="text-[15px] font-semibold leading-tight text-white md:text-base"
        >
          {title}
        </h3>
        <p className="text-[12px] leading-relaxed text-white/[0.62] md:text-[13px]">{description}</p>
        {badge ? (
          <span className="mt-1 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium tabular-nums text-white/80 backdrop-blur-sm">
            {badge}
          </span>
        ) : null}
      </div>

      {/* Bottom aligned Open with a guaranteed gap above. */}
      <div className="mt-auto flex pt-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="inline-flex items-center gap-1 rounded-full border border-[#5B8DEF]/30 bg-[#2A4C9E]/25 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-md transition-all duration-200 hover:border-[#5B8DEF]/55 hover:bg-[#2A4C9E]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none"
        >
          <span>Open</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
            strokeWidth={1.5}
          />
        </button>
      </div>
    </HubTile>
  );
}

// The in flow expand panel shared by all three ROW 3 tiles. framer motion
// height auto, in document flow (NOT an overlay), so opening pushes the content
// below it down. Honors prefers reduced motion via an instant swap.
function ExpandPanel({
  open,
  panelId,
  reduced,
  children,
}: {
  open: boolean;
  panelId: string;
  reduced: boolean;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key={panelId}
          id={panelId}
          role="region"
          aria-labelledby={`${panelId}-label`}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.24, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="pt-4">{children}</div>
        </motion.div>
      ) : null}
    </AnimatePresence>
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
      {/* Prompt 183e (2026-06-11): heading block vertically centered above the
          bottom anchored Open. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-1">
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
          className="inline-flex items-center gap-1 rounded-full border border-[#5B8DEF]/30 bg-[#2A4C9E]/25 px-3 py-1.5 text-[12px] font-medium text-white no-underline backdrop-blur-md transition-all duration-200 hover:border-[#5B8DEF]/55 hover:bg-[#2A4C9E]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none"
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
      {/* Prompt 183e (2026-06-11): heading block vertically centered above the
          bottom anchored Open. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-1">
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
          className="inline-flex items-center gap-1 rounded-full border border-[#5B8DEF]/30 bg-[#2A4C9E]/25 px-3 py-1.5 text-[12px] font-medium text-white no-underline backdrop-blur-md transition-all duration-200 hover:border-[#5B8DEF]/55 hover:bg-[#2A4C9E]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none"
        >
          <span>Open</span>
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Link>
      </div>
    </HubTile>
  );
}

type OpenPanel = 'insights' | null;

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

  // One ROW 3 panel open at a time. Opening expands an in flow panel below the
  // triad and pushes the rest of the page down.
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const toggle = (key: Exclude<OpenPanel, null>) =>
    setOpenPanel((prev) => (prev === key ? null : key));

  const reduced = useReducedMotion() ?? false;

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
        <HubTile gradientClass={MEDIA_TEAL_TL} contentClassName="items-center text-center">
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

        {/* Daily Macros: single Plasma gauge of percent to target in the
            teal hub finish, the title below the gauge, then the absolute gram
            readout row. When the overall percent is undefined render a neutral
            empty gauge, not a real 0. */}
        <HubTile gradientClass={MEDIA_TEAL_TR} contentClassName="items-center text-center">
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

        {/* Log Your Meal: PRIORITY tile with a Teal accent edge. The title, a
            caption, then the two teal glass pills routing to the two internal
            log surfaces. */}
        <HubTile
          gradientClass={MEDIA_ORANGE_BR}
          media={NUTRITION_CARD_MEDIA.logYourMeal}
          mediaLogKey="logYourMeal"
          accent={TEAL}
          contentClassName="items-center text-center"
        >
          {/* Prompt 183e + Gary follow-up (2026-06-11): the title and caption
              center vertically in the space above the pills (same pattern as
              the Row 3 tiles), and the two pills anchor beneath them at the
              bottom of the frame. Nothing hugs the top edge. */}
          <div className="flex flex-1 flex-col items-center justify-center">
            <h3 className="text-[15px] font-semibold leading-tight text-white md:text-base">
              Log Your Meal
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-white/[0.62] md:text-[13px]">
              The fastest way to add what you ate
            </p>
          </div>
          <div className="mt-auto flex w-full flex-col items-center gap-3 pt-4">
            <TealGlassPill href="/nutrition/log-meal" icon={PenLine} label="Log a Full Meal" />
            <TealGlassPill href="/nutrition/photo-ai" icon={Camera} label="NutriVision" />
          </div>
        </HubTile>
      </div>

      {/* ROW 2: Today's Meals, full width. Ships its own surface. */}
      <NutritionTodaysMeals userId={userId} />

      {/* ROW 3: triad. Save My Meal and Nutrition by Genetics are navigation
          tiles (Open links to their standalone pages); Insights is an Open
          expand tile. All three Open controls bottom align on a consistent
          line; the expand tile's open panel renders below the row in flow. */}
      <div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
          <ExpandTile
            title="Nutrition Insights"
            description="What your logging says about your day."
            gradientClass={MEDIA_TEAL_BR}
            media={NUTRITION_CARD_MEDIA.nutritionInsights}
            mediaLogKey="nutritionInsights"
            isOpen={openPanel === 'insights'}
            onToggle={() => toggle('insights')}
            panelId="nutrition-hub-panel-insights"
          />
        </div>

        {/* Nutrition Insights panel: reuses NutritionInsights as is, fed the
            precomputed meal count + score. The tile carries no fabricated
            weekly count badge: there is no real source for one. */}
        <ExpandPanel
          open={openPanel === 'insights'}
          panelId="nutrition-hub-panel-insights"
          reduced={reduced}
        >
          <NutritionInsights
            mealsLoggedToday={metrics.nutritionMealCount ?? 0}
            score={metrics.nutritionScore ?? 0}
          />
        </ExpandPanel>
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
