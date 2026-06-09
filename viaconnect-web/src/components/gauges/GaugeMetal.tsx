'use client';

// Prompt 182j (2026-06-09): Metallic and premium gauge family.
//
// Five prototype variants ported near verbatim from
// prototype/variants-metallic.jsx:
//
//   liquid-gold      gold bezel, material gradient progress arc (gold
//                    stops, not the metric palette), no ticks, no
//                    dome, no matte. metric=wellness.
//
//   brushed-chrome   chrome bezel, metric palette progress arc, no
//                    ticks, no dome, no matte. metric=sleep.
//
//   rose-gold        rose gold bezel, metric palette progress arc,
//                    tick marks every 10% around the dial.
//                    metric=mood.
//
//   obsidian-gold    matte black bezel (no conic metal, no sheen),
//                    gold material progress arc. The "stealth"
//                    variant. metric=energy.
//
//   platinum-dome    platinum bezel, metric palette progress arc,
//                    dome gloss highlight over the recessed dial.
//                    metric=nutrition.
//
// Composition (back to front):
//   1. Outer metal bezel (conic gradient, masked to ring shape).
//      Matte variant swaps to a radial black gradient.
//   2. Rim hairline (inset 0 0 0 1px black).
//   3. Rotating sheen overlay (g-sheen 7s). Skipped on matte and on
//      mini tiles.
//   4. Recessed inner dial (radial dark gradient with inset shadow).
//   5. Dome gloss (top left radial highlight). Only on platinum-dome.
//   6. SVG progress arc:
//        engraved track,
//        optional tick marks (rose-gold only),
//        shadow base offset down 1.1 px,
//        main gradient progress,
//        bevel highlight offset up 2.1 px,
//        travelling glint (g-glint 2.6s, screen blended, skipped on
//        mini and on matte).
//   7. Centered value text. The number uses background-clip:text with
//      the material gradient for liquid-gold and obsidian-gold; the
//      other variants use the metric palette.
//
// Animation classes consumed (all already in plasma-gauge.css):
// g-anim, g-sheen, g-glint.
// Helpers consumed from PlasmaGauge.tsx: useCountUp, arcPath, polar,
// GAP, SWEEP.

import { useId, type CSSProperties, type ReactNode } from 'react';
import {
  GAP,
  SWEEP,
  arcPath,
  polar,
  useCountUp,
  type GaugeMetric,
} from './PlasmaGauge';

export type MetalVariant =
  | 'liquid-gold'
  | 'brushed-chrome'
  | 'rose-gold'
  | 'obsidian-gold'
  | 'platinum-dome';

export interface GaugeMetalProps {
  value: number;
  size: number;
  metric: GaugeMetric;
  live: boolean;
  mini?: boolean;
  variant: MetalVariant;
}

// Material bezel conic gradients. Ported verbatim from the canonical
// reference; each one is a 10 stop conic that reads as polished metal
// at every angle.
const MATS: Record<'gold' | 'chrome' | 'rose' | 'platinum', { bezel: string }> = {
  gold: {
    bezel:
      'conic-gradient(from -45deg,#5a3f16,#f6dd95 10%,#c79433 21%,#fff6dc 33%,#8a6322 45%,#e9c46a 57%,#5a3f16 69%,#ffe9b0 83%,#c79433 92%,#5a3f16)',
  },
  chrome: {
    bezel:
      'conic-gradient(from -45deg,#2b3242,#cfd8e8 11%,#7f8ca3 22%,#ffffff 33%,#566074 45%,#aeb8cc 57%,#2b3242 69%,#eef2f8 83%,#8593a8 92%,#2b3242)',
  },
  rose: {
    bezel:
      'conic-gradient(from -45deg,#5a2f30,#ffe2dc 11%,#cd8f87 22%,#fff1ec 33%,#8a5552 45%,#e0a59c 57%,#5a2f30 69%,#ffe6df 83%,#c98a82 92%,#5a2f30)',
  },
  platinum: {
    bezel:
      'conic-gradient(from -45deg,#5c6373,#e9eef6 11%,#9aa6ba 22%,#ffffff 33%,#737d90 45%,#c3ccda 57%,#5c6373 69%,#f2f5fa 83%,#a7b2c4 92%,#5c6373)',
  },
};

interface VariantOpts {
  material: keyof typeof MATS;
  progMode: 'metric' | 'material';
  ticks: boolean;
  dome: boolean;
  matte: boolean;
}

const VARIANT_OPTS: Record<MetalVariant, VariantOpts> = {
  'liquid-gold':    { material: 'gold',     progMode: 'material', ticks: false, dome: false, matte: false },
  'brushed-chrome': { material: 'chrome',   progMode: 'metric',   ticks: false, dome: false, matte: false },
  'rose-gold':      { material: 'rose',     progMode: 'metric',   ticks: true,  dome: false, matte: false },
  'obsidian-gold':  { material: 'gold',     progMode: 'material', ticks: false, dome: false, matte: true  },
  'platinum-dome':  { material: 'platinum', progMode: 'metric',   ticks: false, dome: true,  matte: false },
};

export function GaugeMetal({ value, size, metric: _metric, live, mini = false, variant }: GaugeMetalProps): ReactNode {
  const opts = VARIANT_OPTS[variant];
  const uid = useId().replace(/[^a-zA-Z0-9_]/g, '_');
  const n = useCountUp(Math.round(value), live && !mini);
  const p = Math.max(0, Math.min(1, value / 100));
  const cx = 100, cy = 100, R = 60, sw = 13;
  const mat = MATS[opts.material];

  const progStops = opts.progMode === 'metric'
    ? ['var(--c-deep)', 'var(--c)', 'var(--c-bright)']
    : ['#8a6322', '#e9c46a', '#fff6dc', '#c79433'];
  const numGrad = opts.progMode === 'metric'
    ? 'linear-gradient(180deg,var(--c-bright),var(--c) 58%,var(--c-deep))'
    : 'linear-gradient(180deg,#fff6dc,#e9c46a 55%,#b8862f)';

  const trackD = arcPath(cx, cy, R, 0, 1);
  const progD = arcPath(cx, cy, R, 0, Math.max(0.0001, p));

  // Optional tick marks every 10% of sweep. Long ticks at 0 / 5 / 10
  // multiples, short ticks elsewhere. Lit ticks within the current
  // fill take the metric bright accent; unlit ticks dim down.
  const tickEls: ReactNode[] = [];
  if (opts.ticks && !mini) {
    for (let i = 0; i <= 10; i++) {
      const ang = GAP + SWEEP * (i / 10);
      const [x1, y1] = polar(cx, cy, 74, ang);
      const [x2, y2] = polar(cx, cy, i % 5 === 0 ? 67 : 70, ang);
      const lit = (i / 10) <= p + 0.001;
      tickEls.push(
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={lit ? 'var(--c-bright)' : 'rgba(255,255,255,.18)'}
          strokeWidth={i % 5 === 0 ? 2 : 1.2}
          strokeLinecap="round"
          opacity={lit ? 0.95 : 0.5}
        />,
      );
    }
  }

  // CSS vars for the travelling glint. The keyframe consumes
  // --glint-from / --glint-to so the sweep direction is configurable
  // per gauge family.
  const glintVars = {
    ['--glint-from' as string]: '100',
    ['--glint-to' as string]: '0',
  } as CSSProperties;

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      {/* outer metal bezel (matte variant swaps to a radial black) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: opts.matte
            ? 'radial-gradient(circle at 38% 32%,#2a2e38,#0a0c11 70%)'
            : mat.bezel,
          WebkitMaskImage: 'radial-gradient(circle, transparent 0 78%, #000 80% 99%, transparent 100%)',
          maskImage: 'radial-gradient(circle, transparent 0 78%, #000 80% 99%, transparent 100%)',
          boxShadow: opts.matte ? 'inset 0 1px 1px rgba(255,255,255,.08)' : 'none',
        }}
      />

      {/* rim hairline for crispness */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.5)',
        }}
      />

      {/* rotating sheen overlay (skipped on matte and on mini) */}
      {!opts.matte && live && !mini ? (
        <div
          className="g-anim"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background:
              'conic-gradient(from 0deg, transparent 0 18%, rgba(255,255,255,.9) 26%, transparent 34% 72%, rgba(255,255,255,.55) 80%, transparent 88%)',
            WebkitMaskImage: 'radial-gradient(circle, transparent 0 79%, #000 81% 98%, transparent 99%)',
            maskImage: 'radial-gradient(circle, transparent 0 79%, #000 81% 98%, transparent 99%)',
            mixBlendMode: 'screen',
            opacity: 0.5,
            animation: 'g-sheen 7s linear infinite',
          }}
        />
      ) : null}

      {/* recessed inner dial */}
      <div
        style={{
          position: 'absolute',
          inset: '20%',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 38%, #141a26 0%, #090c13 78%)',
          boxShadow: 'inset 0 3px 10px rgba(0,0,0,.8), inset 0 -1px 2px rgba(255,255,255,.05)',
        }}
      />

      {/* dome gloss highlight (only on platinum-dome) */}
      {opts.dome ? (
        <div
          style={{
            position: 'absolute',
            inset: '20%',
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 42% 26%, rgba(255,255,255,.5) 0%, rgba(255,255,255,.08) 26%, transparent 52%)',
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {/* SVG progress arc */}
      <svg viewBox="0 0 200 200" width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id={`pg${uid}`} x1="15%" y1="0%" x2="85%" y2="100%">
            {progStops.map((c, i) => (
              <stop key={i} offset={`${(i / (progStops.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </linearGradient>
          <filter id={`gl${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* engraved track */}
        <path d={trackD} fill="none" stroke="#05070c" strokeWidth={sw + 4} strokeLinecap="round" />
        <path
          d={trackD}
          fill="none"
          stroke="rgba(255,255,255,.05)"
          strokeWidth={sw + 4}
          strokeLinecap="round"
          transform="translate(0,-0.6)"
        />

        {tickEls}

        {/* shadow base */}
        <path
          d={progD}
          fill="none"
          stroke="rgba(0,0,0,.45)"
          strokeWidth={sw}
          strokeLinecap="round"
          transform="translate(0,1.1)"
        />

        {/* main progress */}
        <path
          d={progD}
          fill="none"
          stroke={`url(#pg${uid})`}
          strokeWidth={sw}
          strokeLinecap="round"
          filter={live && !mini ? `url(#gl${uid})` : undefined}
          pathLength={100}
        />

        {/* bevel highlight */}
        <path
          d={progD}
          fill="none"
          stroke="rgba(255,255,255,.7)"
          strokeWidth={sw * 0.34}
          strokeLinecap="round"
          transform="translate(0,-2.1)"
          opacity={0.5}
        />

        {/* travelling glint (skipped on matte and on mini) */}
        {live && !mini && !opts.matte ? (
          <path
            className="g-anim"
            d={progD}
            fill="none"
            stroke="#ffffff"
            strokeWidth={sw * 0.5}
            strokeLinecap="round"
            pathLength={100}
            style={{
              strokeDasharray: '9 91',
              mixBlendMode: 'screen',
              animation: 'g-glint 2.6s linear infinite',
              ...glintVars,
            }}
          />
        ) : null}
      </svg>

      {/* center value */}
      {!mini ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: size * 0.27,
              lineHeight: 0.9,
              background: numGrad,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
              fontVariantNumeric: 'tabular-nums',
              filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.6))',
            }}
          >
            {n}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 600,
              fontSize: size * 0.072,
              color: 'var(--text-lo)',
              letterSpacing: 1,
              marginTop: size * 0.012,
            }}
          >
            / 100
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default GaugeMetal;
