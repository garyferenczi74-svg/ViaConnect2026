'use client';

// Prompt 182 (2026-06-09): the single 3D "Plasma Core" gauge that
// replaces every flat ring on the ViaConnect consumer surfaces.
//
// One gauge powers six surfaces: BOS hero, Daily Scores grid, Quick
// Log meal-quality rings, Nutrition Score, Daily Macros (protein,
// carbs, fat, fiber), Today's Meals. Existing wrappers (BOSScoreGauge,
// DailyScoreGauge, QualityScoreRing, NutritionScoreCircleGauge,
// DailyMacroRings) delegate to this component so callers do not move.
//
// Layer stack back to front:
//   z 0: gauge well (radial dark to keep 3D depth on the lighter card)
//   z 1: ambient bloom (accent radial)
//   z 2: metallic bezel (finish prop only, hidden in compact)
//   z 3: progress ring SVG (track + filled arc + glow + glint)
//   z 4: glass orb (inset 24%, translucent radial fill)
//   z 5: pulsing core + screen blended highlight
//   z 6: orbiting sparks (3 in standard / hero, 1 in compact, 0 if no room)
//   z 7: value readout (number + sublabel)
//
// Geometry is derived from a single size prop on a 200 x 200 viewBox.
// Continuous motion pauses off screen and under prefers-reduced-motion;
// the count-up resolves to value either way so print / export render
// the final filled gauge. SVG defs ids derive from useId so up to a
// few dozen instances on one screen never collide.

import { useEffect, useId, useMemo, useRef, useState } from 'react';

// --------------------------------------------------------------------------
// Tokens
// --------------------------------------------------------------------------

export type PlasmaMetric =
  | 'bioscore'
  | 'sleep'
  | 'energy'
  | 'mood'
  | 'nutrition'
  | 'activity'
  | 'wellness'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'fiber'
  | 'mealscore';

export type PlasmaFinish =
  | 'gold'
  | 'rose-gold'
  | 'champagne'
  | 'copper'
  | 'bronze'
  | 'platinum'
  | 'chrome'
  | 'gunmetal'
  | 'emerald'
  | 'sapphire'
  | 'amethyst'
  | 'ruby';

export type PlasmaVariant = 'hero' | 'standard' | 'compact';

interface MetricPalette {
  c: string;
  bright: string;
  deep: string;
  glow: string;
}

const METRIC_COLORS: Record<PlasmaMetric, MetricPalette> = {
  bioscore: { c: '#2DA5A0', bright: '#5FD3CE', deep: '#1B7E79', glow: 'rgba(45,165,160,0.55)' },
  sleep:    { c: '#5B8DEF', bright: '#93B6FF', deep: '#2F5FD0', glow: 'rgba(91,141,239,0.5)' },
  energy:   { c: '#B75E18', bright: '#F0A24E', deep: '#7E3F0E', glow: 'rgba(183,94,24,0.5)' },
  mood:     { c: '#8B7FE8', bright: '#B7AEF5', deep: '#5C4FC0', glow: 'rgba(139,127,232,0.5)' },
  nutrition:{ c: '#3FB46B', bright: '#79D89C', deep: '#228048', glow: 'rgba(63,180,107,0.5)' },
  activity: { c: '#F0568C', bright: '#FF92B5', deep: '#C32E66', glow: 'rgba(240,86,140,0.5)' },
  wellness: { c: '#E7B45A', bright: '#F6DCA0', deep: '#B9842C', glow: 'rgba(231,180,90,0.55)' },
  protein:  { c: '#2DA5A0', bright: '#5FD3CE', deep: '#1B7E79', glow: 'rgba(45,165,160,0.5)' },
  carbs:    { c: '#B75E18', bright: '#F0A24E', deep: '#7E3F0E', glow: 'rgba(183,94,24,0.5)' },
  fat:      { c: '#E7B45A', bright: '#F6DCA0', deep: '#B9842C', glow: 'rgba(231,180,90,0.5)' },
  fiber:    { c: '#9D6BD5', bright: '#C29DEC', deep: '#6B3FA0', glow: 'rgba(157,107,213,0.5)' },
  mealscore:{ c: '#3FB46B', bright: '#79D89C', deep: '#228048', glow: 'rgba(63,180,107,0.5)' },
};

interface MaterialPalette {
  dark: string;
  mid: string;
  bright: string;
  hi: string;
  glow: string;
}

const MATERIALS: Record<PlasmaFinish, MaterialPalette> = {
  gold:        { dark: '#7A5A14', mid: '#B58A2C', bright: '#E7B45A', hi: '#F6DCA0', glow: 'rgba(231,180,90,0.55)' },
  'rose-gold': { dark: '#7A3A38', mid: '#B66B66', bright: '#E69992', hi: '#F4C2BC', glow: 'rgba(230,153,146,0.5)' },
  champagne:   { dark: '#7A6A4A', mid: '#B5A37E', bright: '#E2CFA3', hi: '#F2E6C9', glow: 'rgba(226,207,163,0.5)' },
  copper:      { dark: '#6E3010', mid: '#A65522', bright: '#D17F3B', hi: '#EFA968', glow: 'rgba(209,127,59,0.5)' },
  bronze:      { dark: '#4A2E14', mid: '#8B5E2A', bright: '#B58146', hi: '#D7A66D', glow: 'rgba(181,129,70,0.5)' },
  platinum:    { dark: '#404550', mid: '#8E96A6', bright: '#C8CFDB', hi: '#E8EBF1', glow: 'rgba(200,207,219,0.5)' },
  chrome:      { dark: '#2C3138', mid: '#6F7682', bright: '#B9C0CC', hi: '#E2E5EB', glow: 'rgba(185,192,204,0.5)' },
  gunmetal:    { dark: '#1A1F26', mid: '#3D434C', bright: '#6A7280', hi: '#9099A6', glow: 'rgba(106,114,128,0.5)' },
  emerald:     { dark: '#0E4A36', mid: '#1E8D63', bright: '#3FC58A', hi: '#7DE3B0', glow: 'rgba(63,197,138,0.55)' },
  sapphire:    { dark: '#0E2D6E', mid: '#1F50B5', bright: '#4577E0', hi: '#8AA8F1', glow: 'rgba(69,119,224,0.55)' },
  amethyst:    { dark: '#3A1B6A', mid: '#683BB5', bright: '#9B68E2', hi: '#C49BF1', glow: 'rgba(155,104,226,0.55)' },
  ruby:        { dark: '#5A0F22', mid: '#A6233F', bright: '#D9466A', hi: '#EE869C', glow: 'rgba(217,70,106,0.55)' },
};

// Prompt 182a (2026-06-09): convert a hex token to rgba with explicit
// alpha. Used to fade the molten core to transparent at its outer
// rim so the glass orb's inset shadow stays visible. Accepts #RGB and
// #RRGGBB; falls back to the hex untouched on any other shape so the
// browser still parses it.
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const expand = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (expand.length !== 6) return hex;
  const r = parseInt(expand.slice(0, 2), 16);
  const g = parseInt(expand.slice(2, 4), 16);
  const b = parseInt(expand.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Optional all metal map. Exported so a theme switch can flip the app
// to metallic without per call site edits. NOT applied by default.
export const METRIC_FINISH: Record<PlasmaMetric, PlasmaFinish> = {
  bioscore: 'emerald',
  sleep: 'sapphire',
  energy: 'gold',
  mood: 'amethyst',
  nutrition: 'emerald',
  activity: 'rose-gold',
  wellness: 'champagne',
  protein: 'emerald',
  carbs: 'gold',
  fat: 'champagne',
  fiber: 'amethyst',
  mealscore: 'emerald',
};

// --------------------------------------------------------------------------
// Geometry
// --------------------------------------------------------------------------

const VIEWBOX = 200;
const CENTER = VIEWBOX / 2;
const RADIUS = 78;
const CIRC = 2 * Math.PI * RADIUS;
const SWEEP_DEG = 270;
const ARC_LEN = CIRC * (SWEEP_DEG / 360);
// 270 degree open bottom: gap centered at 6 o'clock. Rotating the
// circle by 135 degrees clockwise places the dash start at 7:30 and
// the gap at 6 o'clock.
const ROTATE = 135;

// --------------------------------------------------------------------------
// Count up hook. RAF, ease out cubic, ~1.4s. Resolves to value on
// mount when animated=false so static frames render the filled state.
// --------------------------------------------------------------------------

function useCountUp(target: number, enabled: boolean, durationMs = 1400): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  const hasRunRef = useRef(false);
  useEffect(() => {
    if (!enabled) {
      setValue(target);
      hasRunRef.current = true;
      return;
    }
    if (hasRunRef.current) {
      setValue(target);
      return;
    }
    hasRunRef.current = true;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, durationMs]);
  return value;
}

// --------------------------------------------------------------------------
// Visibility hook. Returns true when the node is on screen. Animation
// gated by this AND by prefers-reduced-motion. When animated is false
// the gauge holds the final frame (no pre animation hidden state).
// --------------------------------------------------------------------------

function useOnScreen<T extends Element>(ref: React.RefObject<T>): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setVisible(entry.isIntersecting);
        }
      },
      { threshold: 0.05 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}

function usePrefersReducedMotion(): boolean {
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

// --------------------------------------------------------------------------
// PlasmaGauge
// --------------------------------------------------------------------------

export interface PlasmaGaugeProps {
  value: number;
  metric: PlasmaMetric;
  finish?: PlasmaFinish | null;
  size?: number;
  variant?: PlasmaVariant;
  max?: number;
  unit?: string;
  animated?: boolean;
  showUnit?: boolean;
  // Optional aria label override. The default reads the metric and
  // numeric value out for screen readers.
  ariaLabel?: string;
}

export function PlasmaGauge({
  value,
  metric,
  finish = null,
  size = 200,
  variant = 'standard',
  max = 100,
  unit,
  animated = true,
  showUnit = true,
  ariaLabel,
}: PlasmaGaugeProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const onScreen = useOnScreen(ref);
  const motionActive = animated && onScreen && !reduced;

  const target = Number.isFinite(value) && value > 0 ? value : 0;
  const cleanMax = Number.isFinite(max) && max > 0 ? max : 100;
  const fillFrac = Math.max(0, Math.min(1, target / cleanMax));

  // Number always lands on `target` regardless of motion state so the
  // final filled gauge renders for print + reduced motion.
  const displayValue = useCountUp(target, motionActive);

  const reactUid = useId();
  // Sanitize useId output for SVG ids (the React id starts with a
  // colon in dev).
  const safeUid = reactUid.replace(/[^a-zA-Z0-9_]/g, '_');
  const id = (suffix: string) => `pg_${safeUid}_${metric}_${finish ?? 'm'}_${suffix}`;

  const palette = METRIC_COLORS[metric];
  const material = finish ? MATERIALS[finish] : null;
  const strokeWidth = variant === 'compact' ? 7 : 9;

  // Glint dash pattern: 9 visible, 91 gap, repeating around the arc.
  // The dash animates via stroke-dashoffset (pg-glint keyframe).
  const glintEnabled = variant !== 'compact';
  const sheenEnabled = variant !== 'compact' && finish !== null;
  // Sparks: 3 in standard / hero, 1 in compact, 0 if the size is too
  // small to fit them comfortably.
  const sparkCount = variant === 'compact' ? (size >= 100 ? 1 : 0) : 3;

  // Number scale per spec: size * 0.27 for the number, size * 0.07 for
  // the sublabel. tabular-nums so the count up does not shift the
  // layout.
  const numberFontPx = Math.round(size * 0.27);
  const subFontPx = Math.max(10, Math.round(size * 0.07));
  const numberDisplay = Math.round(displayValue);
  const sublabel = unit
    ? `of ${Math.round(cleanMax)} ${unit}`
    : '/ 100';

  // Metal bezel built as a conic gradient masked to a thin band. The
  // gradient varies by material and the sheen overlay rotates on top.
  const metalConic = material
    ? `conic-gradient(from -90deg, ${material.dark} 0deg, ${material.mid} 60deg, ${material.bright} 110deg, ${material.hi} 140deg, ${material.bright} 200deg, ${material.mid} 280deg, ${material.dark} 360deg)`
    : null;

  // Ambient bloom + gauge well sizes scale with the gauge box.
  const wellStyle: React.CSSProperties = {
    background: `radial-gradient(circle at 50% 46%, rgba(10,18,38,0.85), transparent 70%)`,
  };
  const accentForGlow = material ? material.glow : palette.glow;
  // Prompt 182a (2026-06-09): bloom slightly stronger so the accent
  // halo reads against the #1E3054 card on every metric.
  const bloomStyle: React.CSSProperties = {
    background: `radial-gradient(circle at 50% 50%, ${accentForGlow}, transparent 65%)`,
    filter: `blur(${Math.round(size * 0.08)}px)`,
    opacity: 0.62,
  };
  const accentForRing = material ? material.bright : palette.c;
  const ringGlowStdDev = Math.round(size * 0.012);

  const numberStyle: React.CSSProperties = material
    ? {
        backgroundImage: `linear-gradient(180deg, ${material.hi}, ${material.bright} 52%, ${material.mid})`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
        fontWeight: 800,
        fontFamily: 'var(--font-instrument-sans), "Instrument Sans", system-ui, sans-serif',
        fontSize: `${numberFontPx}px`,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }
    : {
        color: '#ffffff',
        textShadow: `0 0 ${Math.round(size * 0.06)}px ${palette.glow}`,
        fontWeight: 800,
        fontFamily: 'var(--font-instrument-sans), "Instrument Sans", system-ui, sans-serif',
        fontSize: `${numberFontPx}px`,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      };

  const subStyle: React.CSSProperties = {
    fontFamily: 'var(--font-instrument-sans), "Instrument Sans", system-ui, sans-serif',
    fontWeight: 600,
    fontSize: `${subFontPx}px`,
    color: 'rgba(255,255,255,0.62)',
    marginTop: Math.round(size * 0.012),
  };

  // Sparks positioned on preserve 3d planes; the keyframes spin each.
  const sparks = useMemo(() => {
    const tilts = [62, 70, 78];
    const classes = ['pg-spark-1', 'pg-spark-2', 'pg-spark-3'];
    const out: Array<{ tilt: number; cls: string }> = [];
    for (let i = 0; i < sparkCount; i++) out.push({ tilt: tilts[i], cls: classes[i] });
    return out;
  }, [sparkCount]);

  const a11yLabel = ariaLabel
    ? ariaLabel
    : unit
      ? `${metric} ${Math.round(target)} of ${Math.round(cleanMax)} ${unit}`
      : `${metric} ${Math.round(target)} of 100`;

  return (
    <div
      ref={ref}
      className={`relative inline-flex items-center justify-center select-none ${motionActive ? '' : 'pg-paused'}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={a11yLabel}
    >
      {/* z 0: gauge well (radial darkening to keep 3D depth on the lighter card) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full" style={wellStyle} />

      {/* z 1: ambient bloom */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full" style={bloomStyle} />

      {/* z 2: metallic bezel (only when finish is set and not compact) */}
      {sheenEnabled && metalConic ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background: metalConic,
              WebkitMask: 'radial-gradient(circle at 50% 50%, transparent 82%, black 86%, black 100%)',
              mask: 'radial-gradient(circle at 50% 50%, transparent 82%, black 86%, black 100%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pg-sheen pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.55) 10deg, transparent 30deg, transparent 360deg)',
              mixBlendMode: 'screen',
              opacity: 0.55,
              WebkitMask: 'radial-gradient(circle at 50% 50%, transparent 82%, black 86%, black 100%)',
              mask: 'radial-gradient(circle at 50% 50%, transparent 82%, black 86%, black 100%)',
            }}
          />
        </>
      ) : null}

      {/* z 3: progress ring SVG */}
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        width={size}
        height={size}
        className="absolute inset-0"
      >
        <defs>
          <linearGradient id={id('arc')} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={material ? material.dark : palette.deep} />
            <stop offset="40%"  stopColor={material ? material.mid : palette.c} />
            <stop offset="75%"  stopColor={material ? material.bright : palette.bright} />
            <stop offset="100%" stopColor={material ? material.hi : palette.bright} />
          </linearGradient>
          <filter id={id('glow')} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={ringGlowStdDev} result="blur" />
            <feFlood floodColor={accentForGlow} />
            <feComposite in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${ARC_LEN} ${CIRC}`}
          transform={`rotate(${ROTATE} ${CENTER} ${CENTER})`}
        />
        {/* Filled arc */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={`url(#${id('arc')})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${ARC_LEN * fillFrac} ${CIRC}`}
          transform={`rotate(${ROTATE} ${CENTER} ${CENTER})`}
          filter={`url(#${id('glow')})`}
        />
        {/* Metallic highlight arc (offset up 1.8px). Only in finish mode. */}
        {material ? (
          <circle
            cx={CENTER}
            cy={CENTER - 1.8}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={Math.max(1, strokeWidth - 6)}
            strokeLinecap="round"
            strokeDasharray={`${ARC_LEN * fillFrac} ${CIRC}`}
            transform={`rotate(${ROTATE} ${CENTER} ${CENTER})`}
          />
        ) : null}
        {/* Glint (standard + hero only) */}
        {glintEnabled ? (
          <circle
            className="pg-glint"
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={Math.max(1, strokeWidth - 5)}
            strokeLinecap="round"
            strokeDasharray="9 91"
            transform={`rotate(${ROTATE} ${CENTER} ${CENTER})`}
            style={{ mixBlendMode: 'screen' }}
          />
        ) : null}
      </svg>

      {/* z 4: glass orb (inset 24%). Prompt 182a (2026-06-09): boosted
          the highlight + border opacities so the glass shell reads
          against the molten core and the gauge well behind it. The
          core lives INSIDE this div and fades to transparent at its
          outer rim so the orb's inset shadow ring is always visible
          regardless of the pulse phase. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full overflow-hidden"
        style={{
          inset: `${Math.round(size * 0.24)}px`,
          background:
            'radial-gradient(circle at 35% 28%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 32%, rgba(255,255,255,0.02) 62%, rgba(0,0,0,0.35) 100%)',
          border: '1px solid rgba(255,255,255,0.22)',
          boxShadow:
            'inset 0 3px 9px rgba(255,255,255,0.45), inset 0 -10px 22px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,0,0,0.20)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      >
        {/* z 5: pulsing molten core. Fades to transparent at 100% so
            the glass orb rim and its inset shadow show through the
            core's outer edge. The core sits inset 8% inside the orb
            so a permanent ring of glass is visible regardless of the
            pulse scale (0.94 to 1.06). */}
        <div
          aria-hidden="true"
          className="pg-core absolute"
          style={{
            inset: '8%',
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 48%, #ffffff 0%, ${palette.bright} 22%, ${palette.c} 50%, ${hexToRgba(palette.deep, 0.85)} 78%, ${hexToRgba(palette.deep, 0)} 100%)`,
            transformOrigin: 'center',
          }}
        />
        {/* Second smaller highlight pulsing out of phase, blended on
            screen so it glints across the white-hot crown without
            washing the metric color. */}
        <div
          aria-hidden="true"
          className="pg-core-hi absolute"
          style={{
            inset: '22%',
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 38%, rgba(255,255,255,0.90), rgba(255,255,255,0.0) 65%)`,
            mixBlendMode: 'screen',
            transformOrigin: 'center',
          }}
        />
      </div>

      {/* z 6: orbiting sparks. Prompt 182a (2026-06-09): boosted dot
          size + glow radius so the sparks actually read at the 120 to
          200 px gauge range. The dot is a white core with an accent
          colored halo so it sells as a glint of plasma rather than a
          static dot. */}
      {sparks.length > 0 ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ perspective: `${size * 2}px` }}
        >
          {sparks.map((spark, i) => {
            const dotSize = variant === 'compact'
              ? Math.max(4, Math.round(size * 0.030))
              : Math.max(7, Math.round(size * 0.048));
            const halfDot = dotSize / 2;
            const glow = variant === 'compact'
              ? Math.max(6, Math.round(size * 0.05))
              : Math.max(10, Math.round(size * 0.08));
            return (
              <div
                key={i}
                className={`${spark.cls} absolute inset-0`}
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `rotateX(${spark.tilt}deg)`,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: dotSize,
                    height: dotSize,
                    marginLeft: -halfDot,
                    marginTop: -halfDot,
                    background:
                      'radial-gradient(circle at 50% 50%, #ffffff 0%, #ffffff 35%, rgba(255,255,255,0.6) 60%, rgba(255,255,255,0) 100%)',
                    borderRadius: '50%',
                    boxShadow: `0 0 ${glow}px ${accentForGlow}, 0 0 ${Math.round(glow / 2)}px ${accentForGlow}`,
                    transform: `translateZ(${Math.round(size * 0.18)}px)`,
                  }}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {/* z 7: value readout */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span style={numberStyle}>{numberDisplay}</span>
        {showUnit ? <span style={subStyle}>{sublabel}</span> : null}
      </div>
    </div>
  );
}

export default PlasmaGauge;
