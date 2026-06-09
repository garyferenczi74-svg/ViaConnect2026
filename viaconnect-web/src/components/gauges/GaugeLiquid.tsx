'use client';

// Prompt 182i (2026-06-09): Liquid fill gauge family.
//
// Four variants ported near verbatim from the canonical
// prototype/variants-liquid.jsx:
//
//   sphere    Glass sphere filled to value%. Two animated waves on
//             the meniscus (g-wave, 4s and 6s) plus rising bubbles
//             (g-rise) inside the liquid. Glossy top left highlight
//             on the sphere shell. metric=energy.
//
//   tube      Fluid ring tube along the open arc geometry. Glass
//             tube (wide stroke) with a thinner fluid stroke inside
//             it; surface gloss above; travelling specular shimmer
//             (g-glint) along the fluid; meniscus cap with a white
//             pickup at the head of the fill. metric=nutrition.
//
//   mercury   Same sphere as variant=sphere but the fill gradient
//             is a metallic mercury silver, the wave colors flip to
//             white, and a bright sheen sweeps across the surface.
//             metric=activity.
//
//   capsule   Capsule shape (pill) instead of circle. Same wave +
//             bubbles treatment as the sphere. metric=mood.
//
// Animation classes consumed (all already in plasma-gauge.css):
// g-anim, g-wave, g-rise, g-glint.
// Helpers consumed from PlasmaGauge.tsx: useCountUp, arcPath,
// polar, GAP, SWEEP.

import { useId, type CSSProperties, type ReactNode } from 'react';
import {
  GAP,
  SWEEP,
  arcPath,
  polar,
  useCountUp,
  type GaugeMetric,
} from './PlasmaGauge';

export type LiquidVariant = 'sphere' | 'tube' | 'mercury' | 'capsule';

export interface GaugeLiquidProps {
  value: number;
  size: number;
  metric: GaugeMetric;
  live: boolean;
  mini?: boolean;
  variant: LiquidVariant;
}

// ---------------------------------------------------------------------------
// Wave: animated SVG wave path that slides 50% via g-wave keyframe so the
// crest reads as continuously flowing water.
// ---------------------------------------------------------------------------

function Wave({ color, dur, opacity, top }: { color: string; dur: number; opacity: number; top: number }) {
  return (
    <svg
      className="g-anim"
      viewBox="0 0 200 24"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        top,
        left: 0,
        width: '200%',
        height: 24,
        animation: `g-wave ${dur}s linear infinite`,
        opacity,
      }}
    >
      <path
        d="M0 12 Q 12.5 2 25 12 T 50 12 T 75 12 T 100 12 T 125 12 T 150 12 T 175 12 T 200 12 V24 H0Z"
        fill={color}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Bubbles: rising bubble particles via g-rise. Only renders when live.
// ---------------------------------------------------------------------------

function Bubbles({ live, color }: { live: boolean; color: string }) {
  if (!live) return null;
  const arr: Array<[number, number, number]> = [
    [30, 5, 0],
    [55, 7, 1.4],
    [72, 4, 0.7],
    [44, 6, 2.2],
    [62, 5, 3],
  ];
  return (
    <>
      {arr.map(([left, r, d], i) => (
        <div
          key={i}
          className="g-anim"
          style={{
            position: 'absolute',
            left: `${left}%`,
            bottom: 6,
            width: r * 2,
            height: r * 2,
            borderRadius: '50%',
            background: color,
            opacity: 0,
            animation: `g-rise ${3 + (i % 3)}s ease-in ${d}s infinite`,
          }}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// LiquidFill: shared by sphere, mercury, and capsule. shape and metallic
// are the two differentiators.
// ---------------------------------------------------------------------------

function LiquidFill({
  value,
  size,
  live,
  mini,
  shape,
  metallic,
}: {
  value: number;
  size: number;
  live: boolean;
  mini: boolean;
  shape: 'circle' | 'capsule';
  metallic: boolean;
}) {
  const n = useCountUp(Math.round(value), live && !mini);
  const p = Math.max(0, Math.min(1, value / 100));
  const radius = shape === 'capsule' ? `${size * 0.32}px` : '50%';
  const fillBg = metallic
    ? 'linear-gradient(180deg, #cfd8e8 0%, #8593a8 40%, #566074 100%)'
    : 'linear-gradient(180deg, var(--c-bright) 0%, var(--c) 45%, var(--c-deep) 100%)';
  const waveColorTop = metallic ? 'rgba(220,228,242,.9)' : 'var(--c-bright)';
  const waveColorBottom = metallic ? 'rgba(255,255,255,.85)' : 'var(--c)';

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: size * 0.86,
          height: size * 0.86,
          borderRadius: radius,
          overflow: 'hidden',
          background:
            'radial-gradient(circle at 38% 30%, rgba(255,255,255,.1), rgba(255,255,255,.02) 45%, rgba(0,0,0,.3))',
          border: '1px solid rgba(255,255,255,.18)',
          boxShadow:
            'inset 0 2px 6px rgba(255,255,255,.25), inset 0 -10px 22px rgba(0,0,0,.5), 0 14px 34px rgba(0,0,0,.5)',
        }}
      >
        {/* empty glass tint */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: metallic
              ? 'rgba(120,130,150,.05)'
              : 'color-mix(in srgb, var(--c) 8%, transparent)',
          }}
        />

        {/* liquid */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: `${p * 100}%`,
            background: fillBg,
            boxShadow: 'inset 0 6px 14px rgba(255,255,255,.25)',
          }}
        >
          <Wave color={waveColorTop}    dur={4} opacity={0.55} top={-11} />
          <Wave color={waveColorBottom} dur={6} opacity={0.45} top={-7} />
          <Bubbles live={live && !mini} color={metallic ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.5)'} />
          {metallic ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(110deg, transparent 30%, rgba(255,255,255,.6) 50%, transparent 70%)',
                opacity: 0.4,
              }}
            />
          ) : null}
        </div>

        {/* glossy top left highlight */}
        <div
          style={{
            position: 'absolute',
            top: '8%',
            left: '14%',
            width: '46%',
            height: '32%',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,.55), transparent 65%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* value */}
      {!mini ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: size * 0.28,
              lineHeight: 0.9,
              color: '#fff',
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 2px 8px rgba(0,0,0,.6), 0 0 18px rgba(0,0,0,.4)',
            }}
          >
            {n}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 600,
              fontSize: size * 0.07,
              color: 'rgba(255,255,255,.7)',
              letterSpacing: 1,
              marginTop: size * 0.01,
            }}
          >
            / 100
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FluidTube: fluid ring tube along the open arc geometry. Distinct enough
// from LiquidFill that it gets its own component rather than another shape
// branch.
// ---------------------------------------------------------------------------

function FluidTube({ value, size, live, mini }: { value: number; size: number; live: boolean; mini: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9_]/g, '_');
  const n = useCountUp(Math.round(value), live && !mini);
  const p = Math.max(0, Math.min(1, value / 100));
  const cx = 100, cy = 100, R = 74, sw = 20;
  const trackD = arcPath(cx, cy, R, 0, 1);
  const progD = arcPath(cx, cy, R, 0, Math.max(0.0001, p));
  const endAng = GAP + SWEEP * p;
  const [mx, my] = polar(cx, cy, R, endAng);
  const anim = live && !mini;

  // CSS variable strings consumed by the g-glint keyframe so the shimmer
  // sweeps from 100 to 0 (head to tail) along the fluid path.
  const glintVars = {
    ['--glint-from' as string]: '100',
    ['--glint-to' as string]: '0',
  } as CSSProperties;

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <defs>
          <linearGradient id={`t${uid}`} x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%"   stopColor="var(--c-deep)" />
            <stop offset="55%"  stopColor="var(--c)" />
            <stop offset="100%" stopColor="var(--c-bright)" />
          </linearGradient>
        </defs>

        {/* glass tube: thick outer stroke + dashed inner texture */}
        <path d={trackD} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={sw} strokeLinecap="round" />
        <path
          d={trackD}
          fill="none"
          stroke="rgba(255,255,255,.12)"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray="0.1 6"
        />

        {/* fluid: narrower stroke inside the tube */}
        <path
          d={progD}
          fill="none"
          stroke={`url(#t${uid})`}
          strokeWidth={sw - 5}
          strokeLinecap="round"
          pathLength={100}
          style={{ filter: anim ? 'drop-shadow(0 0 8px var(--glow))' : 'none' }}
        />

        {/* surface gloss */}
        <path
          d={progD}
          fill="none"
          stroke="rgba(255,255,255,.7)"
          strokeWidth={2.4}
          strokeLinecap="round"
          transform="translate(0,-4)"
          opacity={0.5}
        />

        {/* travelling shimmer */}
        {anim ? (
          <path
            className="g-anim"
            d={progD}
            fill="none"
            stroke="rgba(255,255,255,.9)"
            strokeWidth={sw - 7}
            strokeLinecap="round"
            pathLength={100}
            style={{
              strokeDasharray: '7 93',
              mixBlendMode: 'screen',
              animation: 'g-glint 3s linear infinite',
              ...glintVars,
            }}
          />
        ) : null}

        {/* meniscus cap with a white pickup */}
        <circle
          cx={mx}
          cy={my}
          r={(sw - 5) / 2}
          fill="var(--c-bright)"
          style={{ filter: anim ? 'drop-shadow(0 0 6px var(--glow))' : 'none' }}
        />
        <circle cx={mx - 1.5} cy={my - 2} r={2} fill="rgba(255,255,255,.85)" />
      </svg>

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
              color: '#fff',
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 2px 10px rgba(0,0,0,.5), 0 0 20px var(--glow)',
            }}
          >
            {n}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 600,
              fontSize: size * 0.07,
              color: 'rgba(255,255,255,.5)',
              letterSpacing: 1,
              marginTop: size * 0.01,
            }}
          >
            / 100
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component. Dispatch on variant.
// ---------------------------------------------------------------------------

export function GaugeLiquid({ value, size, metric: _metric, live, mini = false, variant }: GaugeLiquidProps): ReactNode {
  if (variant === 'tube') {
    return <FluidTube value={value} size={size} live={live} mini={mini} />;
  }
  const shape: 'circle' | 'capsule' = variant === 'capsule' ? 'capsule' : 'circle';
  const metallic = variant === 'mercury';
  return <LiquidFill value={value} size={size} live={live} mini={mini} shape={shape} metallic={metallic} />;
}

export default GaugeLiquid;
