'use client';
/* =============================================================================
   PlasmaGauge: ViaConnect 3D "Plasma Core" gauge with 12 metallic finishes.
   Prompt 182b (2026-06-09).
   ----------------------------------------------------------------------------
   Source of truth is the canonical reference paste in prompt 182b. Ported into
   the repo with two project specific additions: the fiber metric (per Daily
   Macros which has a 4th ring on the live page) and explicit pause gating via
   .pg-paused so the IntersectionObserver does not have to re mount the
   animation when the gauge scrolls off screen.

   SSR safety: this file is a Client Component ('use client'). All browser
   APIs (matchMedia, IntersectionObserver) read inside useEffect. Keyframes
   live in plasma-gauge.css (imported, not injected at runtime). Initial
   render shows the final value so server and client first paint match; the
   count up plays once after first inView fires.

   SVG ids are derived from useId() so up to a few dozen gauges on one screen
   (Daily Scores + Daily Macros + Today's Meals on a single My Nutrition
   render) cannot collide on <defs>.
   ============================================================================= */

import { useEffect, useId, useRef, useState } from 'react';
import './plasma-gauge.css';

export type GaugeMetric =
  | 'bioscore' | 'sleep' | 'energy' | 'mood' | 'nutrition' | 'activity'
  | 'wellness' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'mealscore'
  | 'plasmateal';

// Re-exported aliases so existing call sites that imported PlasmaMetric /
// PlasmaFinish / PlasmaVariant from the prior 182 build keep compiling.
export type PlasmaMetric = GaugeMetric;
export type PlasmaVariant = GaugeVariant;
export type PlasmaFinish = MetalFinish;

export type GaugeVariant = 'hero' | 'standard' | 'compact';
export type MetalFinish =
  | 'gold' | 'rose-gold' | 'champagne' | 'copper' | 'bronze' | 'platinum'
  | 'chrome' | 'gunmetal' | 'emerald' | 'sapphire' | 'amethyst' | 'ruby';

interface MetricColor { c: string; bright: string; deep: string; glow: string; }

// ViaConnect anchored per metric palette. Brand teal #2DA5A0 + brand orange
// #B75E18 carry the platform; remaining metrics take distinct hues so up to
// six gauges read apart on one screen. Reused hues (teal / orange / gold)
// never share a screen.
//
// Prompt 182 Revision 1 added fiber (amethyst violet) because the live
// DailyMacroRings renders four macros, not three. The reference paste
// omitted fiber; this port restores it so the fiber ring in Daily Macros
// keeps its plasma treatment instead of falling back to a flat ring.
export const METRIC_COLORS: Record<GaugeMetric, MetricColor> = {
  bioscore:  { c: '#2DA5A0', bright: '#5FD3CE', deep: '#1B7E79', glow: 'rgba(45,165,160,.55)' },
  sleep:     { c: '#5B8DEF', bright: '#93B6FF', deep: '#2F5FD0', glow: 'rgba(91,141,239,.5)' },
  energy:    { c: '#B75E18', bright: '#F0A24E', deep: '#7E3F0E', glow: 'rgba(183,94,24,.5)' },
  mood:      { c: '#8B7FE8', bright: '#B7AEF5', deep: '#5C4FC0', glow: 'rgba(139,127,232,.5)' },
  nutrition: { c: '#3FB46B', bright: '#79D89C', deep: '#228048', glow: 'rgba(63,180,107,.5)' },
  activity:  { c: '#F0568C', bright: '#FF92B5', deep: '#C32E66', glow: 'rgba(240,86,140,.5)' },
  wellness:  { c: '#E7B45A', bright: '#F6DCA0', deep: '#B9842C', glow: 'rgba(231,180,90,.55)' },
  protein:   { c: '#2DA5A0', bright: '#5FD3CE', deep: '#1B7E79', glow: 'rgba(45,165,160,.5)' },
  carbs:     { c: '#B75E18', bright: '#F0A24E', deep: '#7E3F0E', glow: 'rgba(183,94,24,.5)' },
  fat:       { c: '#E7B45A', bright: '#F6DCA0', deep: '#B9842C', glow: 'rgba(231,180,90,.5)' },
  fiber:     { c: '#9D6BD5', bright: '#C29DEC', deep: '#6B3FA0', glow: 'rgba(157,107,213,.5)' },
  mealscore: { c: '#3FB46B', bright: '#79D89C', deep: '#228048', glow: 'rgba(63,180,107,.5)' },
  // Prompt 183a (2026-06-11): a single brand teal finish used ONLY at the four
  // My Nutrition hub gauge call sites so the hub triad reads as one teal family.
  // Distinct from nutrition (green) which the Dashboard and body-tracker gauges
  // keep. Color config only, not a new gauge.
  plasmateal:{ c: '#2DA5A0', bright: '#7fd6d2', deep: '#1c6f6c', glow: 'rgba(45,165,160,0.55)' },
};

interface Material { id: MetalFinish; name: string; dark: string; mid: string; bright: string; hi: string; glow: string; }

// 12 metallic finishes (warm, cool, jewel) from the canonical reference.
export const MATERIALS: Material[] = [
  { id: 'gold',      name: 'Gold',         dark: '#5a3f16', mid: '#c79433', bright: '#e9c46a', hi: '#fff6dc', glow: 'rgba(255,206,120,.6)' },
  { id: 'rose-gold', name: 'Rose Gold',    dark: '#5a2f30', mid: '#b07069', bright: '#e0a59c', hi: '#fff1ec', glow: 'rgba(255,180,165,.55)' },
  { id: 'champagne', name: 'Champagne',    dark: '#6e5f38', mid: '#bda86e', bright: '#e3d199', hi: '#fffaf0', glow: 'rgba(240,225,180,.5)' },
  { id: 'copper',    name: 'Copper',       dark: '#5a2e16', mid: '#aa5e30', bright: '#d6824a', hi: '#ffe0c2', glow: 'rgba(255,150,90,.5)' },
  { id: 'bronze',    name: 'Bronze',       dark: '#463418', mid: '#8a6532', bright: '#b88a4a', hi: '#f0d8a8', glow: 'rgba(210,165,95,.5)' },
  { id: 'platinum',  name: 'Platinum',     dark: '#5c6373', mid: '#9aa6ba', bright: '#c8d2e0', hi: '#ffffff', glow: 'rgba(225,235,250,.55)' },
  { id: 'chrome',    name: 'Chrome Steel', dark: '#363f52', mid: '#7f8ca3', bright: '#aeb8cc', hi: '#ffffff', glow: 'rgba(170,195,235,.5)' },
  { id: 'gunmetal',  name: 'Gunmetal',     dark: '#252b36', mid: '#5c6675', bright: '#8b97aa', hi: '#e7edf6', glow: 'rgba(150,165,190,.45)' },
  { id: 'emerald',   name: 'Emerald',      dark: '#0f3d2e', mid: '#1f8a5b', bright: '#46c98a', hi: '#e3fbef', glow: 'rgba(70,200,140,.5)' },
  { id: 'sapphire',  name: 'Sapphire',     dark: '#16306e', mid: '#2f6fd6', bright: '#5fa0ff', hi: '#e6f1ff', glow: 'rgba(95,160,255,.5)' },
  { id: 'amethyst',  name: 'Amethyst',     dark: '#3a1f5e', mid: '#7a47c2', bright: '#b083f0', hi: '#f3e9ff', glow: 'rgba(176,131,240,.5)' },
  { id: 'ruby',      name: 'Ruby',         dark: '#5a161f', mid: '#c0303f', bright: '#f0606f', hi: '#ffe3e5', glow: 'rgba(240,96,111,.5)' },
];
const MAT_BY_ID: Record<string, Material> = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));

// Optional "metallic + color coded" mapping. Default ships with finish=null
// (per metric color). Surface a single config / theme switch to apply
// METRIC_FINISH app wide without touching call sites.
export const METRIC_FINISH: Record<GaugeMetric, MetalFinish> = {
  bioscore: 'emerald', sleep: 'sapphire', energy: 'gold', mood: 'amethyst',
  nutrition: 'emerald', activity: 'rose-gold', wellness: 'champagne',
  protein: 'emerald', carbs: 'gold', fat: 'champagne', fiber: 'amethyst',
  mealscore: 'emerald',
  // Prompt 183a (2026-06-11): the teal hub metric keeps the same reference
  // finish as nutrition; the type carries no null member, and the hub call
  // sites use the default per metric color (finish null) regardless.
  plasmateal: 'emerald',
};

// Arc geometry: 270 degree open bottom, 0 degrees at top, clockwise.
// Prompt 182g (2026-06-09): exported so the True 3D family (orbit /
// gyro / coin / helix) can compute its own arc paths against the same
// open bottom geometry without re implementing the trig.
export const GAP = 135, SWEEP = 270;
export const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = (deg - 90) * Math.PI / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
export const arcPath = (cx: number, cy: number, r: number, p0: number, p1: number): string => {
  const a0 = GAP + SWEEP * p0, a1 = GAP + SWEEP * p1;
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = (a1 - a0) > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};
const metalConic = (m: Material): string =>
  `conic-gradient(from -45deg, ${m.dark}, ${m.bright} 10%, ${m.mid} 21%, ${m.hi} 33%, ${m.dark} 45%, ${m.bright} 57%, ${m.dark} 69%, ${m.hi} 83%, ${m.mid} 92%, ${m.dark})`;

// SSR safe hooks. Every browser API is wrapped in useEffect so the server
// never references window or document.
function useInView(ref: React.RefObject<HTMLElement>): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => setSeen(e.isIntersecting)),
      { rootMargin: '120px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return seen;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

// Count up from 0 to value on first inView fire. Initial state = value so
// SSR matches the first client render. The animation fires once via a ref
// gate so re entry to viewport does not replay it.
// Prompt 182g (2026-06-09): exported so non Plasma gauge variants (the
// True 3D family etc) can reuse the same entrance animation.
export function useCountUp(value: number, run: boolean, dur = 1400): number {
  const [n, setN] = useState(value);
  const ranRef = useRef(false);
  useEffect(() => {
    if (!run) {
      setN(value);
      return;
    }
    if (ranRef.current) {
      setN(value);
      return;
    }
    ranRef.current = true;
    let raf = 0, t0 = 0;
    const ease = (x: number) => 1 - Math.pow(1 - x, 3);
    const tick = (t: number) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / dur);
      setN(Math.round(value * ease(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, run, dur]);
  return n;
}

export interface PlasmaGaugeProps {
  value: number;
  metric: GaugeMetric;
  finish?: MetalFinish | null;
  size?: number;
  variant?: GaugeVariant;
  max?: number;
  unit?: string;
  animated?: boolean;
  showUnit?: boolean;
  // Optional aria label override; default reads the metric and value.
  ariaLabel?: string;
  // Visual pass (Gary 2026-06-09): when a metal finish is set, the track
  // defaults to a dark gutter and the number to a metallic gradient (the
  // gauge gallery look). These opt the track and the number back to the
  // flat-gauge treatment (faint grey track, white number) so a metal gauge
  // sits consistently beside non-metal gauges in the same row while keeping
  // its metallic progress arc and orb. Both default false to preserve the
  // gallery rendering.
  subtleTrack?: boolean;
  plainNumber?: boolean;
  // Prompt 183a (2026-06-11): both default-preserving. When omitted the gauge
  // renders byte-identical to before.
  // caption: when set, renders as the center sub-label beneath the value IN
  // PLACE OF the `of {max}` / `/ {max}` sublabel, same element and size, but
  // uppercased.
  caption?: string;
  // valueFontPx: when set, overrides the center value font size (px) instead of
  // the default size * 0.27.
  valueFontPx?: number;
  // valueSuffix: when set, renders immediately after the center value number
  // (e.g. a percent sign) so the value reads like "22%". Omitted = no suffix.
  valueSuffix?: string;
}

export function PlasmaGauge({
  value, metric, finish = null, size = 200, variant = 'standard',
  max = 100, unit, animated = true, showUnit = true, ariaLabel,
  subtleTrack = false, plainNumber = false, caption, valueFontPx, valueSuffix,
}: PlasmaGaugeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_]/g, '_');
  const inView = useInView(ref);
  const reduced = useReducedMotion();
  const compact = variant === 'compact';
  // Prompt 182m (2026-06-09): every variant (hero, standard, compact)
  // gets the orb pulse and the clockwise ring bead now. The earlier
  // 182c "minis render static" rule is superseded by 182b which
  // explicitly calls for compact to keep the pulse + bead because the
  // bead replaces the removed orbiting sparks. The rotating bezel
  // sheen is still trimmed in compact for performance via the
  // separate {!compact && ...} gate below.
  const anim = animated && inView && !reduced;
  const n = useCountUp(Math.round(value), animated && inView);
  const p = Math.max(0.0001, Math.min(1, value / (max || 100)));

  const M = finish ? MAT_BY_ID[finish] ?? null : null;
  const metal = !!M;
  const mc = METRIC_COLORS[metric] || METRIC_COLORS.bioscore;
  const C  = metal ? (M as Material).bright : mc.c;
  const CB = metal ? (M as Material).hi     : mc.bright;
  const GLOW = metal ? (M as Material).glow  : mc.glow;
  const progStops = metal
    ? [(M as Material).dark, (M as Material).bright, (M as Material).hi, (M as Material).mid]
    : [mc.deep, mc.c, mc.bright];
  const numberGradient = metal
    ? `linear-gradient(180deg, ${(M as Material).hi}, ${(M as Material).bright} 52%, ${(M as Material).mid})`
    : '';
  const coreBg = metal
    ? `radial-gradient(circle at 50% 55%, #fff 0%, ${(M as Material).hi} 18%, ${(M as Material).bright} 42%, ${(M as Material).mid} 60%, transparent 74%)`
    : `radial-gradient(circle at 50% 55%, #fff 0%, ${CB} 22%, ${C} 48%, transparent 72%)`;

  const cx = 100, cy = 100, R = 78, sw = compact ? 7 : 9;
  const trackD = arcPath(cx, cy, R, 0, 1);
  const progD = arcPath(cx, cy, R, 0, p);

  // Prompt 182m (2026-06-09): orbiting sparks (formerly three dots on
  // tilted preserve 3d planes spinning at 4 / 5 / 6 seconds) are
  // removed entirely. The only motion inside the plasma orb is now
  // the pulse; the clockwise ring bead carries all motion on the
  // ring stroke.

  const fontDisplay = "var(--font-instrument-sans), 'Instrument Sans', system-ui, sans-serif";
  const sublabel = unit ? `of ${max} ${unit}` : `/ ${max}`;
  const a11yLabel = ariaLabel
    ? ariaLabel
    : unit
      ? `${metric} ${Math.round(value)} of ${max} ${unit}`
      : `${metric} ${Math.round(value)} of ${max}`;

  return (
    <div
      ref={ref}
      className={`g-root ${anim ? 'g-anim' : ''}`}
      style={{ width: size, height: size, position: 'relative', perspective: `${600 * size / 200}px` }}
      role="img"
      aria-label={a11yLabel}
    >
      {/* gauge well: localized darkening so the orb keeps 3D depth on the lighter navy card */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, borderRadius: '50%', zIndex: 0,
        background: 'radial-gradient(circle at 50% 46%, rgba(10,18,38,0.85), transparent 70%)',
      }} />
      {/* ambient bloom: blurred accent halo behind the orb */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: '14%', borderRadius: '50%', zIndex: 1,
        background: `radial-gradient(circle, ${GLOW} 0%, transparent 68%)`,
        filter: 'blur(16px)', opacity: 0.55,
      }} />

      {/* progress ring */}
      <svg
        aria-hidden="true"
        className="pg-ring"
        viewBox="0 0 200 200"
        width={size}
        height={size}
        style={{ position: 'absolute', inset: 0, zIndex: 5 }}
      >
        <defs>
          <linearGradient id={`pg-${uid}`} x1="12%" y1="0%" x2="88%" y2="100%">
            {progStops.map((c, i) => (
              <stop key={i} offset={`${(i / (progStops.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </linearGradient>
        </defs>
        <path
          d={trackD}
          fill="none"
          stroke={metal && !subtleTrack ? '#05070c' : 'rgba(255,255,255,.08)'}
          strokeWidth={metal && !subtleTrack ? sw + 3 : sw}
          strokeLinecap="round"
        />
        <path
          d={progD}
          fill="none"
          stroke={`url(#pg-${uid})`}
          strokeWidth={sw}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${GLOW})` }}
        />
        {metal && (
          <path
            d={progD}
            fill="none"
            stroke="rgba(255,255,255,.7)"
            strokeWidth={sw * 0.32}
            strokeLinecap="round"
            transform="translate(0,-1.8)"
            opacity={0.55}
          />
        )}
        {/* Prompt 182n (2026-06-09): clockwise bead that travels ONLY
            along the colored progress arc. Fades in just after the
            start of the colored arc, holds visible across the middle,
            fades out as it nears the end, and reappears at the start
            on the next cycle. Driven by the .g-bead-cw class which
            binds the g-bead-cw keyframe (combined dashoffset slide +
            opacity envelope, paused by default, runs when the root
            has .g-anim). Tight dash + screen blend + accent glow so
            the bead reads as a defined moving object rather than a
            faint shimmer. arcPath draws progD clockwise from the
            4:30 start, so the bead sweeps 12, 3, 6 on a clock face. */}
        <path
          className="g-bead-cw"
          d={progD}
          fill="none"
          stroke="#fff"
          strokeWidth={Math.max(2.2, sw * 0.6)}
          strokeLinecap="round"
          pathLength={100}
          style={{
            strokeDasharray: '4 96',
            mixBlendMode: 'screen',
            filter: `drop-shadow(0 0 ${Math.round(size * 0.03)}px ${GLOW})`,
          }}
        />
      </svg>

      {/* metallic bezel + rotating sheen (non compact only) */}
      {metal && (
        <>
          <div aria-hidden="true" style={{
            position: 'absolute', inset: '20%', borderRadius: '50%', zIndex: 6,
            background: metalConic(M as Material),
            WebkitMaskImage: 'radial-gradient(circle, transparent 0 82%, #000 84% 100%)',
            maskImage: 'radial-gradient(circle, transparent 0 82%, #000 84% 100%)',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.4)',
          }} />
          {!compact && (
            <div aria-hidden="true" className="g-sheen-rg" style={{
              position: 'absolute', inset: '20%', borderRadius: '50%', zIndex: 6,
              background: 'conic-gradient(from 0deg, transparent 0 18%, rgba(255,255,255,.9) 26%, transparent 34% 72%, rgba(255,255,255,.5) 80%, transparent 88%)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 0 83%, #000 85% 100%)',
              maskImage: 'radial-gradient(circle, transparent 0 83%, #000 85% 100%)',
              mixBlendMode: 'screen', opacity: 0.55,
            }} />
          )}
        </>
      )}

      {/* glass orb + pulsing core */}
      <div
        aria-hidden="true"
        className="pg-orb"
        style={{
          position: 'absolute', inset: '24%', borderRadius: '50%', zIndex: 6, overflow: 'hidden',
          background: 'radial-gradient(circle at 38% 30%, rgba(255,255,255,.16), rgba(255,255,255,.02) 45%, rgba(0,0,0,.35))',
          border: metal ? `1px solid ${(M as Material).hi}44` : '1px solid rgba(255,255,255,.22)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          boxShadow: 'inset 0 2px 6px rgba(255,255,255,.3), inset 0 -10px 20px rgba(0,0,0,.5)',
        }}
      >
        {/* pulsing molten core (g-core; paused by default, runs only
            when root has .g-anim, which means hero or standard + in
            view + reduced motion not set). */}
        <div
          className="g-core"
          style={{
            position: 'absolute', inset: '12%', borderRadius: '50%',
            background: coreBg,
            filter: 'blur(2px)',
          }}
        />
        {/* second smaller highlight pulsing out of phase, screen blended */}
        <div
          className="g-core-hi"
          style={{
            position: 'absolute', inset: '26%', borderRadius: '50%',
            mixBlendMode: 'screen',
            background: `radial-gradient(circle, #fff 0%, ${CB} 50%, transparent 75%)`,
          }}
        />
      </div>

      {/* Prompt 182m (2026-06-09): the orbiting spark planes (three
          dots on tilted preserve 3d planes driven by g-spark-1 /
          g-spark-2 / g-spark-3) are removed. The only motion inside
          the plasma orb is the pulse. The clockwise ring bead above
          carries every other piece of motion. */}

      {/* value readout */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 30,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: fontDisplay,
          fontWeight: 700,
          fontSize: valueFontPx ?? size * 0.27,
          lineHeight: 0.9,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
          ...((metal && !plainNumber)
            ? {
                background: numberGradient,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
                filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.6))',
              }
            : {
                color: '#fff',
                textShadow: `0 2px 12px rgba(0,0,0,.6), 0 0 22px ${GLOW}`,
              }),
        }}>{n}{valueSuffix ?? ''}</div>
        {caption !== undefined ? (
          // Prompt 183a (2026-06-11): caption replaces the of/max sublabel,
          // same element, size, and position, uppercased, muted token.
          <div style={{
            fontFamily: fontDisplay,
            fontWeight: 600,
            fontSize: size * 0.07,
            color: (metal && !plainNumber) ? `${(M as Material).hi}99` : 'rgba(255,255,255,.6)',
            letterSpacing: 0.5,
            marginTop: size * 0.012,
            textTransform: 'uppercase',
          }}>{caption}</div>
        ) : showUnit ? (
          <div style={{
            fontFamily: fontDisplay,
            fontWeight: 600,
            fontSize: size * 0.07,
            color: (metal && !plainNumber) ? `${(M as Material).hi}99` : 'rgba(255,255,255,.6)',
            letterSpacing: 0.5,
            marginTop: size * 0.012,
          }}>{sublabel}</div>
        ) : null}
      </div>
    </div>
  );
}

export default PlasmaGauge;
