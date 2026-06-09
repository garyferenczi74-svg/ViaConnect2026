'use client';

// Prompt 182h (2026-06-09): Glassmorphic gauge family.
//
// Four variants ported near verbatim from the canonical
// prototype/variants-glass.jsx:
//
//   frosted   Single frosted disc with a chromatic refraction rim.
//             Linear gradient highlight top to bottom, bottom inset
//             shadow + 1.5px top inset highlight + outer drop
//             shadow. Standard value text.
//
//   lens      Single disc with a stronger top left highlight
//             modelled on a glass lens. Slightly larger value text
//             (0.32 of size) so the disc reads as a magnifier.
//
//   stacked   Three concentric frosted plates with depth offset
//             (translateY 0, -3, -6). Each plate sits over the
//             previous so the gauge reads as a stack of glass
//             coasters. Chromatic rim still rendered above.
//
//   aurora    Frosted disc with three drifting colored blobs
//             (teal, gold, violet) behind it, each breathing out
//             of phase via g-breathe. Reads as light through a
//             prism.
//
// All four variants share the progress arc with an under bloom
// (light blooming through glass), the background accent bloom, the
// chromatic refraction rim, and the value readout.
//
// CSS vars consumed: --c, --c-bright, --c-deep, --glow, --font-display,
// --font-ui. Animation classes: g-anim, g-breathe. Geometry helpers
// (polar, arcPath, GAP, SWEEP) and useCountUp come from PlasmaGauge.tsx.

import { Fragment, useId, type CSSProperties, type ReactNode } from 'react';
import { arcPath, useCountUp, type GaugeMetric } from './PlasmaGauge';

export type GlassVariant = 'frosted' | 'lens' | 'stacked' | 'aurora';

export interface GaugeGlassProps {
  value: number;
  size: number;
  metric: GaugeMetric;
  live: boolean;
  mini?: boolean;
  variant: GlassVariant;
}

interface AuroraBlob {
  color: string;
  left: string;
  top: string;
  delay: string;
}

const AURORA_BLOBS: AuroraBlob[] = [
  { color: '#2fe0c4', left: '12%', top: '18%', delay: '0s' },
  { color: '#e7b45a', left: '70%', top: '30%', delay: '-3s' },
  { color: '#7a6cff', left: '40%', top: '78%', delay: '-6s' },
];

export function GaugeGlass({ value, size, metric: _metric, live, mini, variant }: GaugeGlassProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_]/g, '_');
  const n = useCountUp(Math.round(value), live && !mini);
  const p = Math.max(0, Math.min(1, value / 100));
  const cx = 100, cy = 100, R = 78, sw = 9;
  const trackD = arcPath(cx, cy, R, 0, 1);
  const progD = arcPath(cx, cy, R, 0, Math.max(0.0001, p));

  const ring: ReactNode = (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      style={{ position: 'absolute', inset: 0, zIndex: 4 }}
    >
      <defs>
        <linearGradient id={`g${uid}`} x1="12%" y1="0%" x2="88%" y2="100%">
          <stop offset="0%"   stopColor="var(--c-deep)" />
          <stop offset="55%"  stopColor="var(--c)" />
          <stop offset="100%" stopColor="var(--c-bright)" />
        </linearGradient>
        <filter id={`b${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={mini ? 2 : 5} />
        </filter>
      </defs>
      <path d={trackD} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={sw} strokeLinecap="round" />
      {/* under bloom: light blooming through the glass */}
      {!mini ? (
        <path
          d={progD}
          fill="none"
          stroke="var(--c)"
          strokeWidth={sw + 6}
          strokeLinecap="round"
          filter={`url(#b${uid})`}
          opacity={0.7}
        />
      ) : null}
      <path
        d={progD}
        fill="none"
        stroke={`url(#g${uid})`}
        strokeWidth={sw}
        strokeLinecap="round"
        pathLength={100}
      />
      {/* crisp inner highlight on the arc */}
      <path
        d={progD}
        fill="none"
        stroke="rgba(255,255,255,.75)"
        strokeWidth={sw * 0.26}
        strokeLinecap="round"
        transform="translate(0,-1.6)"
        opacity={0.6}
      />
    </svg>
  );

  // Background bloom + aurora drifting blobs (aurora variant only).
  const behind: ReactNode = (
    <Fragment>
      <div
        style={{
          position: 'absolute',
          inset: '24%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--c) 0%, transparent 68%)',
          filter: 'blur(16px)',
          opacity: 0.55,
          zIndex: 1,
        }}
      />
      {variant === 'aurora' && !mini ? (
        <div style={{ position: 'absolute', inset: '14%', borderRadius: '50%', overflow: 'hidden', zIndex: 1 }}>
          {AURORA_BLOBS.map((blob, i) => (
            <div
              key={i}
              className="g-anim"
              style={{
                position: 'absolute',
                width: '70%',
                height: '70%',
                left: blob.left,
                top: blob.top,
                background: `radial-gradient(circle, ${blob.color} 0%, transparent 65%)`,
                filter: 'blur(14px)',
                opacity: 0.6,
                animation: `g-breathe 9s ease-in-out ${blob.delay} infinite`,
              }}
            />
          ))}
        </div>
      ) : null}
    </Fragment>
  );

  const stacked = variant === 'stacked';
  const lens = variant === 'lens';
  const insetPct = stacked ? '30%' : '22%';

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      {behind}

      {/* Stacked variant: three depth plates instead of one frosted disc. */}
      {stacked ? (
        [0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: `${16 + i * 6}%`,
              borderRadius: '50%',
              background: `rgba(255,255,255,${0.04 + i * 0.025})`,
              border: '1px solid rgba(255,255,255,.12)',
              backdropFilter: `blur(${4 + i * 3}px)`,
              WebkitBackdropFilter: `blur(${4 + i * 3}px)`,
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,.3), 0 8px 22px rgba(0,0,0,.4)',
              transform: `translateY(${i * -3}px)`,
              zIndex: 2 + i,
            }}
          />
        ))
      ) : null}

      {/* Main frosted disc (every variant except stacked). */}
      {!stacked ? (
        <div
          style={{
            position: 'absolute',
            inset: insetPct,
            borderRadius: '50%',
            zIndex: 3,
            background: lens
              ? 'radial-gradient(circle at 40% 30%, rgba(255,255,255,.32) 0%, rgba(255,255,255,.05) 36%, rgba(120,140,200,.06) 70%)'
              : 'linear-gradient(155deg, rgba(255,255,255,.16), rgba(255,255,255,.03) 55%)',
            border: '1px solid rgba(255,255,255,.22)',
            backdropFilter: 'blur(9px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(9px) saturate(1.3)',
            boxShadow: lens
              ? 'inset 0 2px 6px rgba(255,255,255,.5), inset 0 -14px 26px rgba(0,0,0,.4), 0 12px 30px rgba(0,0,0,.45)'
              : 'inset 0 1.5px 1px rgba(255,255,255,.5), inset 0 -16px 28px rgba(0,0,0,.35), 0 14px 34px rgba(0,0,0,.5)',
          }}
        />
      ) : null}

      {/* Chromatic refraction rim. Skipped on mini tiles to keep the
          strip readable at 56 px. */}
      {!mini ? (
        <div
          style={{
            position: 'absolute',
            inset: insetPct,
            borderRadius: '50%',
            zIndex: 3,
            pointerEvents: 'none',
            background:
              'conic-gradient(from 200deg, rgba(255,80,120,0), rgba(120,200,255,.5) 20%, rgba(255,255,255,0) 30%, rgba(255,120,220,.45) 72%, rgba(120,255,210,0) 84%)',
            WebkitMaskImage: 'radial-gradient(circle, transparent 0 86%, #000 90% 100%)',
            maskImage: 'radial-gradient(circle, transparent 0 86%, #000 90% 100%)',
            mixBlendMode: 'screen',
            opacity: 0.7,
          }}
        />
      ) : null}

      {ring}

      {/* Value readout. Suppressed on mini tiles so the strip stays
          composition only at 56 px. */}
      {!mini ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: size * (lens ? 0.32 : 0.28),
              lineHeight: 0.9,
              color: '#fff',
              textShadow: '0 2px 10px rgba(0,0,0,.5), 0 0 22px var(--glow)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {n}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 600,
              fontSize: size * 0.07,
              color: 'rgba(255,255,255,.55)',
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

export default GaugeGlass;
