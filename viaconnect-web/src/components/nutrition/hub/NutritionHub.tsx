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
//   Row 3 triad (Save My Meal, Nutrition by Genetics, Nutrition Insights) each
//     with a bottom aligned Open that expands an in flow panel below the row,
//   Row 4 Meal History (full width),
//   unmapped sections (Recipes library, connected app dropdown) that self hide,
//   bottom strips (Connect, Assessment retake).
//
// Standing rules honored: tokens only (Navy #1A2744, Card #1E3054, Teal
// #2DA5A0, Orange #B75E18), Instrument Sans, Lucide strokeWidth 1.5, no emojis,
// no em or en dashes anywhere. Reuse, never reimplement: the score gauge is
// NutritionScoreCircleGauge, the macro gauge is PlasmaGauge, and the per card
// media seam is the existing CardMedia. The score and macro values are NOT
// recomputed here; they arrive precomputed from the hook.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Bookmark,
  Brain,
  Camera,
  ChevronDown,
  Dna,
  PenLine,
  Upload,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useNutrivisionManualLogHandoff } from '@/hooks/useNutrivisionManualLogHandoff';
import { NutritionScoreCircleGauge } from '@/components/nutrition/NutritionScoreCircleGauge';
import { PlasmaGauge, type PlasmaGaugeProps } from '@/components/gauges/PlasmaGauge';
import { MyMeals } from '@/components/nutrition/MyMeals';
import { NutritionInsights } from '@/components/nutrition/NutritionInsights';
import { RecipesLibrarySection } from '@/components/recipes/RecipesLibrarySection';
import { ConnectedAppMealDropdown } from '@/components/nutrition/ConnectedAppMealDropdown';
import { CardMedia } from '@/components/body-tracker/hub/CardMedia';
import { AssessmentRetakeCard } from '@/components/body-tracker/hub/AssessmentRetakeCard';
import { useNutritionHubMetrics } from './useNutritionHubMetrics';
import { NutritionHubHeader } from './NutritionHubHeader';
import { NutritionGettingStartedStrip } from './NutritionGettingStartedStrip';
import { NutritionConnectStrip } from './NutritionConnectStrip';
import { NutritionTodaysMeals } from './NutritionTodaysMeals';
import { NutritionMealHistoryTile } from './NutritionMealHistoryTile';

const TEAL = '#2DA5A0';

// Per card media seam. ROW 1 and ROW 3 tiles drop CardMedia in as the z 0 back
// layer with a gradient placeholder now, leaving the video swap for later. The
// gradient classes mirror the My Biology hub card palette (teal corners for the
// data tiles, an orange corner for the priority Log Your Meal tile) so the seam
// reads consistently with the body-tracker bento.
const MEDIA_TEAL_TL =
  'bg-[radial-gradient(120%_120%_at_0%_0%,rgba(45,165,160,0.30)_0%,rgba(30,48,84,0.85)_55%,rgba(26,39,68,1)_100%)]';
const MEDIA_TEAL_TR =
  'bg-[radial-gradient(110%_110%_at_100%_0%,rgba(45,165,160,0.26)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]';
const MEDIA_ORANGE_BR =
  'bg-[radial-gradient(120%_120%_at_100%_100%,rgba(183,94,24,0.30)_0%,rgba(30,48,84,0.85)_55%,rgba(26,39,68,1)_100%)]';
const MEDIA_TEAL_BL =
  'bg-[radial-gradient(110%_110%_at_0%_100%,rgba(45,165,160,0.26)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]';
const MEDIA_TEAL_BC =
  'bg-[radial-gradient(110%_110%_at_50%_100%,rgba(45,165,160,0.26)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]';
const MEDIA_TEAL_BR =
  'bg-[radial-gradient(110%_110%_at_100%_100%,rgba(45,165,160,0.26)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]';

// Shared tile shell for the ROW 1 and ROW 3 bento cards. Layers back to front:
//   z 0: CardMedia gradient placeholder (the video drop in seam),
//   z 1: legibility scrim so content stays readable over any future frame,
//   z 2: content. An optional 2px top accent rule carries the priority accent.
function HubTile({
  children,
  gradientClass,
  accent,
  className,
}: {
  children: React.ReactNode;
  gradientClass: string;
  accent?: string;
  className?: string;
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

      {/* z 0: per card media seam (gradient now, video later). */}
      <CardMedia media={{ kind: 'gradient', gradientClass }} />

      {/* z 1: legibility scrim over any media frame. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#1A2744]/85 via-[#1A2744]/30 to-transparent"
      />

      {/* z 2: content. */}
      <div className="relative z-[2] flex h-full flex-col p-4 md:p-5">{children}</div>
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
  icon: Icon,
  title,
  description,
  badge,
  gradientClass,
  isOpen,
  onToggle,
  panelId,
}: {
  icon: typeof Bookmark;
  title: string;
  description: string;
  badge?: string;
  gradientClass: string;
  isOpen: boolean;
  onToggle: () => void;
  panelId: string;
}) {
  return (
    <HubTile gradientClass={gradientClass}>
      <div className="flex items-start justify-between gap-3">
        <span
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm"
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" strokeWidth={1.5} style={{ color: TEAL }} />
        </span>
        {badge ? (
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium tabular-nums text-white/80 backdrop-blur-sm">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <h3
          id={`${panelId}-label`}
          className="text-[15px] font-semibold leading-tight text-white md:text-base"
        >
          {title}
        </h3>
        <p className="text-[12px] leading-relaxed text-white/[0.62] md:text-[13px]">{description}</p>
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

type OpenPanel = 'saved' | 'genetics' | 'insights' | null;

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

  // Macro readouts: only render a readout whose percent is defined. A missing
  // macro is omitted, never shown as 0.
  const macroReadouts: ReadonlyArray<{ label: string; pct?: number }> = [
    { label: 'Protein', pct: metrics.proteinPct },
    { label: 'Carbs', pct: metrics.carbsPct },
    { label: 'Fat', pct: metrics.fatPct },
    { label: 'Fiber', pct: metrics.fiberPct },
  ];

  // Daily Macros gauge: render the real percent when defined, otherwise a
  // neutral empty gauge (value 0, animation off) with a caption so it never
  // reads as a real 0 percent.
  const hasMacroPct = typeof metrics.dailyMacrosPct === 'number';
  const savedCountKnown = typeof metrics.savedMealsCount === 'number';

  // Props shared by the real and empty Daily Macros gauge branches. The two
  // branches vary only value and animated; keeping the rest here avoids
  // drifting the gauge geometry between the two states.
  const macroGaugeProps: Pick<
    PlasmaGaugeProps,
    'metric' | 'variant' | 'max' | 'size' | 'showUnit' | 'subtleTrack' | 'plainNumber'
  > = {
    metric: 'nutrition',
    variant: 'standard',
    max: 100,
    size: 150,
    showUnit: false,
    subtleTrack: true,
    plainNumber: true,
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

      {/* ROW 1: triad. 1 col mobile, 3 cols at md+. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Nutrition Score: inline gauge, no Open. Reuses NutritionScoreCircleGauge
            fed the precomputed score + meal count. A meal count of 0 triggers its
            empty state, the correct fail open display. */}
        <HubTile gradientClass={MEDIA_TEAL_TL}>
          <h3 className="text-[15px] font-semibold leading-tight text-white md:text-base">
            Nutrition Score
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-white/[0.62] md:text-[13px]">
            Today&apos;s calorie weighted meal quality.
          </p>
          <div className="mt-3 flex flex-1 items-center justify-center">
            <NutritionScoreCircleGauge
              score={metrics.nutritionScore ?? 0}
              mealCount={metrics.nutritionMealCount ?? 0}
              mobilePx={150}
              desktopPx={168}
            />
          </div>
        </HubTile>

        {/* Daily Macros: inline single PlasmaGauge of percent to target, plus the
            four small readouts. When the overall percent is undefined render a
            neutral empty gauge, not a real 0. */}
        <HubTile gradientClass={MEDIA_TEAL_TR}>
          <h3 className="text-[15px] font-semibold leading-tight text-white md:text-base">
            Daily Macros
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-white/[0.62] md:text-[13px]">
            Percent to your daily targets.
          </p>
          <div className="mt-3 flex flex-1 flex-col items-center justify-center gap-3">
            {hasMacroPct ? (
              <PlasmaGauge {...macroGaugeProps} value={metrics.dailyMacrosPct ?? 0} unit="%" />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <PlasmaGauge {...macroGaugeProps} value={0} animated={false} />
                <span className="text-[11px] text-white/55">No macros logged today yet</span>
              </div>
            )}
            {hasMacroPct ? (
              <div className="grid w-full grid-cols-4 gap-1.5">
                {macroReadouts.map((m) =>
                  typeof m.pct === 'number' ? (
                    <div key={m.label} className="flex flex-col items-center">
                      <span className="text-[10px] uppercase tracking-wide text-white/45">
                        {m.label}
                      </span>
                      <span className="text-[12px] font-semibold tabular-nums text-white/90">
                        {m.pct}%
                      </span>
                    </div>
                  ) : null,
                )}
              </div>
            ) : null}
          </div>
        </HubTile>

        {/* Log Your Meal: PRIORITY tile with a Teal accent edge and two teal
            glass pills routing to the two internal log surfaces. */}
        <HubTile gradientClass={MEDIA_ORANGE_BR} accent={TEAL}>
          <h3 className="text-[15px] font-semibold leading-tight text-white md:text-base">
            Log Your Meal
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-white/[0.62] md:text-[13px]">
            Capture what you ate. It scores and feeds your day.
          </p>
          <div className="mt-3 flex flex-1 flex-col items-center justify-center gap-3">
            <TealGlassPill href="/nutrition/log-meal" icon={PenLine} label="Log a Full Meal" />
            <TealGlassPill href="/nutrition/photo-ai" icon={Camera} label="NutriVision" />
          </div>
        </HubTile>
      </div>

      {/* ROW 2: Today's Meals, full width. Ships its own surface. */}
      <NutritionTodaysMeals userId={userId} />

      {/* ROW 3: triad of Open expand tiles. The three Open buttons bottom align
          on a consistent line; the open panel renders below the row in flow. */}
      <div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ExpandTile
            icon={Bookmark}
            title="Save My Meal"
            description="The saved meal library, ready to log in a tap."
            badge={savedCountKnown ? `${metrics.savedMealsCount} saved` : undefined}
            gradientClass={MEDIA_TEAL_BL}
            isOpen={openPanel === 'saved'}
            onToggle={() => toggle('saved')}
            panelId="nutrition-hub-panel-saved"
          />
          <ExpandTile
            icon={Dna}
            title="Nutrition by Genetics"
            description="Your NutrigenDX results and nutrition test uploads."
            gradientClass={MEDIA_TEAL_BC}
            isOpen={openPanel === 'genetics'}
            onToggle={() => toggle('genetics')}
            panelId="nutrition-hub-panel-genetics"
          />
          <ExpandTile
            icon={Brain}
            title="Nutrition Insights"
            description="What your logging says about your day."
            gradientClass={MEDIA_TEAL_BR}
            isOpen={openPanel === 'insights'}
            onToggle={() => toggle('insights')}
            panelId="nutrition-hub-panel-insights"
          />
        </div>

        {/* Save My Meal panel: reuses MyMeals as is; its relog is MyMeals' own
            existing behavior, not a new hub write path. */}
        <ExpandPanel open={openPanel === 'saved'} panelId="nutrition-hub-panel-saved" reduced={reduced}>
          <MyMeals onRelog={() => undefined} />
        </ExpandPanel>

        {/* Nutrition by Genetics panel: the genetics actions reproduced from the
            old page, all three links and copy preserved. Commas only as separators. */}
        <ExpandPanel
          open={openPanel === 'genetics'}
          panelId="nutrition-hub-panel-genetics"
          reduced={reduced}
        >
          <div className="rounded-2xl border border-[#2DA5A0]/30 bg-[#1E3054]/25 p-5 backdrop-blur-md">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-[#2DA5A0]/30 bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]">
                <Dna className="h-6 w-6 text-white" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white">Nutrition by Genetics</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/60 sm:text-sm">
                  Unlock personalized nutrition guidance based on your genetic blueprint. A
                  NutrigenDX panel (or another nutritional genetic test) must be added to your
                  profile before the genetic nutrition protocol can be generated.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
                  <Link
                    href="/genetics"
                    className="group relative flex min-h-[40px] items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_16px_rgba(45,165,160,0.35)] active:scale-[0.97]"
                    style={{ background: 'linear-gradient(135deg, #2DA5A0 0%, #1E3054 100%)' }}
                  >
                    <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <span className="relative">See NutrigenDX Results</span>
                    <ArrowRight className="relative h-4 w-4" strokeWidth={1.5} />
                  </Link>
                  <div className="flex flex-col items-stretch gap-1">
                    <Link
                      href="/genetics"
                      className="group relative flex min-h-[40px] items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_16px_rgba(183,94,24,0.35)] active:scale-[0.97]"
                      style={{ background: 'linear-gradient(135deg, #B75E18 0%, #1E3054 100%)' }}
                    >
                      <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      <Upload className="relative h-4 w-4" strokeWidth={1.5} />
                      <span className="relative">Upload Nutrition Test</span>
                    </Link>
                    <p className="text-center text-[10px] leading-tight text-white/55">
                      23andMe, AncestryDNA, MyHeritage, Viome, other raw files
                    </p>
                  </div>
                  <Link
                    href="/nutrition/guide"
                    className="group relative flex min-h-[40px] items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_16px_rgba(39,174,96,0.35)] active:scale-[0.97]"
                    style={{ background: 'linear-gradient(135deg, #27AE60 0%, #1E3054 100%)' }}
                  >
                    <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <span className="relative">Review Nutrition Results</span>
                    <ArrowRight className="relative h-4 w-4" strokeWidth={1.5} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </ExpandPanel>

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

      {/* Unmapped sections kept reachable below the bento. Each self hides behind
          its own flag / connection state, so nothing is lost. */}
      <RecipesLibrarySection />
      <ConnectedAppMealDropdown />

      {/* Bottom strips. */}
      <NutritionConnectStrip />
      <AssessmentRetakeCard />
    </div>
  );
}

export default NutritionHub;
