"use client";

// VERBATIM PORT of docs/mockups/viaconnect-your-journey-coaching.jsx
// Allowed adaptations only: "use client", Lucide imports adapted, font injector
// useEffect removed (Instrument Sans loaded globally), TypeScript prop types added.
// Sample values, DOM structure, inline styles, class names, breakpoints: unchanged.
//
// Prompt 208i Task I-T2a: HERO values wired to real data. Markup/styles unchanged.
// Real data: useBioOptimizationTrend (gauges + graph), useHydrationToday (hydration
// gauge), useJourneyState (goal chip), getDisplayName + profiles.avatar_url (profile),
// stateWordForScore (narrative state word). No-history pillars: flat line at current
// value (honest "no trend known"). Per-pillar history backend gap flagged for Gary.
// Pillar colors: mockup hex retained (no canonical per-pillar source differs; flagged).

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Bell, Edit2, Target, Activity, Moon, Salad, Heart, Sparkles, RefreshCw,
  Dna, FlaskConical, ClipboardList, Pill, HeartPulse, ArrowRight, ArrowUpRight,
  TrendingUp, TrendingDown, ChevronDown, ChevronLeft, ChevronRight, ShieldCheck, CircleAlert, Droplet, Flame, Smile, Zap,
  type LucideIcon,
} from "lucide-react";
import { useBioOptimizationTrend } from "@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useBioOptimizationTrend";
import { useHannahInsights } from "@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useHannahInsights";
import { useJourneyRecommendations } from "@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useJourneyRecommendations";
import { useHydrationToday } from "@/components/hydration/useHydrationToday";
import { useDailyScores } from "@/hooks/journey/useDailyScores";
import { useNutritionTargets } from "@/hooks/useNutritionTargets";
import { useLatestComposition } from "@/hooks/body-tracker/useLatestComposition";
import { useRecentBodySeries } from "@/components/journey/progress/useRecentBodySeries";
import { getDisplayName } from "@/lib/user/get-display-name";
import { getDisplayName as getAgentDisplayName } from "@/lib/getDisplayName";
import { createClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { useHannahDailyNote } from "@/hooks/journey/useHannahDailyNote";
import { heroGaugeScore } from "@/components/journey/coaching/heroHelpers";
import { toDisplayBosScore } from "@/lib/scoring/bos-display";
import {
  connectionsBosNumericScore,
  namedWearableContributorCount,
  resolveConnectionsBosDisplay,
} from "@/lib/body-tracker/wearable-tiles";
import { formatMacroLabel, kcalRemaining, flatSparkline, goalProgressPct } from "@/components/journey/coaching/lowerHelpers";
import { useJourneyGraphSeries, type PillarKey } from "@/components/journey/coaching/useJourneyGraphSeries";
import { type JourneyRange } from "@/components/journey/coaching/journeyGraphWindow";
import { buildLinePath } from "@/components/journey/coaching/journeyPathBuilder";
import { useUserDashboardData } from "@/hooks/useUserDashboardData";
import { useActiveBodyGoal, tierToStateWord } from "@/hooks/journey/useActiveBodyGoal";
import { useWearableTilesSnapshot } from "@/hooks/useWearableTilesSnapshot";
import { wearableSyncLineFromTiles } from "@/lib/body-tracker/wearable-sync-line";
import { LAST_SYNC_LABELS } from "@/lib/body-tracker/last-sync-state";
import { useTodayStats } from "@/hooks/journey/useTodayStats";
import { useMetabolicVitals } from "@/hooks/journey/useMetabolicVitals";
import { useTodayMealLogs } from "@/hooks/journey/useTodayMealLogs";
import { useEngineAccelerators } from "@/hooks/journey/useEngineAccelerators";
import type { EngineAccItem } from "@/hooks/journey/useEngineAccelerators";
import { shouldShowSkeleton } from "@/hooks/journey/skeletonHelpers";
import { JourneyGraphHeroVideo } from "@/components/journey/JourneyGraphHeroVideo";
import { HeroVideoBackground } from "@/components/journey/HeroVideoBackground";
import {
  chartPalette,
  nutritionChartColors,
  sleepChartColors,
} from "@/lib/design-tokens";

const C = {
  navy: "#1A2744", card: "#1E3054", inset: "#16203A", raised: "#243a63",
  teal: "#2DA5A0", orange: "#B75E18", blue: "#4F7FB5", green: "#46C18E", purple: "#7B6FB0",
  text: "#EAF1F8", muted: "#8DA0C0",
  line: "rgba(141,160,192,0.16)", tealSoft: "rgba(45,165,160,0.16)", orangeSoft: "rgba(183,94,24,0.18)", greenSoft: "rgba(70,193,142,0.16)",
};
const SW = 1.5;
const eyebrow: React.CSSProperties = { textTransform: "uppercase", letterSpacing: 1.3, fontSize: 10.5, fontWeight: 700, color: C.muted };

// Inline shimmer block - calm pulsing placeholder sized to the element.
// Uses the existing C palette. @keyframes vcShimmer is injected once
// by the component's <style> tag alongside existing vc-* rules.
function Shimmer({ w, h, radius = 6 }: { w: number | string; h: number | string; radius?: number }) {
  return (
    <div
      aria-hidden
      className="vc-shimmer"
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${C.inset} 25%, ${C.raised} 50%, ${C.inset} 75%)`,
        backgroundSize: "200% 100%",
        animation: "vcShimmer 1.6s ease-in-out infinite",
      }}
    />
  );
}

// Daily Scores pillars, order and colors carried identically on gauges and graph lines.
// NOTE for Gary: pillar colors below are the mockup hex values. The canonical dashboard
// Daily Scores coloring uses getScoreColor (score-VALUE-based), NOT a fixed per-pillar
// palette. There is no conflicting canonical per-pillar source, so the mockup hex stand.
// If a per-pillar canonical palette is established later, update this array.
const PILLARS: { key: string; label: string; value: number | null; delta: number | null; color: string; icon: LucideIcon; hero?: boolean }[] = [
  { key: "sleep", label: "Sleep Quality", value: 42, delta: -2, color: "#7B6FB0", icon: Moon },
  { key: "energy", label: "Energy Level", value: 58, delta: 3, color: "#D9A441", icon: Zap },
  { key: "mood", label: "Mood and Stress", value: 51, delta: 4, color: "#B75E18", icon: Smile },
  { key: "nutrition", label: "Nutrition", value: 72, delta: 5, color: "#46C18E", icon: Salad },
  { key: "activity", label: "Physical Activity", value: 60, delta: 3, color: "#4F7FB5", icon: Activity },
  { key: "overall", label: "Bio Optimization", value: null, delta: null, color: "#2DA5A0", icon: HeartPulse, hero: true },
  { key: "hydration", label: "Hydration", value: 64, delta: 6, color: "#38BDD8", icon: Droplet },
];

function panel(active: boolean): React.CSSProperties {
  return { position: "relative", background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, boxShadow: active ? "0 14px 34px rgba(0,0,0,0.26)" : "0 10px 24px rgba(0,0,0,0.2)" };
}
function Edge({ active, color }: { active: boolean; color?: string }) {
  return <div aria-hidden style={{ position: "absolute", top: 0, left: 18, right: 18, height: 2, borderRadius: 2, background: `linear-gradient(90deg, transparent, ${color || (active ? C.teal : C.line)}, transparent)` }} className={active ? "vc-edge-active" : ""} />;
}
function bandLabel(v: number): string { return v >= 75 ? "Strong" : v >= 60 ? "Solid" : v >= 40 ? "Fair" : "Low"; }
function Delta({ v, unit }: { v: number | null; unit?: string }) {
  if (v === null || !Number.isFinite(v)) {
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: C.muted }}>--</span>;
  }
  const up = v >= 0;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: up ? C.teal : C.orange }}>{up ? <TrendingUp size={11} strokeWidth={SW} /> : <TrendingDown size={11} strokeWidth={SW} />}{up ? "+" : ""}{v}{unit || ""}</span>;
}

function PlasmaRing({ value, color, size = 40 }: { value: number | null; color: string; size?: number }) {
  const sw = Math.max(3, size * 0.085);
  const r = size / 2 - sw / 2 - 1, CIRC = 2 * Math.PI * r;
  const ringValue = value === null ? 0 : value;
  const ang = (-90 + (ringValue / 100) * 360) * Math.PI / 180;
  const capX = size / 2 + r * Math.cos(ang), capY = size / 2 + r * Math.sin(ang);
  const label = value === null ? "--" : String(value);
  return (
    <div style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.inset} strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - ringValue / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ filter: `drop-shadow(0 0 4px ${color}cc)` }} />
        {value !== null && <circle cx={capX} cy={capY} r={Math.max(1.8, size * 0.06)} fill="#fff" style={{ filter: `drop-shadow(0 0 3px ${color})` }} />}
        <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize={(size * 0.34).toFixed(1)} fontWeight="800" fill={C.text}>{label}</text>
      </svg>
    </div>
  );
}
function GaugeCard({ value, label, color, hero, loading }: { value: number | null; label: string; color: string; hero?: boolean; loading?: boolean }) {
  const isBos = label === "Bio Optimization";
  return (
    <div
      className="vc-gauge-tile"
      data-bos-card={isBos ? "analytics" : undefined}
      data-bos-composite={isBos ? (value === null ? "unknown" : undefined) : undefined}
      style={{
        flex: "1 1 0",
        minWidth: 64,
        background: C.inset,
        border: `1px solid ${hero ? color + "66" : C.line}`,
        borderRadius: 12,
        padding: "10px 6px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        boxShadow: hero ? `inset 0 0 0 1px ${color}33` : "none",
      }}
    >
      {loading ? (
        <Shimmer w={hero ? 52 : 48} h={hero ? 52 : 48} radius={999} />
      ) : (
        <PlasmaRing value={value} color={color} size={hero ? 52 : 48} />
      )}
      <span style={{ fontSize: 9, fontWeight: 600, color: C.text, textAlign: "center", lineHeight: 1.1 }}>{label}</span>
      {isBos && value === null ? (
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.12, color: C.muted }}>UNKNOWN</span>
      ) : null}
    </div>
  );
}

// Pillar value mapping: receive real values keyed by pillar key.
// overall -> useBioOptimizationTrend.current
// sleep -> categoryAverages.sleep
// energy -> categoryAverages.adherence (energy_score avg)
// mood -> categoryAverages.stress
// nutrition -> categoryAverages.nutrition
// activity -> categoryAverages.movement
// hydration -> useHydrationToday.percentage_of_target
type PillarValues = Record<string, number | null>;

// Journey: self-contained hero graph component wired to useJourneyGraphSeries.
// Takes only { userId }; holds range and offset state (T4 period navigator wires offset).
// Y axis: 0 to 100 with a gridline and muted label at every 10.
// X axis: labels from bucket.label (non-empty only, per T1 bucketing rules).
// Seven pillar lines in their PILLARS colors; Bio Optimization drawn last on top.
// Gaps are honest BREAKS (null -> break, never 0, never flat carry).
// Loading: skeleton shimmer in the plot area, axis and labels render immediately.
// Error: axis + labels + legend + quiet retry affordance (not a blank card).
// Empty: axis + labels + legend with no lines (honest sparse state).
// Hydration: past-day history is always null (no per-day source exists).
//   A "(no daily history yet)" note is appended to the Hydration legend swatch
//   when the series has at most one non-null point so the near-empty line is not
//   mistaken for a bug. (Hannah handoff - flag for Gary eyeball.)
function useIsMobileJourney(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return mobile;
}

function Journey({ userId }: { userId: string | null }) {
  const [range, setRange] = useState<JourneyRange>("1W");
  const [offset, setOffset] = useState<number>(0);
  const { buckets, series, periodLabel, canGoNext, loading, error } = useJourneyGraphSeries(userId, range, offset);
  const isMobile = useIsMobileJourney();

  // SVG coordinate system. Desktop H=248 unchanged; mobile taller for readability (plot >= 260).
  const W = 840;
  const H = isMobile ? 320 : 248;
  // padL: left gutter for Y-axis labels (right-aligned muted text).
  // padR: right margin. padT: top margin. padB: bottom strip for X-axis labels.
  const padL = isMobile ? 40 : 52, padR = 10, padT = 10, padB = isMobile ? 34 : 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const n = buckets.length;
  const xOf = (i: number): number =>
    n <= 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW;
  const yOf = (v: number): number => padT + (1 - v / 100) * plotH;

  // Y axis: every 10 on desktop; every 20 on mobile (Prompt 216a).
  const Y_TICKS = isMobile
    ? [0, 20, 40, 60, 80, 100]
    : [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  // Draw hero (overall) line last so it sits on top of all other lines.
  const ordered = [...PILLARS].sort((a, b) => (a.hero ? 1 : 0) - (b.hero ? 1 : 0));

  // Build SVG path per pillar. Null values produce honest line breaks.
  const paths: Record<string, string> = {};
  for (const p of PILLARS) {
    const vals: (number | null)[] = series[p.key as PillarKey] ?? [];
    paths[p.key] = buildLinePath(vals, xOf, yOf);
  }

  // End dots: last non-null point of each series. Built from `ordered` (hero last)
  // so the Bio Optimization dot paints on top of the other dots, matching the lines.
  const endDots: { key: string; cx: number; cy: number; color: string; hero: boolean }[] = [];
  for (const p of ordered) {
    const vals: (number | null)[] = series[p.key as PillarKey] ?? [];
    for (let i = vals.length - 1; i >= 0; i--) {
      const v = vals[i];
      if (v !== null) {
        endDots.push({ key: p.key, cx: xOf(i), cy: yOf(v), color: p.color, hero: !!p.hero });
        break;
      }
    }
  }

  // Hydration note: past-day hydration is always null. When the series has at most
  // one non-null point (only today), label it "(no daily history yet)" in the legend.
  const hydVals: (number | null)[] = series.hydration ?? [];
  const hydrationTodayOnly = hydVals.filter((v) => v !== null).length <= 1;

  // Retry: dispatch focus event to trigger the hook's internal refresh debounce.
  const handleRetry = () => {
    if (typeof window !== "undefined") window.dispatchEvent(new FocusEvent("focus"));
  };

  // Plot-area overlay for the loading skeleton (percentage-based to scale with SVG).
  const skeletonStyle: React.CSSProperties = {
    position: "absolute",
    left: `${((padL / W) * 100).toFixed(2)}%`,
    right: `${((padR / W) * 100).toFixed(2)}%`,
    top: `${((padT / H) * 100).toFixed(2)}%`,
    bottom: `${((padB / H) * 100).toFixed(2)}%`,
    borderRadius: 4,
    background: `linear-gradient(90deg, ${C.inset} 25%, ${C.raised} 50%, ${C.inset} 75%)`,
    backgroundSize: "200% 100%",
    animation: "vcShimmer 1.6s ease-in-out infinite",
  };

  const showLines = !loading && !error;

  // Prompt 216 follow-up: all copy over the hero video is pure white for legibility.
  const onVideoText = "#FFFFFF";
  const onVideoLine = "rgba(255,255,255,0.28)";

  return (
    <div style={{ position: "relative", zIndex: 1, color: onVideoText }}>
      {/* Header: eyebrow label + 1W / 1M / 1Y range buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ ...eyebrow, color: onVideoText }}>Journey</div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["1W", "1M", "1Y"] as JourneyRange[]).map((r) => (
            <button
              key={r}
              onClick={() => { setRange(r); setOffset(0); }}
              className="vc-focus vc-journey-range-btn"
              style={{
                cursor: "pointer",
                padding: "5px 13px",
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 700,
                border: `1px solid ${range === r ? C.teal : onVideoLine}`,
                background: range === r ? C.teal : "rgba(26,39,68,0.55)",
                color: onVideoText,
                minHeight: isMobile ? 44 : undefined,
                minWidth: isMobile ? 44 : undefined,
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Period navigator: prev / period label / next */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <button
          className="vc-focus vc-journey-nav-btn"
          onClick={() => setOffset((o) => o + 1)}
          aria-label="Previous period"
          style={{
            cursor: "pointer",
            background: "transparent",
            border: `1px solid ${onVideoLine}`,
            borderRadius: 8,
            padding: "4px 8px",
            color: onVideoText,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: isMobile ? 44 : undefined,
            minWidth: isMobile ? 44 : undefined,
          }}
        >
          <ChevronLeft size={16} strokeWidth={SW} />
        </button>
        <span style={{ fontSize: 12, fontWeight: 600, color: onVideoText, minWidth: 130, textAlign: "center" }}>{periodLabel}</span>
        <button
          className="vc-focus vc-journey-nav-btn"
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          disabled={!canGoNext}
          aria-label="Next period"
          style={{
            cursor: canGoNext ? "pointer" : "default",
            background: "transparent",
            border: `1px solid ${onVideoLine}`,
            borderRadius: 8,
            padding: "4px 8px",
            color: onVideoText,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: canGoNext ? 1 : 0.35,
            minHeight: isMobile ? 44 : undefined,
            minWidth: isMobile ? 44 : undefined,
          }}
        >
          <ChevronRight size={16} strokeWidth={SW} />
        </button>
      </div>

      {/* Chart: SVG always renders axis and X labels; plot content varies by state */}
      <div style={{ position: "relative" }} className="vc-journey-chart-plot">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", minHeight: isMobile ? 260 : undefined }}>
          {/* Y axis: gridlines + labels (every 10 desktop, every 20 mobile) */}
          {Y_TICKS.map((tick) => {
            const cy = yOf(tick);
            return (
              <g key={tick}>
                <line x1={padL} x2={W - padR} y1={cy} y2={cy} stroke={onVideoLine} strokeWidth={0.8} />
                <text x={padL - 4} y={cy} textAnchor="end" dominantBaseline="middle" fontSize={isMobile ? 11 : 12} fill={onVideoText}>{tick}</text>
              </g>
            );
          })}

          {/* X axis: bucket label text, centered under each labeled bucket */}
          {buckets.map((b, i) =>
            b.label ? (
              <text key={b.date} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize={11} fill={onVideoText}>{b.label}</text>
            ) : null,
          )}

          {/* Lines: hero (overall) drawn last so it sits on top */}
          {showLines && ordered.map((p) =>
            paths[p.key] ? (
              <path key={p.key} d={paths[p.key]} fill="none" stroke={p.color} strokeWidth={p.hero ? 2.6 : 1.7} strokeLinecap="round" strokeLinejoin="round" style={p.hero ? { filter: `drop-shadow(0 0 4px ${p.color}99)` } : { opacity: 0.92 }} />
            ) : null,
          )}

          {/* End dots: circle at last non-null point of each series */}
          {showLines && endDots.map((dot) => (
            <circle key={dot.key + "d"} cx={dot.cx} cy={dot.cy} r={dot.hero ? 3.2 : 2.3} fill={dot.color} />
          ))}
        </svg>

        {/* Loading skeleton: shimmer overlay in the plot area only */}
        {loading && <div aria-hidden style={skeletonStyle} />}
      </div>

      {/* Error state: quiet retry affordance below the axis (axis still visible above) */}
      {error && !loading && (
        <div style={{ textAlign: "center", fontSize: 11, color: onVideoText, marginTop: 4 }}>
          Chart data could not load.{" "}
          <button className="vc-focus" onClick={handleRetry} style={{ cursor: "pointer", background: "transparent", border: "none", color: onVideoText, fontSize: 11, fontWeight: 600, padding: 0, textDecoration: "underline" }}>
            Retry
          </button>
        </div>
      )}

      {/* Legend: desktop wrap; mobile two-column grid (Prompt 216a) */}
      <div className="vc-journey-legend" style={{ display: "flex", flexWrap: "wrap", gap: "7px 14px", marginTop: 12 }}>
        {PILLARS.map((p) => (
          <span key={p.key} className="vc-journey-legend-item" style={{ display: "inline-flex", alignItems: "flex-start", gap: 6, fontSize: 11, color: onVideoText }}>
            <span style={{ width: 12, height: 3, borderRadius: 2, background: p.color, display: "inline-block", marginTop: 5, flexShrink: 0 }} />
            <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span>{p.label}</span>
              {p.key === "hydration" && hydrationTodayOnly && (
                <span style={{ fontSize: 10, opacity: 0.9 }}>(no daily history yet)</span>
              )}
            </span>
          </span>
        ))}
      </div>
      {(range === "1W" || range === "1M") && (
        <p className="vc-journey-footnote" style={{ margin: "8px 0 0", fontSize: 10.5, color: onVideoText, opacity: 0.95, lineHeight: 1.4, width: "100%" }}>
          A line reaching 0 on a past day means no check-in was logged, not a wellness score of zero. Log a check-in to fill in any gap.
        </p>
      )}
    </div>
  );
}

// ProfileCard now accepts real data props. Markup/styles unchanged from verbatim port.
// Avatar: real photo from profiles.avatar_url when present; else initial tile (honest).
// Name: from getDisplayName(); Goal chip: from useActiveBodyGoal.goalLabel.
// Last sync line: first-class tiles + last-sync-state only. Not connected
// until a real last-sync. Never invents a wearable scoring-source sync.
// Hannah note (216d): compiled daily note from runHannahCompilation, never stateWord stub.
function ProfileCard({
  userId,
  displayName,
  initial,
  avatarUrl,
  goalPhrase,
  lastSyncLabel,
  readTodaySubtext,
}: {
  userId: string | null;
  displayName: string;
  initial: string;
  avatarUrl: string | null;
  goalPhrase: string;
  lastSyncLabel: string;
  readTodaySubtext: string;
}) {
  const [avatarErrored, setAvatarErrored] = useState(false);
  const showAvatar = !!avatarUrl && !avatarErrored;

  // Prompt 216d: latest compiled note (welcome fail-open). Distinct from read-today.
  const { noteText: hannahNote } = useHannahDailyNote(
    userId,
    displayName,
    readTodaySubtext,
  );
  const hannahLabel = getAgentDisplayName("hannah");

  // Prompt 216c: copy over profile hero video is white for legibility (Hannah note included).
  const onVideoText = "#FFFFFF";
  const goalInsetBg = "rgba(26,39,68,0.72)";

  return (
    <div
      className="vc-profile-card"
      data-testid="journey-profile-card"
      style={{
        position: "relative",
        background: C.inset,
        border: `1px solid ${C.line}`,
        borderRadius: 14,
        padding: 15,
        display: "flex",
        flexDirection: "column",
        gap: 13,
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Shared HeroVideoBackground: 9x16 at all breakpoints (Prompt 216c) */}
      <HeroVideoBackground
        sourceMode="portrait"
        scrimPreset="profile"
        testId="profile-hero-video"
        logScope="journey.profileVideo"
      />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 13, color: onVideoText }}>
        <div style={{ position: "relative", width: 92, height: 92 }}>
          {showAvatar ? (
            <img
              src={avatarUrl!}
              alt={displayName || "Profile"}
              onError={() => setAvatarErrored(true)}
              style={{ width: 92, height: 92, borderRadius: 16, objectFit: "cover", border: `1.5px solid ${C.teal}` }}
            />
          ) : (
            <div style={{ width: 92, height: 92, borderRadius: 16, background: `radial-gradient(circle at 35% 28%, #34618a, ${C.navy})`, border: `1.5px solid ${C.teal}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: onVideoText }}>{initial}</div>
          )}
          <span style={{ position: "absolute", right: -5, top: -5, width: 22, height: 22, borderRadius: 999, background: "rgba(26,39,68,0.9)", border: `1px solid rgba(255,255,255,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", color: onVideoText }}><Edit2 size={11} strokeWidth={SW} /></span>
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: onVideoText }}>{displayName || ""}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 9, fontSize: 11.5, color: onVideoText }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><RefreshCw size={13} strokeWidth={SW} /> {lastSyncLabel}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 10px", borderRadius: 10, background: goalInsetBg, border: `1px solid rgba(255,255,255,0.18)` }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: onVideoText }}><Target size={14} strokeWidth={SW} color={C.teal} /> Goal</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: onVideoText, overflowWrap: "anywhere" }}>{goalPhrase || "supporting your wellness"}</span>
        </div>
        <div>
          <div style={{ ...eyebrow, marginBottom: 6, display: "flex", alignItems: "center", gap: 6, color: onVideoText }}><Sparkles size={12} strokeWidth={SW} color={C.teal} /> {hannahLabel}&apos;s note</div>
          <p style={{ margin: 0, fontSize: 12, color: onVideoText, lineHeight: 1.5 }} data-testid="hannah-daily-note">{hannahNote}</p>
        </div>
      </div>
    </div>
  );
}

// Hero receives real values for gauges, narrative, and profile.
// Graph is rendered by the self-contained Journey component (T3) which takes userId
// and calls useJourneyGraphSeries internally. rangeData and graphLoading are removed.
function Hero({
  pillarValues,
  userId,
  overallScore,
  bioTier,
  displayName,
  initial,
  avatarUrl,
  goalPhrase,
  lastSyncLabel,
  gaugesLoading,
}: {
  pillarValues: PillarValues;
  userId: string | null;
  overallScore: number | null;
  bioTier: string | null;
  displayName: string;
  initial: string;
  avatarUrl: string | null;
  goalPhrase: string;
  lastSyncLabel: string;
  gaugesLoading?: boolean;
}) {
  // J-T2: hero narrative state word driven from canonical dashboard tier +
  // score. Baseline/computing users read as "getting started", not "steady".
  const stateWord = tierToStateWord(bioTier, overallScore);

  // Narrative read: state-appropriate, one paragraph, honest to real score.
  const narrativeRead = (() => {
    if (stateWord === "getting started") {
      return "You are at the start of your read, and that is exactly where it should begin. As you log and connect data, this picture fills in.";
    }
    if (stateWord === "recovering") {
      return "This is a rebuilding stretch, which is a normal part of the cycle. Small, repeatable habits restore momentum fastest.";
    }
    if (stateWord === "steady") {
      return "You are holding a solid, level baseline. A single focused area is usually the next lever to nudge it up.";
    }
    if (stateWord === "building") {
      return "Your trend is moving in the right direction. Consistency over the next stretch is what carries it higher.";
    }
    return "Your signals are clustering near your best. Keep the routine steady and let the small wins compound.";
  })();

  // Build the real pillar values array from pillarValues map, matching PILLARS order.
  // Bio Optimization uses the shared BOS guard: never NaN, never a fake 0.
  const livePillars = PILLARS.map((p) => {
    const raw = pillarValues[p.key];
    if (p.key === "overall") {
      return { ...p, value: toDisplayBosScore(raw), delta: null };
    }
    return { ...p, value: heroGaugeScore(raw ?? 0) };
  });

  return (
    <div
      className="vc-hero-shell"
      style={{
        position: "relative",
        borderRadius: 22,
        padding: 20,
        marginBottom: 16,
        border: `1px solid ${C.line}`,
        background: `linear-gradient(160deg, #223a66 0%, ${C.card} 55%, #1b2c4e 100%)`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.34)",
        overflow: "hidden",
      }}
    >
      <Edge active />
      <div className="vc-hero">
        <ProfileCard
          userId={userId}
          displayName={displayName}
          initial={initial}
          avatarUrl={avatarUrl}
          goalPhrase={goalPhrase}
          lastSyncLabel={lastSyncLabel}
          readTodaySubtext={narrativeRead}
        />
        <div className="vc-hero-main" style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="vc-herotop">
            <div className="vc-hero-copy" style={{ flex: "1 1 280px" }}>
              <div style={eyebrow}>Your read today</div>
              <h1 className="vc-hero-heading" style={{ margin: "8px 0 0", fontSize: 27, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.12 }}>
                You are in a <span style={{ color: C.teal }}>{stateWord}</span> state today
              </h1>
              <p className="vc-hero-body" style={{ margin: "10px 0 0", fontSize: 13, color: C.muted, lineHeight: 1.55, maxWidth: 460 }} data-testid="journey-read-today-body">
                {narrativeRead}
              </p>
            </div>
            <div className="vc-gaugecluster">
              {livePillars.map((p) => (
                <GaugeCard key={p.key} value={p.value} label={p.label} color={p.color} hero={p.hero} loading={gaugesLoading} />
              ))}
            </div>
          </div>
          {/* Prompt 216: Journey graph card with full-bleed hero video background */}
          <div
            data-testid="journey-graph-card"
            className="vc-journey-graph-card"
            style={{
              position: "relative",
              border: `1px solid ${C.line}`,
              borderRadius: 16,
              padding: "16px 16px 14px",
              overflow: "hidden",
              background: `linear-gradient(180deg, ${C.inset}, ${C.card})`,
            }}
          >
            <JourneyGraphHeroVideo />
            <Journey userId={userId} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HannahRead({
  greeting,
  analysis,
  recommendation,
  focusArea,
  estimatedImpact,
}: {
  greeting: string;
  analysis: string;
  recommendation: string;
  focusArea: string;
  estimatedImpact: number;
}) {
  const router = useRouter();
  return (
    <div style={{ ...panel(true), display: "flex", flexDirection: "column" }}>
      <Edge active />
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <span style={{ width: 30, height: 30, borderRadius: 999, background: C.tealSoft, color: C.teal, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={15} strokeWidth={SW} /></span>
        <div><div style={{ ...eyebrow, color: C.teal }}>Hannah AI</div><div style={{ fontSize: 10.5, color: C.muted }}>Personalized read</div></div>
      </div>
      <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700 }}>{greeting}</h3>
      <p style={{ margin: 0, fontSize: 12.5, color: C.muted, lineHeight: 1.55 }}>{analysis}</p>
      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: C.inset, border: `1px solid ${C.orangeSoft}` }}>
        <div style={{ ...eyebrow, color: C.orange, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><Target size={12} strokeWidth={SW} /> Focus, {focusArea.toLowerCase()}</div>
        <p style={{ margin: 0, fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>{recommendation}</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 12 }}>
        <span style={{ fontSize: 11.5, color: C.muted }}>Estimated lift</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: C.green }}><ArrowUpRight size={13} strokeWidth={SW} /> +{estimatedImpact} pts</span>
      </div>
      <button className="vc-focus" onClick={() => router.push("/wellness/advisor?report=bio-optimization")} style={{ marginTop: 10, width: "100%", cursor: "pointer", background: "transparent", border: `1px solid ${C.teal}`, color: C.teal, borderRadius: 10, padding: "10px 12px", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>View Full Report with Hannah <ArrowRight size={15} strokeWidth={SW} /></button>
    </div>
  );
}

function StatBar({ icon: Icon, name, value, sub, pct, color, loading }: { icon: LucideIcon; name: string; value: string; sub: string; pct: number; color: string; loading?: boolean }) {
  return (
    <div style={{ flex: "1 1 150px", minWidth: 140 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}><Icon size={15} strokeWidth={SW} color={C.muted} /><span style={{ fontSize: 12, color: C.muted }}>{name}</span></div>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Shimmer w={90} h={18} radius={4} />
          <Shimmer w="100%" h={6} radius={6} />
        </div>
      ) : (
        <>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{value} <span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>{sub}</span></div>
          <div style={{ height: 6, borderRadius: 6, background: C.inset, marginTop: 7, overflow: "hidden" }}><div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 6 }} /></div>
        </>
      )}
    </div>
  );
}
function Sparkline({ data, color = C.teal, w = 92, h = 26 }: { data: number[]; color?: string; w?: number; h?: number }) {
  const max = Math.max(...data), min = Math.min(...data), span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / span) * (h - 4) - 2]);
  return <svg width={w} height={h} style={{ display: "block" }}><path d={pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ")} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} /></svg>;
}
// VitalRow: [name, value, delta, sparklineData, color]
// Wearable-OFF rows use "--" for value and delta, flat sparkline at 1.
// Hydration row is LIVE when hydrationData is available.
type VitalRow = [string, string, string, number[], string];
function Donut({ segments, top, bot, size = 118 }: { segments: { value: number; color: string }[]; top: string; bot: string; size?: number }) {
  const strokeW = Math.max(9, Math.round(size * 0.11));
  const r = size / 2 - strokeW, CIRC = 2 * Math.PI * r; let off = 0; const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.inset} strokeWidth={strokeW} />
        {segments.map((s, i) => { const len = (s.value / total) * CIRC; const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={strokeW} strokeDasharray={`${len} ${CIRC - len}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />; off += len; return el; })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 6px" }}><div style={{ fontSize: Math.round(size * 0.15), fontWeight: 800, lineHeight: 1, whiteSpace: "nowrap" }}>{top}</div><div style={{ fontSize: Math.round(size * 0.08), color: C.muted, lineHeight: 1, marginTop: 2, whiteSpace: "nowrap" }}>{bot}</div></div>
    </div>
  );
}
function Legend({ items }: { items: { name: string; label: string; color: string }[] }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{items.map((it, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: it.color }} /><span style={{ color: C.muted, flex: 1 }}>{it.name}</span><span style={{ color: C.text, fontWeight: 600 }}>{it.label}</span></div>)}</div>;
}

type AccDot = { hub: string; label: string; icon: LucideIcon; missing?: boolean };
type AccItem = { id: string; headline: string; body: string; tag: string; pts: number; icon: LucideIcon; conf: string; dots: AccDot[]; placeholder?: boolean };

// Appendix A seeded provenance dots, indexed by the canonical rec id.
// Engine-sourced: the useJourneyRecommendations hook seeds these into the DB
// but does not carry provenance dots. The dots below are the static Appendix A
// set and are tagged as engine-sourced so they can be swapped later.
const SEEDED_DOTS: Record<string, AccDot[]> = {
  "foundation-stack": [
    { hub: "My Genetics", label: "MTHFR C677T variant", icon: Dna },
    { hub: "Lab Results", label: "Homocysteine trending up", icon: FlaskConical },
    { hub: "Assessment", label: "Fatigue you reported", icon: ClipboardList },
  ],
  "sleep-window": [
    { hub: "Connected", label: "Sleep slipping this week", icon: Moon },
    { hub: "My Biology", label: "Recovery below target", icon: HeartPulse },
  ],
  "omega-stack": [
    { hub: "Assessment", label: "Inflammation markers in CAQ", icon: ClipboardList },
    { hub: "Lab Results", label: "Omega panel not on file yet", icon: FlaskConical, missing: true },
  ],
  "zone-2": [
    { hub: "My Biology", label: "Recovery supports easy load", icon: HeartPulse },
    { hub: "Goal", label: "Build lean mass", icon: Target },
  ],
  "breath-reset": [
    { hub: "My Biology", label: "HRV dip at midday", icon: HeartPulse },
    { hub: "Assessment", label: "Stress level reported", icon: ClipboardList },
  ],
};

// Map a JourneyRec icon string to a Lucide icon component.
function recIconToLucide(icon: string): LucideIcon {
  if (icon === "sleep") return Moon;
  if (icon === "nutrition") return Salad;
  if (icon === "movement") return Activity;
  if (icon === "stress") return HeartPulse;
  return Pill; // supplement or unknown
}

// Map a Journey hub key to a Lucide icon for the provenance dot.
// Matches the HUBS array ordering in ConnectionMap.
function hubKeyToLucide(hub: string): LucideIcon {
  if (hub === "Genetics") return Dna;
  if (hub === "Labs") return FlaskConical;
  if (hub === "CAQ") return ClipboardList;
  if (hub === "Biology") return HeartPulse;
  if (hub === "Nutrition") return Salad;
  if (hub === "Supplements") return Pill;
  return ClipboardList;
}

// Map a tag string to a Lucide icon for the AccCard icon disc.
function tagToLucide(tag: string): LucideIcon {
  const t = tag.toUpperCase();
  if (t === "SLEEP") return Moon;
  if (t === "NUTRITION") return Salad;
  if (t === "MOVEMENT" || t === "ACTIVITY") return Activity;
  if (t === "STRESS") return HeartPulse;
  return Pill;
}

// Convert an EngineAccItem to the local AccItem shape used by AccCard.
// Points are derived (tagged via source); icons are mapped from hub keys.
function engineItemToAccItem(item: EngineAccItem): AccItem {
  const dots: AccDot[] = item.dots.map((d) => ({
    hub: d.hub,
    label: d.label,
    icon: hubKeyToLucide(d.hub),
    missing: d.missing,
  }));
  return {
    id: item.id,
    headline: item.headline,
    body: item.body,
    tag: item.tag,
    pts: item.pts,
    icon: tagToLucide(item.tag),
    conf: item.conf,
    dots,
  };
}

/** Honest empty-slot card when fewer than 4 distinct insights exist (Prompt 213). */
function moreInsightsPlaceholder(slot: number): AccItem {
  return {
    id: `placeholder-more-${slot}`,
    headline: 'More insights as your data grows',
    body: 'Connect Genetics, Labs, Nutrition, and Biology so Hannah can open new accelerators.',
    tag: 'GROWING',
    pts: 0,
    icon: Sparkles,
    conf: 'medium',
    dots: [],
    placeholder: true,
  };
}

// Map a JourneyRec to the AccItem shape used by AccCard.
// Provenance dots: use seeded Appendix A dots by rec id; fall back to an
// empty dots array so the expander renders cleanly with no fabricated data.
// Tagged engine-sourced via the tag field suffix.
function recToAccItem(rec: { id: string; title: string; description: string; category: string; estimatedImpact: number; icon: string }): AccItem {
  const dots = SEEDED_DOTS[rec.id] ?? [];
  const isHigh = rec.estimatedImpact >= 8;
  return {
    id: rec.id,
    headline: rec.title,
    body: rec.description,
    tag: rec.category.toUpperCase(),
    pts: rec.estimatedImpact,
    icon: recIconToLucide(rec.icon),
    conf: isHigh ? "high" : "medium",
    dots,
  };
}
function AccCard({ c }: { c: AccItem }) {
  const [open, setOpen] = useState(false);
  const Ic = c.icon, col = c.conf === "high" ? C.teal : C.orange, Conf = c.conf === "high" ? ShieldCheck : CircleAlert;
  if (c.placeholder) {
    return (
      <div style={{ ...panel(false), opacity: 0.85 }} data-testid="accelerator-placeholder">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ width: 38, height: 38, borderRadius: 999, background: C.inset, border: `1px solid ${C.teal}`, color: C.teal, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Ic size={17} strokeWidth={SW} /></span>
        </div>
        <h3 style={{ margin: "12px 0 6px", fontSize: 16, fontWeight: 700 }}>{c.headline}</h3>
        <p style={{ margin: 0, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>{c.body}</p>
      </div>
    );
  }
  return (
    <div style={panel(false)} data-testid={`accelerator-card-${c.id}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ width: 38, height: 38, borderRadius: 999, background: C.inset, border: `1px solid ${C.orange}`, color: C.orange, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Ic size={17} strokeWidth={SW} /></span>
        <span style={{ padding: "4px 9px", borderRadius: 999, background: C.greenSoft, color: C.green, fontSize: 11.5, fontWeight: 700 }}>+{c.pts} pts</span>
      </div>
      <h3 style={{ margin: "12px 0 6px", fontSize: 16, fontWeight: 700 }}>{c.headline}</h3>
      <p style={{ margin: 0, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>{c.body}</p>
      <div style={{ ...eyebrow, marginTop: 12, fontSize: 10 }}>{c.tag}</div>
      <button onClick={() => setOpen(!open)} className="vc-focus" style={{ marginTop: 10, cursor: "pointer", width: "100%", background: "transparent", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 10px", display: "flex", alignItems: "center", gap: 7, color: col, fontSize: 11.5, fontWeight: 600 }}><Conf size={13} strokeWidth={SW} /> Why this, why you<ChevronDown size={14} strokeWidth={SW} style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }} /></button>
      {open && <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 9 }}>{c.dots.map((dt, i) => { const Di = dt.icon, dc = dt.missing ? C.orange : C.teal; return <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 9, background: C.inset, border: `1px solid ${dt.missing ? C.orangeSoft : C.line}` }}><span style={{ width: 24, height: 24, borderRadius: 7, background: dt.missing ? C.orangeSoft : C.tealSoft, color: dc, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Di size={13} strokeWidth={SW} /></span><span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 12, fontWeight: 600 }}>{dt.label}</span><span style={{ display: "block", fontSize: 10, color: C.muted }}>{dt.hub}</span></span></div>; })}</div>}
    </div>
  );
}
const HUBS: [string, LucideIcon][] = [["CAQ", ClipboardList], ["Genetics", Dna], ["Labs", FlaskConical], ["Biology", HeartPulse], ["Nutrition", Salad], ["Supplements", Pill]];
function ConnectionMap({ activeHubs, narrativeLine }: { activeHubs: string[]; narrativeLine: string }) {
  const active = new Set(activeHubs);
  const size = 300, cx = size / 2, cy = size / 2, r = 102;
  const nodes = HUBS.map(([key], i) => { const a = (-90 + i * 60) * Math.PI / 180; return { key, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; });
  const litNodes = nodes.filter((n) => active.has(n.key));
  return (
    <div style={{ ...panel(false), flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{narrativeLine}</p>
      <div style={{ flex: 1, position: "relative", minHeight: 0, marginTop: 8 }}>
      <svg viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}>
        {nodes.map((n) => <line key={n.key} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke={active.has(n.key) ? C.teal : C.line} strokeWidth={active.has(n.key) ? 2 : 1} style={{ opacity: active.has(n.key) ? 0.9 : 0.5 }} />)}
        {litNodes.map((a, i) => litNodes.slice(i + 1).map((b, j) => <line key={`${i}${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.teal} strokeWidth="1.4" style={{ opacity: 0.5 }} />))}
        <circle cx={cx} cy={cy} r={23} fill={C.tealSoft} stroke={C.teal} strokeWidth="1.5" /><text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={C.text}>You</text>
        {nodes.map((n) => <g key={n.key}><circle cx={n.x} cy={n.y} r={20} fill={active.has(n.key) ? C.tealSoft : C.inset} stroke={active.has(n.key) ? C.teal : C.line} strokeWidth={active.has(n.key) ? 2 : 1.5} /><text x={n.x} y={n.y + 32} textAnchor="middle" fontSize="9.5" fill={active.has(n.key) ? C.text : C.muted} fontWeight={active.has(n.key) ? 600 : 500}>{n.key}</text></g>)}
      </svg>
      </div>
    </div>
  );
}

function TodayTab({
  hydrationValue,
  hydrationSub,
  hydrationPct,
  vitals,
  hannahGreeting,
  hannahAnalysis,
  hannahRecommendation,
  hannahFocusArea,
  hannahEstimatedImpact,
  stepsValue,
  stepsSub,
  stepsBarPct,
  exerciseValue,
  exerciseSub,
  exerciseBarPct,
  sleepValue,
  sleepSub,
  sleepBarPct,
  statBarsLoading,
  vitalsLoading,
  hannahLoading,
}: {
  hydrationValue: string;
  hydrationSub: string;
  hydrationPct: number;
  vitals: VitalRow[];
  hannahGreeting: string;
  hannahAnalysis: string;
  hannahRecommendation: string;
  hannahFocusArea: string;
  hannahEstimatedImpact: number;
  stepsValue: string;
  stepsSub: string;
  stepsBarPct: number;
  exerciseValue: string;
  exerciseSub: string;
  exerciseBarPct: number;
  sleepValue: string;
  sleepSub: string;
  sleepBarPct: number;
  statBarsLoading?: boolean;
  vitalsLoading?: boolean;
  hannahLoading?: boolean;
}) {
  return (
    <div className="vc-split" style={{ alignItems: "stretch" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={panel(false)}>
          <div style={{ ...eyebrow, marginBottom: 12 }}>Today</div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <StatBar icon={Activity} name="Steps" value={stepsValue} sub={stepsSub} pct={stepsBarPct} color={C.teal} loading={statBarsLoading} />
            <StatBar icon={Heart} name="Active Calories" value="Connect to populate" sub="" pct={0} color={C.teal} />
            <StatBar icon={Activity} name="Exercise" value={exerciseValue} sub={exerciseSub} pct={exerciseBarPct} color={C.teal} loading={statBarsLoading} />
            <StatBar icon={Moon} name="Sleep" value={sleepValue} sub={sleepSub} pct={sleepBarPct} color={C.blue} loading={statBarsLoading} />
            <StatBar icon={Droplet} name="Hydration" value={hydrationValue} sub={hydrationSub} pct={hydrationPct} color="#38BDD8" />
          </div>
        </div>
        <div style={{ ...panel(false), flexGrow: 1 }}>
          <div style={{ ...eyebrow, marginBottom: 10 }}>Vital trends</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {vitalsLoading ? (
              <>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Shimmer w={80} h={14} radius={4} />
                    <Shimmer w={54} h={14} radius={4} />
                    <Shimmer w={92} h={18} radius={4} />
                  </div>
                ))}
              </>
            ) : (
              vitals.map(([n, val, d, data, col]) => <div key={n} style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ flex: 1, fontSize: 12, color: C.muted }}>{n}</span><span style={{ fontSize: 12, fontWeight: 600, width: 54, textAlign: "right" }}>{val}</span><span style={{ fontSize: 11, color: C.teal, width: 28 }}>{d}</span><Sparkline data={data} color={col} /></div>)
            )}
          </div>
        </div>
      </div>
      {hannahLoading ? (
        <div style={{ ...panel(true), display: "flex", flexDirection: "column", gap: 12 }}>
          <Edge active />
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Shimmer w={30} h={30} radius={999} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Shimmer w={80} h={12} radius={4} />
              <Shimmer w={110} h={10} radius={4} />
            </div>
          </div>
          <Shimmer w="70%" h={20} radius={4} />
          <Shimmer w="100%" h={60} radius={8} />
          <Shimmer w="100%" h={70} radius={10} />
          <Shimmer w="100%" h={36} radius={10} />
        </div>
      ) : (
        <HannahRead
          greeting={hannahGreeting}
          analysis={hannahAnalysis}
          recommendation={hannahRecommendation}
          focusArea={hannahFocusArea}
          estimatedImpact={hannahEstimatedImpact}
        />
      )}
    </div>
  );
}
function GoalCard({
  goalLabel,
  narrative,
  progressPct,
  baselineLabel,
  nowLabel,
  targetLabel,
  loading,
}: {
  goalLabel: string;
  narrative: string;
  progressPct: number;
  baselineLabel: string;
  nowLabel: string;
  targetLabel: string;
  loading?: boolean;
}) {
  return (
    <div style={panel(true)}>
      <Edge active />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{goalLabel}</h2><p style={{ margin: "6px 0 0", fontSize: 12, color: C.muted, maxWidth: 340 }}>{narrative}</p></div>
        <div style={{ textAlign: "right" }}>
          {loading ? (
            <Shimmer w={54} h={30} radius={6} />
          ) : (
            <div style={{ fontSize: 26, fontWeight: 800, color: C.teal }}>{progressPct}%</div>
          )}
          <div style={{ fontSize: 11, color: C.muted }}>to your target</div>
        </div>
      </div>
      {loading ? (
        <Shimmer w="100%" h={8} radius={8} />
      ) : (
        <div style={{ height: 8, borderRadius: 8, background: C.inset, marginTop: 14, overflow: "hidden" }}><div style={{ height: "100%", width: `${progressPct}%`, background: `linear-gradient(90deg, ${C.teal}, #3fd0c8)`, borderRadius: 8 }} /></div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: C.muted }}><span>{baselineLabel}</span><span>{nowLabel}</span><span>{targetLabel}</span></div>
    </div>
  );
}
function BodyCompTrio({
  leanMassLabel,
  leanMassDelta,
  leanMassSeries,
  bodyFatLabel,
  bodyFatDelta,
  bodyFatSeries,
  energyBalanceRead,
  loading,
}: {
  leanMassLabel: string;
  leanMassDelta: number | null;
  leanMassSeries: number[];
  bodyFatLabel: string;
  bodyFatDelta: number | null;
  bodyFatSeries: number[];
  energyBalanceRead: string;
  loading?: boolean;
}) {
  return (
    <div className="vc-tri">
      <div style={panel(false)}>
        <div style={{ ...eyebrow, marginBottom: 10 }}>Lean mass</div>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Shimmer w={80} h={26} radius={4} /><Shimmer w={180} h={36} radius={4} /></div>
        ) : (
          <>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{leanMassLabel} {leanMassDelta !== null && <span style={{ fontSize: 12 }}><Delta v={leanMassDelta} unit=" lb" /></span>}</div>
            <div style={{ marginTop: 10 }}><Sparkline data={leanMassSeries} w={180} h={36} /></div>
          </>
        )}
      </div>
      <div style={panel(false)}>
        <div style={{ ...eyebrow, marginBottom: 10 }}>Body fat</div>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Shimmer w={80} h={26} radius={4} /><Shimmer w={180} h={36} radius={4} /></div>
        ) : (
          <>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{bodyFatLabel} {bodyFatDelta !== null && <span style={{ fontSize: 12 }}><Delta v={bodyFatDelta} unit=" pt" /></span>}</div>
            <div style={{ marginTop: 10 }}><Sparkline data={bodyFatSeries} w={180} h={36} color={C.orange} /></div>
          </>
        )}
      </div>
      <div style={panel(false)}><div style={{ ...eyebrow, marginBottom: 12 }}>Energy balance</div><div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>{([["Intake", Salad], ["Activity", Activity], ["Body", HeartPulse]] as [string, LucideIcon][]).map(([n, Ic]) => <div key={n} style={{ textAlign: "center" }}><span style={{ width: 38, height: 38, borderRadius: 999, background: C.tealSoft, color: C.teal, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Ic size={17} strokeWidth={SW} /></span><div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>{n}</div></div>)}</div><div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: C.teal, fontWeight: 600 }}>{energyBalanceRead}</div></div>
    </div>
  );
}
function NutritionCard({
  carbsG,
  proteinG,
  fatG,
  kcalTop,
  kcalBot,
  carbsLabel,
  proteinLabel,
  fatLabel,
  loading,
}: {
  carbsG: number;
  proteinG: number;
  fatG: number;
  kcalTop: string;
  kcalBot: string;
  carbsLabel: string;
  proteinLabel: string;
  fatLabel: string;
  loading?: boolean;
}) {
  // Prompt 216b: chartPalette tokens only. No-data = full chart-empty ring (not fake proportions).
  const totalMacros = carbsG + proteinG + fatG;
  const segments =
    totalMacros > 0
      ? [
          { value: carbsG, color: nutritionChartColors.carbs },
          { value: proteinG, color: nutritionChartColors.protein },
          { value: fatG, color: nutritionChartColors.fat },
        ]
      : [{ value: 1, color: chartPalette.empty }];
  return (
    <div style={panel(false)}>
      <div style={{ ...eyebrow, marginBottom: 10 }}>Nutrition</div>
      {loading ? (
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Shimmer w={86} h={86} radius={999} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Shimmer w={100} h={14} radius={4} />
            <Shimmer w={100} h={14} radius={4} />
            <Shimmer w={100} h={14} radius={4} />
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Donut size={86} segments={segments} top={kcalTop} bot={kcalBot} />
          <Legend
            items={[
              { name: "Carbs", label: carbsLabel, color: nutritionChartColors.carbs },
              { name: "Protein", label: proteinLabel, color: nutritionChartColors.protein },
              { name: "Fat", label: fatLabel, color: nutritionChartColors.fat },
            ]}
          />
        </div>
      )}
    </div>
  );
}
function SleepCard({ sleepHoursTotal, loading }: { sleepHoursTotal: number | null; loading?: boolean }) {
  // Sleep stages are wearable-OFF. The total from daily_scores/daily_checkins is
  // real; stage breakdown remains connect state (no wearable source).
  // Prompt 216b: no-data ring uses chartPalette.empty (not colorful fake stages).
  const centerTop = sleepHoursTotal !== null ? `${sleepHoursTotal.toFixed(1)} h` : "--";
  const noDataSegments = [{ value: 1, color: chartPalette.empty }];
  return (
    <div style={panel(false)}>
      <div style={{ ...eyebrow, marginBottom: 10 }}>Sleep breakdown</div>
      {loading ? (
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Shimmer w={86} h={86} radius={999} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Shimmer w={100} h={14} radius={4} />
            <Shimmer w={100} h={14} radius={4} />
            <Shimmer w={100} h={14} radius={4} />
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Donut size={86} segments={noDataSegments} top={centerTop} bot="total" />
          <Legend
            items={[
              { name: "Deep", label: "--", color: sleepChartColors.deep },
              { name: "Light", label: "--", color: sleepChartColors.light },
              { name: "REM", label: "--", color: sleepChartColors.rem },
              { name: "Awake", label: "--", color: sleepChartColors.awake },
            ]}
          />
        </div>
      )}
    </div>
  );
}
function AcceleratorsTab({ accel, activeHubs, narrativeLine, loading }: { accel: AccItem[]; activeHubs: string[]; narrativeLine: string; loading?: boolean }) {
  // Prompt 213: fill empty slots with honest placeholders, never clone a real insight.
  const real = accel.filter((c) => !c.placeholder);
  const slots: AccItem[] = [...real];
  let p = 0;
  while (slots.length < 4) {
    slots.push(moreInsightsPlaceholder(p++));
  }
  return (
    <div className="vc-split" style={{ alignItems: "stretch" }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Journey accelerators</div>
        {loading ? (
          <div className="vc-two">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={panel(false)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Shimmer w={38} h={38} radius={999} />
                  <Shimmer w={60} h={24} radius={999} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                  <Shimmer w="80%" h={18} radius={4} />
                  <Shimmer w="100%" h={48} radius={4} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="vc-two">{slots.map((c) => <AccCard key={c.id} c={c} />)}</div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}><div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Your connection map</div><ConnectionMap activeHubs={activeHubs} narrativeLine={narrativeLine} /></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function YourJourneyCoaching({ userId: _userId }: { userId: string | null }) {
  const userId = _userId;

  // Component-level refreshTick: shared counter for the inline useEffect hooks.
  // Window focus refetch (500ms debounced) re-runs avatar, leanBodyMass,
  // energyBalance, and nutritionLogs reads when the user returns to the tab.
  const [refreshTick, setRefreshTick] = useState(0);
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleFocus = () => {
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
      refreshDebounceRef.current = setTimeout(() => {
        setRefreshTick((t) => t + 1);
      }, 500);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    };
  }, []);

  // Real data hooks (fail-open: all return safe defaults on error/loading).
  // Bio Optimization Score SSOT is Connections BOS (resolveConnectionsBosDisplay).
  // bos7D: Hannah insights trend points only. Never slot /api/bos/current into BOS.
  // bos4W and bos1Y are removed: the Journey graph (T3) reads its own history
  // via useJourneyGraphSeries inside the Journey component.
  const { data: bos7D, isLoading: bos7DLoading } = useBioOptimizationTrend(userId, "7D");
  const { data: hydrationData } = useHydrationToday();
  // J-T1: useDailyScores reuses calculateDailyScores + the same daily_checkins /
  // meal_logs / useHydrationToday reads as DailyScoresPanel so pillar values here
  // equal the dashboard "Your pillars" values for the same user.
  const dailyScores = useDailyScores(userId);
  const { targets: nutritionTargets } = useNutritionTargets(userId);
  const { snapshot: compositionSnapshot } = useLatestComposition(userId);
  const bodySeries = useRecentBodySeries(userId);

  // Wearable last-sync from first-class tiles + last-sync-state only.
  const wearableSnapshot = useWearableTilesSnapshot();
  const wearableSyncLine = wearableSyncLineFromTiles(wearableSnapshot.tiles);
  const lastSyncLabel = userId ? wearableSyncLine.lastSyncLabel : LAST_SYNC_LABELS.not_connected;

  // J-T2: Bio Optimization Score SSOT is Connections BOS (wearable tiles).
  // NEVER reads profiles.vitality_score. Never slots a CAQ composite into BOS.
  // Zero named wearable contributors stay null / UNKNOWN / --, never a silent 62.
  const { profile: dashProfile } = useUserDashboardData();
  const connectionsBos = resolveConnectionsBosDisplay(
    namedWearableContributorCount(wearableSnapshot.scoreDetail),
  );
  const bioDashScore: number | null = connectionsBosNumericScore(connectionsBos);
  const bioDashTier: string | null = dashProfile?.bio_optimization_tier ?? null;

  // J-T2: active body_goals row -> goal chip label.
  // Replaces useJourneyState.goalPhrase as the goal chip data source.
  const { goalLabel: activeGoalLabel, goal: activeGoal, loading: activeBodyGoalLoading } = useActiveBodyGoal(userId);

  // J-T3: today's stats (steps, exercise, sleep) from daily_scores + checkins fallback.
  const todayStats = useTodayStats(userId);

  // J-T3: latest metabolic vitals from body_tracker_metabolic.
  const metabolicVitals = useMetabolicVitals(userId);

  // J-T3: today's meal_logs macros (separate from nutrition_logs already read below).
  const todayMealLogs = useTodayMealLogs(userId);

  // Display name: resolved async via getDisplayName (mirrors ProfileCard.tsx approach).
  const [displayName, setDisplayName] = useState<string>("");
  useEffect(() => {
    let active = true;
    getDisplayName()
      .then((n) => { if (active) setDisplayName(n); })
      .catch(() => { /* keep empty greeting */ });
    return () => { active = false; };
  }, [userId]);

  // Avatar URL: best-effort direct Supabase read wrapped in withTimeout + try/catch.
  // Fails open to null (initial tile). Mirrors ProfileCard.tsx resilience pattern.
  // The Supabase query builder chain is cast to a typed Promise to avoid `any`.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setAvatarUrl(null);
    if (!userId) return;
    (async () => {
      try {
        const supabase = createClient();
        type ProfileRow = { avatar_url: string | null };
        type AvatarQueryResult = { data: ProfileRow | null; error: unknown };
        // The Supabase client's from().select().eq().maybeSingle() chain returns a
        // PromiseLike that is not yet typed in the generated types. We cast it to the
        // known result shape. This is the established pattern across 208g/h/ProfileCard.
        const queryResult = supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", userId)
          .maybeSingle();
        const { data } = await withTimeout(
          queryResult as unknown as Promise<AvatarQueryResult>,
          4000,
          "YourJourneyCoaching.avatar",
        );
        const url = (data?.avatar_url as string | null) ?? null;
        if (active) setAvatarUrl(url && url.trim().length > 0 ? url : null);
      } catch (err) {
        safeLog.warn("YourJourneyCoaching", "avatar read failed, failing open", { error: err });
      }
    })();
    return () => { active = false; };
  }, [userId, refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // J-T3: lean_body_mass_lbs from body_tracker_weight (migration 20260416000080).
  // Used as the preferred lean mass label when available, over totalMuscleMassLbs.
  const [leanBodyMassLbs, setLeanBodyMassLbs] = useState<number | null>(null);
  useEffect(() => {
    if (!userId) { setLeanBodyMassLbs(null); return; }
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        type LbmRow = { lean_body_mass_lbs: number | null };
        type LbmResult = { data: LbmRow | null; error: unknown };
        const { data } = await withTimeout(
          supabase
            .from("body_tracker_weight")
            .select("lean_body_mass_lbs")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle() as unknown as Promise<LbmResult>,
          4000,
          "YourJourneyCoaching.leanBodyMass",
        );
        if (!active) return;
        const val = data?.lean_body_mass_lbs ?? null;
        setLeanBodyMassLbs(typeof val === "number" && isFinite(val) ? val : null);
      } catch (err) {
        if (!active) return;
        safeLog.warn("YourJourneyCoaching", "lean_body_mass_lbs read failed, failing open", { error: err });
      }
    })();
    return () => { active = false; };
  }, [userId, refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // J-T3: energy_balance_signals from migration 20260622171000.
  // balance_state, intake_estimate, expenditure_estimate all exist per types.ts line 149.
  const [energyBalance, setEnergyBalance] = useState<{
    balanceState: string | null;
    intakeEstimate: number | null;
    expenditureEstimate: number | null;
  } | null>(null);
  useEffect(() => {
    if (!userId) { setEnergyBalance(null); return; }
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        type EbRow = { balance_state: string | null; intake_estimate: number | null; expenditure_estimate: number | null };
        type EbResult = { data: EbRow | null; error: unknown };
        const { data } = await withTimeout(
          supabase
            .from("energy_balance_signals")
            .select("balance_state, intake_estimate, expenditure_estimate")
            .eq("user_id", userId)
            .order("computed_at", { ascending: false })
            .limit(1)
            .maybeSingle() as unknown as Promise<EbResult>,
          4000,
          "YourJourneyCoaching.energyBalance",
        );
        if (!active) return;
        if (data) setEnergyBalance({ balanceState: data.balance_state, intakeEstimate: data.intake_estimate, expenditureEstimate: data.expenditure_estimate });
      } catch (err) {
        if (!active) return;
        safeLog.warn("YourJourneyCoaching", "energy_balance_signals read failed, failing open", { error: err });
      }
    })();
    return () => { active = false; };
  }, [userId, refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // J-T1: pillar values from useDailyScores (TODAY's dashboard values via
  // calculateDailyScores + same reads as DailyScoresPanel). Null -> 0 so the
  // GaugeCard renders in its existing computing/0 state (same I-T2a behaviour).
  // "overall" key maps to Connections BOS (same SSOT as the dashboard card).
  const overallCurrent = bioDashScore;
  const hydrationPct = hydrationData?.percentage_of_target ?? null;

  const pillarValues: PillarValues = {
    sleep: dailyScores.sleepQuality ?? 0,
    energy: dailyScores.energyLevel ?? 0,
    mood: dailyScores.moodStress ?? 0,
    nutrition: dailyScores.nutrition ?? 0,
    activity: dailyScores.physicalActivity ?? 0,
    overall: overallCurrent,
    hydration: dailyScores.hydration ?? hydrationPct ?? 0,
  };

  // Profile card data.
  // Note: rangeData (T3-removed), buildRangeData (T3-removed), bos4W (T3-removed),
  // bos1Y (T3-removed) are all gone. The Journey component now manages its own
  // series via useJourneyGraphSeries internally.
  const displayNameSafe = displayName.trim();
  const initial = displayNameSafe.charAt(0).toUpperCase() || "V";
  // J-T2: goal chip now driven by the active body_goals row via useActiveBodyGoal.
  // When no active goal is set, activeGoalLabel is "Set a goal".
  const goalPhrase = activeGoalLabel;


  // ---------------------------------------------------------------------------
  // Lower-section data derivation (I-T2b)
  // ---------------------------------------------------------------------------

  // Nutrition logs: read today's confirmed macros client-side (fail-open).
  // Mirrors the NutritionDonut.tsx query pattern (withTimeout + safeLog).
  const [todayMacros, setTodayMacros] = useState<{
    carbsG: number; proteinG: number; fatG: number; calories: number; logCount: number;
  }>({ carbsG: 0, proteinG: 0, fatG: 0, calories: 0, logCount: 0 });
  const [todayMacrosLoading, setTodayMacrosLoading] = useState<boolean>(true);
  // Tracks whether the macros read has resolved at least once. Used as the
  // hasData signal for shouldShowSkeleton so a focus-refetch keeps the stale
  // populated donut on screen instead of flashing a skeleton.
  const macrosEverLoadedRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      setTodayMacros({ carbsG: 0, proteinG: 0, fatG: 0, calories: 0, logCount: 0 });
      setTodayMacrosLoading(false);
      macrosEverLoadedRef.current = true;
      return;
    }
    setTodayMacrosLoading(true);
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);
        type NutritionRow = { calories: number | null; carbs_g: number | null; protein_g: number | null; total_fat_g: number | null };
        const { data } = await withTimeout(
          supabase
            .from("nutrition_logs")
            .select("calories, carbs_g, protein_g, total_fat_g")
            .eq("user_id", userId)
            .eq("status", "confirmed")
            .gte("logged_at", start.toISOString())
            .lt("logged_at", end.toISOString()) as unknown as Promise<{ data: NutritionRow[] | null; error: unknown }>,
          4000,
          "YourJourneyCoaching.nutritionLogs",
        );
        if (!active) return;
        const rows = (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>;
        const fn = (v: unknown): number => {
          if (typeof v === "number" && isFinite(v)) return v;
          if (typeof v === "string") { const p = Number(v); if (isFinite(p)) return p; }
          return 0;
        };
        type MacroAcc = { carbsG: number; proteinG: number; fatG: number; calories: number; logCount: number };
        const totals = rows.reduce<MacroAcc>(
          (acc, r) => ({
            carbsG: acc.carbsG + fn(r.carbs_g),
            proteinG: acc.proteinG + fn(r.protein_g),
            fatG: acc.fatG + fn(r.total_fat_g),
            calories: acc.calories + fn(r.calories),
            logCount: acc.logCount + 1,
          }),
          { carbsG: 0, proteinG: 0, fatG: 0, calories: 0, logCount: 0 },
        );
        setTodayMacros(totals);
        setTodayMacrosLoading(false);
        macrosEverLoadedRef.current = true;
      } catch (err) {
        if (!active) return;
        safeLog.warn("YourJourneyCoaching", "nutrition_logs read failed, failing open", { error: err });
        setTodayMacrosLoading(false);
        macrosEverLoadedRef.current = true;
      }
    })();
    return () => { active = false; };
  }, [userId, refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hannah insights: drive from useBioOptimizationTrend data (7D range).
  const bos7DPoints = bos7D?.dailyScores ?? bos7D?.bioScores ?? [];
  const weeksActive = Math.ceil(bos7DPoints.length / 7);
  const hannahInsight = useHannahInsights({
    userId,
    displayName: displayNameSafe,
    range: "7D",
    points: bos7DPoints,
    current: overallCurrent,
    weeksActive,
  });

  // J-T4: Journey accelerators from the REAL engine tables.
  // useEngineAccelerators reads recommendations + ultrathink_recommendations,
  // merges by rank, pads with Appendix A seeds when fewer than 4 engine recs exist.
  // All reads are withTimeout(4000ms) + try/catch fail-open + safeLog.
  // The pts field is always derived (tagged "derived" via the EngineAccItem.derivedPts field).
  // Falls back to the seeded Appendix A items when the engine tables return nothing.
  // The useJourneyRecommendations hook below is kept for the Hannah-insight current score
  // computation but no longer drives the accelerator cards.
  const journeyRecs = useJourneyRecommendations(userId, overallCurrent ?? 0);
  const engineAccel = useEngineAccelerators(userId);
  const accelItems: AccItem[] = engineAccel.items.map(engineItemToAccItem);

  // Prompt 213: hubs and caption come from the full distinct insight set.
  const activeHubs = engineAccel.activeHubs;
  const narrativeLine = engineAccel.narrativeLine;

  // Hydration stat bar (LIVE).
  const hydrationTotalL = hydrationData?.total_ml != null ? hydrationData.total_ml / 1000 : null;
  const hydrationTargetL = hydrationData?.target_ml != null ? hydrationData.target_ml / 1000 : null;
  const hydrationValue = hydrationTotalL !== null ? hydrationTotalL.toFixed(1) : "--";
  const hydrationSub = hydrationTargetL !== null ? `/ ${hydrationTargetL.toFixed(1)} L` : "";
  const hydrationBarPct = hydrationPct !== null ? Math.min(100, Math.round(hydrationPct)) : 0;

  // Vitals rows: body_tracker_metabolic for HRV/RestingHR/Respiratory/BloodOxygen
  // (migration 20260414000020; hrv_ms, resting_hr_bpm, respiratory_rate,
  // blood_oxygen_pct all exist in types.ts).
  // Wearable-OFF rows with null values show "--" plus flat sparkline (honest state).
  const FLAT = flatSparkline();
  const vitHrvStr = metabolicVitals.hrv !== null ? `${Math.round(metabolicVitals.hrv)} ms` : "--";
  const vitRestHrStr = metabolicVitals.restingHr !== null ? `${Math.round(metabolicVitals.restingHr)} bpm` : "--";
  const vitRespStr = metabolicVitals.respiratory !== null ? `${metabolicVitals.respiratory.toFixed(1)} brpm` : "--";
  const vitO2Str = metabolicVitals.bloodOxygen !== null ? `${metabolicVitals.bloodOxygen.toFixed(1)}%` : "--";
  const vitals: VitalRow[] = [
    ["HRV", vitHrvStr, "", FLAT, C.teal],
    ["Resting HR", vitRestHrStr, "", FLAT, C.teal],
    ["Respiratory", vitRespStr, "", FLAT, C.teal],
    ["Blood Oxygen", vitO2Str, "", FLAT, C.teal],
    [
      "Hydration",
      hydrationValue !== "--" ? `${hydrationValue} L` : "--",
      "",
      FLAT,
      "#38BDD8",
    ],
  ];

  // Combined macros: nutrition_logs (confirmed only) + meal_logs for today.
  // meal_logs uses fat_g (not total_fat_g which is nutrition_logs specific).
  // (migration 20260411000040 for meal_logs; nutrition_logs already read above)
  const combinedMacros = {
    carbsG: todayMacros.carbsG + todayMealLogs.carbsG,
    proteinG: todayMacros.proteinG + todayMealLogs.proteinG,
    fatG: todayMacros.fatG + todayMealLogs.fatG,
    calories: todayMacros.calories + todayMealLogs.calories,
  };

  // Nutrition donut values.
  const targetKcal = typeof nutritionTargets?.dailyKcal === "number" ? nutritionTargets.dailyKcal : null;
  const kcalResult = kcalRemaining(targetKcal, combinedMacros.calories);
  const targetCarbsG = typeof nutritionTargets?.dailyCarbsG === "number" ? nutritionTargets.dailyCarbsG : null;
  const targetProteinG = typeof nutritionTargets?.dailyProteinG === "number" ? nutritionTargets.dailyProteinG : null;
  const targetFatG = typeof nutritionTargets?.dailyFatTotalG === "number" ? nutritionTargets.dailyFatTotalG : null;
  const carbsLabel = formatMacroLabel(combinedMacros.carbsG, targetCarbsG);
  const proteinLabel = formatMacroLabel(combinedMacros.proteinG, targetProteinG);
  const fatLabel = formatMacroLabel(combinedMacros.fatG, targetFatG);

  // GoalCard: wire real goal bounds from useActiveBodyGoal (J-T2, J-T3).
  // start_weight_lb, goal_weight_lb, start_date, target_date exist in body_goals
  // (migration 20260607020000_prompt_179_body_goals.sql).
  // 208a weight guardrail: supportive framing only.
  const goalLabel = goalPhrase.charAt(0).toUpperCase() + goalPhrase.slice(1);
  const goalStartLb = activeGoal?.start_weight_lb ?? null;
  const goalTargetLb = activeGoal?.goal_weight_lb ?? null;

  const latestWeightLbs = bodySeries.weightLbs.length > 0
    ? bodySeries.weightLbs[bodySeries.weightLbs.length - 1]
    : null;
  const firstWeightLbs = bodySeries.weightLbs.length > 0 ? bodySeries.weightLbs[0] : null;

  // goalProgressPct from lowerHelpers (migration 20260607020000 covers start/goal bounds).
  const computedProgressPct = goalProgressPct(goalStartLb, latestWeightLbs, goalTargetLb) ?? 0;
  const progressPct = computedProgressPct;

  const baselineLabel = goalStartLb !== null
    ? `Start ${Math.round(goalStartLb)} lb`
    : firstWeightLbs !== null
      ? `Baseline ${Math.round(firstWeightLbs)} lb`
      : "Baseline --";
  const nowLabel = latestWeightLbs !== null ? `Now ${Math.round(latestWeightLbs)} lb` : "Now --";
  const targetLabelStr = goalTargetLb !== null
    ? `Target ${Math.round(goalTargetLb)} lb`
    : "Target --";

  const goalNarrative = activeGoal === null
    ? "Set a body goal to see your progress chart here. No rush, build at your own pace."
    : latestWeightLbs === null
      ? "Log your weight to see your progress. As you log, this picture fills in."
      : "You are building momentum in a supportive direction. Small, consistent steps are what carry the trend.";

  // BodyCompTrio values from useLatestComposition + useRecentBodySeries.
  // Lean mass: body_tracker_weight.lean_body_mass_lbs when available
  // (migration 20260416000080). Falls back to totalMuscleMassLbs from segmental
  // muscle, then "--". Body weight is NOT a lean-mass proxy and must not fall back
  // to latestWeightLbs here -- that would show a body-weight number under the
  // "Lean mass" heading, which is misleading.
  const latestMuscleLbs = leanBodyMassLbs ?? compositionSnapshot?.totalMuscleMassLbs ?? null;
  const latestBodyFatPct = compositionSnapshot?.totalBodyFatPct ?? null;
  // Lean-mass delta: only show when headline and delta come from the SAME series.
  // The headline is totalMuscleMassLbs (muscle-mass series); the weight series is a
  // different metric. Passing a weight-series delta for a muscle-mass headline is
  // misleading. Pass null so no delta renders unless a real muscle-series delta exists.
  const muscleDelta: number | null = null;
  const bodyFatDelta = bodySeries.bodyFatPct.length >= 2
    ? Math.round((bodySeries.bodyFatPct[bodySeries.bodyFatPct.length - 1] - bodySeries.bodyFatPct[bodySeries.bodyFatPct.length - 2]) * 10) / 10
    : null;
  const leanMassLabel = latestMuscleLbs !== null
    ? `${latestMuscleLbs.toFixed(1)} lb`
    : "--";
  const bodyFatLabel = latestBodyFatPct !== null
    ? `${latestBodyFatPct.toFixed(1)} %`
    : bodySeries.bodyFatPct.length > 0
      ? `${bodySeries.bodyFatPct[bodySeries.bodyFatPct.length - 1].toFixed(1)} %`
      : "--";
  const leanMassSeries = bodySeries.weightLbs.length >= 2
    ? bodySeries.weightLbs
    : flatSparkline(latestWeightLbs ?? 1);
  const bodyFatSeries = bodySeries.bodyFatPct.length >= 2
    ? bodySeries.bodyFatPct
    : flatSparkline(latestBodyFatPct ?? 1);
  // Energy balance: prefer energy_balance_signals.balance_state when available
  // (migration 20260622171000). Falls back to combined macros vs target estimate.
  const energyBalanceRead = (() => {
    if (energyBalance?.balanceState) {
      if (energyBalance.balanceState === "deficit") return "In a calorie deficit";
      if (energyBalance.balanceState === "surplus") return "In a calorie surplus";
      if (energyBalance.balanceState === "maintenance") return "Near maintenance balance";
      return energyBalance.balanceState;
    }
    if (combinedMacros.calories > 0 && targetKcal !== null) {
      return combinedMacros.calories < targetKcal ? "On track for your goal" : "Surplus supports the trend";
    }
    return "Log meals to see your energy balance";
  })();

  // Today stats bar values (J-T3).
  // Steps: daily_scores.steps_count (types.ts line 8278).
  // Exercise: daily_scores.exercise_minutes (types.ts line 8270); fallback:
  //   daily_checkins cardio_duration_min + resistance_duration_min.
  // Sleep bar: daily_scores.sleep_hours (types.ts line 8276); fallback:
  //   daily_checkins.sleep_hours. (migration 20260412000010)
  const STEP_TARGET = 10000;
  const EXERCISE_TARGET_MIN = 30;
  const SLEEP_TARGET_H = 8;

  const stepsValue = todayStats.stepsCount !== null
    ? `${todayStats.stepsCount.toLocaleString()}`
    : "Connect to populate";
  const stepsSub = todayStats.stepsCount !== null ? `/ ${STEP_TARGET.toLocaleString()}` : "";
  const stepsBarPct = todayStats.stepsCount !== null
    ? Math.min(100, Math.round((todayStats.stepsCount / STEP_TARGET) * 100))
    : 0;

  const exerciseValue = todayStats.exerciseMinutes !== null
    ? `${todayStats.exerciseMinutes} min`
    : "Connect to populate";
  const exerciseSub = todayStats.exerciseMinutes !== null ? `/ ${EXERCISE_TARGET_MIN} min` : "";
  const exerciseBarPct = todayStats.exerciseMinutes !== null
    ? Math.min(100, Math.round((todayStats.exerciseMinutes / EXERCISE_TARGET_MIN) * 100))
    : 0;

  const sleepValue = todayStats.sleepHours !== null
    ? `${todayStats.sleepHours.toFixed(1)} h`
    : "Connect to populate";
  const sleepSub = todayStats.sleepHours !== null ? `/ ${SLEEP_TARGET_H} h` : "";
  const sleepBarPct = todayStats.sleepHours !== null
    ? Math.min(100, Math.round((todayStats.sleepHours / SLEEP_TARGET_H) * 100))
    : 0;

  return (
    <div
      className="vc-page"
      data-testid="your-journey-page"
      style={{
        fontFamily: "'Instrument Sans', system-ui, sans-serif",
        background: `radial-gradient(1200px 600px at 70% -12%, #21345c 0%, ${C.navy} 58%)`,
        minHeight: "100vh",
        color: C.text,
        padding: "18px 28px 46px",
        boxSizing: "border-box",
        maxWidth: "100%",
        overflowX: "hidden",
      }}
    >
      <style>{`
        .vc-focus:focus-visible { outline: 2px solid ${C.teal}; outline-offset: 2px; }
        .vc-edge-active { animation: vcPulse 2.8s ease-in-out infinite; }
        @keyframes vcPulse { 0%,100%{opacity:.55} 50%{opacity:1} }
        @keyframes vcShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .vc-hero { display: grid; grid-template-columns: 220px 1fr; gap: 18px; align-items: stretch; }
        .vc-herotop { display: flex; gap: 18px; align-items: flex-start; flex-wrap: wrap; }
        .vc-gaugecluster { flex: 1.7 1 340px; display: flex; gap: 8px; align-items: stretch; }
        .vc-split { display: grid; grid-template-columns: 1fr 400px; gap: 14px; align-items: stretch; }
        .vc-two { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .vc-tri { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .vc-goalrow { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 14px; align-items: stretch; }
        .vc-page-sections { display: flex; flex-direction: column; gap: 22px; }
        .vc-section-label { margin-bottom: 12px; }
        @media (max-width: 1100px){ .vc-split { grid-template-columns: 1fr; } }
        @media (max-width: 960px){ .vc-hero { grid-template-columns: 1fr; } .vc-tri { grid-template-columns: 1fr; } .vc-two { grid-template-columns: 1fr; } .vc-goalrow { grid-template-columns: 1fr; } }
        /* Prompt 216a: mobile layout only (max-width 767px). Desktop rules above unchanged. */
        @media (max-width: 767px) {
          .vc-page {
            padding: 16px 16px calc(40px + env(safe-area-inset-bottom, 0px)) !important;
            padding-left: max(16px, env(safe-area-inset-left, 0px)) !important;
            padding-right: max(16px, env(safe-area-inset-right, 0px)) !important;
            overflow-x: hidden !important;
            max-width: 100vw !important;
          }
          .vc-page-header { display: none !important; }
          .vc-page-sections { gap: 16px !important; }
          .vc-section-label { margin-bottom: 10px !important; }
          .vc-hero-shell {
            padding: 16px !important;
            margin-bottom: 16px !important;
            border-radius: 16px !important;
          }
          /* Profile card keeps radius/overflow for hero video; drop double shell border feel */
          .vc-profile-card {
            height: auto !important;
            min-height: 0 !important;
          }
          .vc-hero-heading {
            font-size: 30px !important;
            letter-spacing: -0.4px !important;
            line-height: 1.15 !important;
          }
          .vc-hero-body {
            font-size: 14px !important;
            max-width: none !important;
          }
          .vc-herotop {
            flex-direction: column !important;
            gap: 14px !important;
            width: 100% !important;
          }
          .vc-hero-copy { flex: none !important; width: 100% !important; }
          /* Metric tiles: horizontal snap carousel (~3.5 tiles visible) */
          .vc-gaugecluster {
            flex: none !important;
            display: flex !important;
            flex-wrap: nowrap !important;
            gap: 10px !important;
            align-items: stretch !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            scroll-snap-type: x mandatory !important;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding-bottom: 2px;
          }
          .vc-gaugecluster::-webkit-scrollbar { display: none; }
          .vc-gauge-tile {
            flex: 0 0 calc((100% - 20px) / 3.5) !important;
            min-width: 96px !important;
            max-width: 120px !important;
            scroll-snap-align: start !important;
          }
          .vc-journey-graph-card {
            border-radius: 14px !important;
          }
          .vc-journey-legend {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            column-gap: 12px !important;
            row-gap: 10px !important;
            align-items: start !important;
          }
          .vc-journey-legend-item {
            display: flex !important;
            min-height: 22px;
          }
          .vc-journey-range-btn,
          .vc-journey-nav-btn {
            min-height: 44px !important;
            min-width: 44px !important;
          }
        }
        @media (prefers-reduced-motion: reduce){ .vc-edge-active{animation:none;opacity:1} .vc-shimmer{animation:none !important} * {transition:none !important} }
      `}</style>
      <div style={{ width: "100%", margin: "0 auto", maxWidth: "100%", boxSizing: "border-box" }}>
        <div className="vc-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}><span style={{ color: C.orange }}>Via</span><span style={{ color: C.text }}>Connect</span><span style={{ ...eyebrow, marginLeft: 12 }}>Your Journey</span></div>
          <div style={{ display: "flex", gap: 12, color: C.muted }}><Search size={18} strokeWidth={SW} /><Bell size={18} strokeWidth={SW} /></div>
        </div>

        <Hero
          pillarValues={pillarValues}
          userId={userId}
          overallScore={bioDashScore}
          bioTier={bioDashTier}
          displayName={displayNameSafe}
          initial={initial}
          avatarUrl={avatarUrl}
          goalPhrase={goalPhrase}
          lastSyncLabel={lastSyncLabel}
          gaugesLoading={shouldShowSkeleton(bos7DLoading || dailyScores.loading, dailyScores.sleepQuality ?? dailyScores.energyLevel ?? dailyScores.nutrition)}
        />

        <div className="vc-page-sections" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <section>
            <div className="vc-section-label" style={{ ...eyebrow, marginBottom: 12 }}>Goals, nutrition and sleep</div>
            <div className="vc-goalrow">
              <GoalCard
                goalLabel={goalLabel}
                narrative={goalNarrative}
                progressPct={progressPct}
                baselineLabel={baselineLabel}
                nowLabel={nowLabel}
                targetLabel={targetLabelStr}
                loading={shouldShowSkeleton(activeBodyGoalLoading, activeGoal)}
              />
              <NutritionCard
                carbsG={combinedMacros.carbsG}
                proteinG={combinedMacros.proteinG}
                fatG={combinedMacros.fatG}
                kcalTop={kcalResult.value}
                kcalBot={kcalResult.label}
                carbsLabel={carbsLabel}
                proteinLabel={proteinLabel}
                fatLabel={fatLabel}
                loading={shouldShowSkeleton(todayMealLogs.loading || todayMacrosLoading, macrosEverLoadedRef.current ? true : null)}
              />
              <SleepCard sleepHoursTotal={todayStats.sleepHours} loading={shouldShowSkeleton(todayStats.loading, todayStats.sleepHours)} />
            </div>
            <div style={{ marginTop: 14 }}>
              <BodyCompTrio
                leanMassLabel={leanMassLabel}
                leanMassDelta={muscleDelta}
                leanMassSeries={leanMassSeries}
                bodyFatLabel={bodyFatLabel}
                bodyFatDelta={bodyFatDelta}
                bodyFatSeries={bodyFatSeries}
                energyBalanceRead={energyBalanceRead}
                loading={shouldShowSkeleton(metabolicVitals.loading, latestMuscleLbs ?? latestBodyFatPct)}
              />
            </div>
          </section>
          <section>
            <div className="vc-section-label" style={{ ...eyebrow, marginBottom: 12 }}>Today and this week</div>
            <TodayTab
              hydrationValue={hydrationValue}
              hydrationSub={hydrationSub}
              hydrationPct={hydrationBarPct}
              vitals={vitals}
              hannahGreeting={hannahInsight.greeting}
              hannahAnalysis={hannahInsight.analysis}
              hannahRecommendation={hannahInsight.recommendation}
              hannahFocusArea={hannahInsight.focusArea}
              hannahEstimatedImpact={hannahInsight.estimatedImpact}
              stepsValue={stepsValue}
              stepsSub={stepsSub}
              stepsBarPct={stepsBarPct}
              exerciseValue={exerciseValue}
              exerciseSub={exerciseSub}
              exerciseBarPct={exerciseBarPct}
              sleepValue={sleepValue}
              sleepSub={sleepSub}
              sleepBarPct={sleepBarPct}
              statBarsLoading={shouldShowSkeleton(todayStats.loading, todayStats.stepsCount ?? todayStats.exerciseMinutes ?? todayStats.sleepHours)}
              vitalsLoading={shouldShowSkeleton(metabolicVitals.loading, metabolicVitals.hrv ?? metabolicVitals.restingHr ?? metabolicVitals.respiratory ?? metabolicVitals.bloodOxygen)}
              hannahLoading={shouldShowSkeleton(bos7DLoading, bos7D ?? null)}
            />
          </section>
          <section>
            <AcceleratorsTab accel={accelItems} activeHubs={activeHubs} narrativeLine={narrativeLine} loading={shouldShowSkeleton(engineAccel.loading, engineAccel.items.length > 0 ? true : null)} />
          </section>
        </div>

        <p style={{ fontSize: 11, color: C.muted, marginTop: 18, lineHeight: 1.5 }}>For education and structure-function support only, not a diagnosis or treatment. Avatar and figures are placeholders. The user's real photo would sit in the profile card. Pillar colors shown here would map to your canonical dashboard Daily Scores colors.</p>
      </div>
    </div>
  );
}
