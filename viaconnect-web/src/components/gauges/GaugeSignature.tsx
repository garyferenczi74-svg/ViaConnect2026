'use client';

// Prompt 182l (2026-06-09): Signature gauge family.
//
// Three prototype showpieces ported near verbatim from
// prototype/variants-signature.jsx. The Plasma Core variant
// (22) delegates to the existing PlasmaGauge component so the
// Signature row stays canonical with the consumer build; the two
// new variants (Halo Bloom and Constellation Arc) live entirely
// inside this file.
//
//   plasma          The Plasma Core. Glass orb, pulsing molten
//                    core, orbiting sparks, progress ring with
//                    glint. Implemented by reusing
//                    PlasmaGauge.tsx so the Signature row stays
//                    pixel identical with the consumer surfaces.
//                    metric=wellness.
//
//   halo            Radial petal halo: 40 thin petals on hero,
//                    18 on mini. Each lit petal (frac <= value)
//                    takes a gradient stem + glow + g-petal
//                    shimmer; unlit petals dim out. A breathing
//                    center bloom (g-breathe 3.4 s) and six drift
//                    motes (g-drift) round out the composition.
//                    metric=mood.
//
//   constellation   Nodes along the open arc geometry connected by
//                    a polyline. 16 nodes on hero, 9 on mini. The
//                    full set draws a faint connector line; the
//                    lit prefix overdraws a bright accent line.
//                    Lit nodes get a glow halo + twinkle
//                    (g-twinkle), unlit nodes stay dim.
//                    metric=sleep.
//
// Animation classes consumed (all already in plasma-gauge.css):
// g-anim, g-pulse, g-glint, g-sheen, g-spin, g-breathe, g-petal,
// g-drift, g-twinkle.

import { useId, type ReactNode } from 'react';
import {
  GAP,
  SWEEP,
  arcPath,
  polar,
  useCountUp,
  PlasmaGauge,
  type GaugeMetric,
} from './PlasmaGauge';

export type SignatureVariant = 'plasma' | 'halo' | 'constellation';

export interface GaugeSignatureProps {
  value: number;
  size: number;
  metric: GaugeMetric;
  live: boolean;
  mini?: boolean;
  variant: SignatureVariant;
}

// ---------------------------------------------------------------------------
// CenterValue + Motes helpers shared by Halo and Constellation.
// ---------------------------------------------------------------------------

function CenterValue({ size, n, mini }: { size: number; n: number; mini: boolean }) {
  if (mini) return null;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 30,
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
          fontSize: size * 0.27,
          lineHeight: 0.9,
          color: '#fff',
          fontVariantNumeric: 'tabular-nums',
          textShadow: '0 2px 12px rgba(0,0,0,.6), 0 0 22px var(--glow)',
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
          marginTop: size * 0.01,
        }}
      >
        / 100
      </div>
    </div>
  );
}

function Motes({ live, count = 7 }: { live: boolean; count?: number }) {
  if (!live) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2;
        const left = 50 + Math.cos(a) * 30;
        const top = 50 + Math.sin(a) * 30;
        const dx = Math.cos(a) * 16;
        const dy = -18 - (i % 3) * 8;
        const delay = (i * 0.6).toFixed(1);
        const dur = 3 + (i % 3);
        return (
          <div
            key={i}
            className="g-anim"
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: `${top}%`,
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: 'var(--c-bright)',
              boxShadow: '0 0 6px var(--glow)',
              opacity: 0,
              ['--dx' as string]: `${dx}px`,
              ['--dy' as string]: `${dy}px`,
              animation: `g-drift ${dur}s ease-out ${delay}s infinite`,
            }}
          />
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Halo Bloom: radial petals + breathing center + motes.
// ---------------------------------------------------------------------------

function HaloBloom({ value, size, live, mini }: { value: number; size: number; live: boolean; mini: boolean }) {
  const n = useCountUp(Math.round(value), live && !mini);
  const p = Math.max(0, Math.min(1, value / 100));
  const anim = live && !mini;
  const N = mini ? 18 : 40;

  const petals: ReactNode[] = [];
  for (let i = 0; i < N; i++) {
    const frac = i / (N - 1);
    const a = GAP + SWEEP * frac;
    const lit = frac <= p + 0.001;
    petals.push(
      <div
        key={i}
        className={lit && anim ? 'g-anim' : ''}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: size * 0.018,
          height: size * 0.2,
          marginLeft: -(size * 0.009),
          transformOrigin: `center ${size * 0.4}px`,
          transform: `rotate(${a}deg)`,
          borderRadius: size * 0.02,
          background: lit
            ? 'linear-gradient(to top, transparent, var(--c) 40%, var(--c-bright))'
            : 'rgba(255,255,255,.07)',
          boxShadow: lit && anim ? '0 0 8px var(--glow)' : 'none',
          opacity: lit ? 1 : 0.7,
          animation:
            lit && anim
              ? `g-petal ${1.6 + (i % 5) * 0.2}s ease-in-out ${(i * 0.04).toFixed(2)}s infinite`
              : undefined,
        }}
      />,
    );
  }

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <div
        className={anim ? 'g-anim' : ''}
        style={{
          position: 'absolute',
          inset: '28%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--glow) 0%, transparent 70%)',
          filter: 'blur(12px)',
          opacity: 0.6,
          animation: anim ? 'g-breathe 3.4s ease-in-out infinite' : undefined,
        }}
      />
      {petals}
      <Motes live={anim} count={6} />
      <CenterValue size={size} n={n} mini={mini} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Constellation Arc: nodes along the open arc, polyline connectors,
// glow halos on lit nodes.
// ---------------------------------------------------------------------------

function Constellation({ value, size, live, mini }: { value: number; size: number; live: boolean; mini: boolean }) {
  const _uid = useId().replace(/[^a-zA-Z0-9_]/g, '_');
  const n = useCountUp(Math.round(value), live && !mini);
  const p = Math.max(0, Math.min(1, value / 100));
  const anim = live && !mini;
  const R = 76;
  const N = mini ? 9 : 16;
  const cx = 100, cy = 100;

  interface Node { x: number; y: number; lit: boolean; frac: number; }
  const nodes: Node[] = [];
  for (let i = 0; i < N; i++) {
    const frac = i / (N - 1);
    const a = GAP + SWEEP * frac;
    const [x, y] = polar(cx, cy, R, a);
    nodes.push({ x, y, lit: frac <= p + 0.001, frac });
  }
  const litPts = nodes.filter((nd) => nd.lit).map((nd) => `${nd.x},${nd.y}`).join(' ');
  const allPts = nodes.map((nd) => `${nd.x},${nd.y}`).join(' ');

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <polyline
          points={allPts}
          fill="none"
          stroke="rgba(255,255,255,.1)"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        {litPts ? (
          <polyline
            points={litPts}
            fill="none"
            stroke="var(--c)"
            strokeWidth={2}
            strokeLinejoin="round"
            style={{ filter: anim ? 'drop-shadow(0 0 5px var(--glow))' : 'none' }}
          />
        ) : null}
        {nodes.map((nd, i) => (
          <g key={i}>
            {nd.lit ? (
              <circle
                cx={nd.x}
                cy={nd.y}
                r={6.5}
                fill="var(--glow)"
                opacity={anim ? 0.5 : 0.3}
                className={anim ? 'g-anim' : ''}
                style={{
                  animation: anim
                    ? `g-twinkle ${2 + (i % 3)}s ease-in-out ${i * 0.15}s infinite`
                    : undefined,
                }}
              />
            ) : null}
            <circle
              cx={nd.x}
              cy={nd.y}
              r={nd.lit ? 3.4 : 2.2}
              fill={nd.lit ? 'var(--c-bright)' : '#2a3346'}
              stroke={nd.lit ? 'rgba(255,255,255,.7)' : 'none'}
              strokeWidth={nd.lit ? 0.8 : 0}
            />
          </g>
        ))}
      </svg>
      <Motes live={anim} count={6} />
      <CenterValue size={size} n={n} mini={mini} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component. Plasma variant delegates to PlasmaGauge.tsx so the
// canonical Plasma Core lives in one place; Halo and Constellation
// live here.
// ---------------------------------------------------------------------------

export function GaugeSignature({ value, size, metric, live, mini = false, variant }: GaugeSignatureProps): ReactNode {
  if (variant === 'plasma') {
    return (
      <PlasmaGauge
        value={value}
        metric={metric}
        size={size}
        variant={mini ? 'compact' : 'hero'}
        animated={live}
        showUnit={!mini}
      />
    );
  }
  if (variant === 'halo') {
    return <HaloBloom value={value} size={size} live={live} mini={mini} />;
  }
  return <Constellation value={value} size={size} live={live} mini={mini} />;
}

export default GaugeSignature;
