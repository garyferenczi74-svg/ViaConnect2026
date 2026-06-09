'use client';

// Prompt 182g (2026-06-09): True 3D gauge family.
//
// Four variants ported near verbatim from the canonical
// prototype/variants-3d.jsx:
//
//   orbit  Tilted ring at rotateX 58 with a bead orbiting along the
//          arc on a separate spinning plane. Bead sits at the head
//          of the current fill so it doubles as a value indicator.
//
//   gyro   Three concentric rings tilted on different axes
//          (rotateX 66, rotateY 70, rotateX 28 + rotateY 20). The
//          outermost ring is a conic gradient progress ring; the
//          inner rings are decorative gimbals.
//
//   coin   Stacked translateZ disc layers form a thick coin. The
//          top face carries the progress arc; the bottom of the
//          stack sits ~30 px behind. Animated by g-coin (a gentle
//          rotateY tilt that reveals the thickness without hiding
//          the face).
//
//   helix  Two strands of nodes positioned in 3D helix space.
//          Animated by g-helixspin around the vertical axis with a
//          slight forward tilt (rotateX 8).
//
// Animation classes (g-anim, g-float3d, g-spin, g-gyro1, g-gyro2,
// g-gyro3, g-coin, g-helixspin) all live in plasma-gauge.css. The
// shared geometry helpers (polar, arcPath, GAP, SWEEP) and the
// useCountUp entrance hook live in PlasmaGauge.tsx.
//
// CSS vars consumed: --c, --c-bright, --c-deep, --glow,
// --font-display, --font-ui. The gallery GaugeCard sets these per
// metric from METRIC_COLORS so the True 3D family inherits the
// canonical palette without re declaring it.

import { useId, type CSSProperties, type ReactNode } from 'react';
import {
  GAP,
  SWEEP,
  arcPath,
  polar,
  useCountUp,
  type GaugeMetric,
} from './PlasmaGauge';

export type Gauge3DVariant = 'orbit' | 'gyro' | 'coin' | 'helix';

export interface Gauge3DProps {
  value: number;
  size: number;
  metric: GaugeMetric;
  live: boolean;
  mini?: boolean;
  variant: Gauge3DVariant;
}

// ---------------------------------------------------------------------------
// Value readout (shared by all four variants).
// ---------------------------------------------------------------------------

function Value({ size, n, dim }: { size: number; n: number; dim?: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
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
          textShadow: '0 2px 10px rgba(0,0,0,.6), 0 0 20px var(--glow)',
        }}
      >
        {n}
      </div>
      {!dim && (
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
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component. Switches on variant.
// ---------------------------------------------------------------------------

export function Gauge3D({ value, size, metric: _metric, live, mini, variant }: Gauge3DProps) {
  // useId returns a string with colons in dev; strip them for SVG ids.
  const uid = useId().replace(/[^a-zA-Z0-9_]/g, '_');
  const n = useCountUp(Math.round(value), live && !mini);
  const p = Math.max(0, Math.min(1, value / 100));
  const s = size / 200;
  const cx = 100, cy = 100, R = 72, sw = 11;
  const trackD = arcPath(cx, cy, R, 0, 1);
  const progD = arcPath(cx, cy, R, 0, Math.max(0.0001, p));
  const anim = live && !mini;

  const arcSvg = (extra: CSSProperties = {}): ReactNode => (
    <svg
      viewBox="0 0 200 200"
      width="200"
      height="200"
      style={{ position: 'absolute', inset: 0, ...extra }}
    >
      <defs>
        <linearGradient id={`a${uid}`} x1="12%" y1="0%" x2="88%" y2="100%">
          <stop offset="0%"  stopColor="var(--c-deep)" />
          <stop offset="55%" stopColor="var(--c)" />
          <stop offset="100%" stopColor="var(--c-bright)" />
        </linearGradient>
      </defs>
      <path d={trackD} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth={sw} strokeLinecap="round" />
      <path
        d={progD}
        fill="none"
        stroke={`url(#a${uid})`}
        strokeWidth={sw}
        strokeLinecap="round"
        pathLength={100}
        style={{ filter: anim ? 'drop-shadow(0 0 7px var(--glow))' : 'none' }}
      />
      <path
        d={progD}
        fill="none"
        stroke="rgba(255,255,255,.6)"
        strokeWidth={sw * 0.28}
        strokeLinecap="round"
        transform="translate(0,-1.5)"
        opacity={0.6}
      />
    </svg>
  );

  const stage: CSSProperties = {
    width: 200,
    height: 200,
    position: 'absolute',
    top: 0,
    left: 0,
    transform: `scale(${s})`,
    transformOrigin: 'top left',
    transformStyle: 'preserve-3d',
  };
  const wrap: CSSProperties = {
    width: size,
    height: size,
    position: 'relative',
    perspective: `${620 * s}px`,
  };

  let body: ReactNode = null;

  if (variant === 'orbit') {
    const orbAng = GAP + SWEEP * p;
    const [ox, oy] = polar(cx, cy, R, orbAng);
    body = (
      <div style={stage}>
        <div
          className={anim ? 'g-anim' : ''}
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transform: anim ? undefined : 'rotateX(58deg)',
            animation: anim ? 'g-float3d 7s ease-in-out infinite' : undefined,
          }}
        >
          {/* base shadow ellipse */}
          <div
            style={{
              position: 'absolute',
              inset: '8%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--glow) 0%, transparent 65%)',
              opacity: 0.35,
              filter: 'blur(6px)',
              transform: 'translateZ(-12px)',
            }}
          />
          {arcSvg()}
          {/* orbiting bead */}
          <div
            className={anim ? 'g-anim' : ''}
            style={{
              position: 'absolute',
              inset: 0,
              transformStyle: 'preserve-3d',
              animation: anim ? 'g-spin 5s linear infinite' : undefined,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: ox - 7,
                top: oy - 7,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, #fff, var(--c) 60%, var(--c-deep))',
                boxShadow: '0 0 12px var(--glow)',
                transform: 'translateZ(8px)',
              }}
            />
          </div>
        </div>
        <Value size={200} n={n} dim={mini} />
      </div>
    );
  } else if (variant === 'gyro') {
    interface Ring {
      inset: string;
      anim: string;
      stat: string;
      conic?: boolean;
      col?: string;
    }
    const rings: Ring[] = [
      { inset: '6%',  anim: 'g-gyro1 6s linear infinite', stat: 'rotateX(66deg)',                 conic: true },
      { inset: '20%', anim: 'g-gyro2 8s linear infinite', stat: 'rotateY(70deg)',                 col: 'var(--c-bright)' },
      { inset: '33%', anim: 'g-gyro3 7s linear infinite', stat: 'rotateX(28deg) rotateY(20deg)',  col: 'rgba(255,255,255,.5)' },
    ];
    body = (
      <div style={stage}>
        {rings.map((r, i) => (
          <div
            key={i}
            className={anim ? 'g-anim' : ''}
            style={{
              position: 'absolute',
              inset: r.inset,
              borderRadius: '50%',
              transformStyle: 'preserve-3d',
              transform: anim ? undefined : r.stat,
              animation: anim ? r.anim : undefined,
              ...(r.conic
                ? {
                    background: `conic-gradient(from -90deg, var(--c) 0 ${p * 360}deg, rgba(255,255,255,.07) ${p * 360}deg 360deg)`,
                    WebkitMaskImage: 'radial-gradient(circle, transparent 0 86%, #000 88% 100%)',
                    maskImage: 'radial-gradient(circle, transparent 0 86%, #000 88% 100%)',
                    filter: anim ? 'drop-shadow(0 0 6px var(--glow))' : 'none',
                  }
                : {
                    border: `${i === 1 ? 3 : 2}px solid ${r.col}`,
                    boxShadow: `0 0 8px var(--glow)`,
                  }),
            }}
          />
        ))}
        <Value size={200} n={n} dim={mini} />
      </div>
    );
  } else if (variant === 'coin') {
    const L = mini ? 6 : 13;
    const layers: ReactNode[] = [];
    for (let i = 0; i < L; i++) {
      const z = (i - (L - 1) / 2) * 2.4;
      const top = i === L - 1;
      layers.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: '12%',
            borderRadius: '50%',
            transform: `translateZ(${z}px)`,
            background: top
              ? 'radial-gradient(circle at 42% 32%, #1b2436, #0a0e17 75%)'
              : 'linear-gradient(135deg, #3a4660, #222b3d)',
            backgroundColor: '#2a3346',
            boxShadow: top ? 'inset 0 1px 2px rgba(255,255,255,.12)' : 'none',
          }}
        >
          {top ? arcSvg({ inset: 0, width: '100%', height: '100%' }) : null}
        </div>,
      );
    }
    body = (
      <div style={stage}>
        <div
          className={anim ? 'g-anim' : ''}
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transform: anim ? undefined : 'rotateY(-26deg) rotateX(8deg)',
            animation: anim ? 'g-coin 6s ease-in-out infinite' : undefined,
          }}
        >
          {layers}
          <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, transform: `translateZ(${((L - 1) / 2) * 2.4 + 1}px)` }}>
              <Value size={200} n={n} dim={mini} />
            </div>
          </div>
        </div>
      </div>
    );
  } else if (variant === 'helix') {
    interface HelixNode { y: number; ang: number; lit: boolean; key: string; t: number; }
    const N = mini ? 10 : 20;
    const turns = 2.4, hgt = 150, rad = 46;
    const nodes: HelixNode[] = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const y = 25 + t * hgt;
      const ang = t * turns * 360;
      const lit = t <= p + 0.001;
      for (const strand of [0, 180]) {
        nodes.push({ y, ang: ang + strand, lit, key: `${i}-${strand}`, t });
      }
    }
    body = (
      <div style={stage}>
        <div
          className={anim ? 'g-anim' : ''}
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transform: anim ? 'rotateX(8deg)' : 'rotateX(8deg) rotateY(30deg)',
            animation: anim ? 'g-helixspin 9s linear infinite' : undefined,
          }}
        >
          {nodes.map((nd) => {
            const r = (nd.ang) * Math.PI / 180;
            const x = 100 + Math.sin(r) * rad;
            const zt = Math.cos(r) * rad;
            const sc = (zt + rad) / (2 * rad);
            return (
              <div
                key={nd.key}
                style={{
                  position: 'absolute',
                  left: x - 6,
                  top: nd.y - 6,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  transform: `translateZ(${zt}px) scale(${0.6 + sc * 0.6})`,
                  background: nd.lit
                    ? 'radial-gradient(circle at 35% 30%, #fff, var(--c) 55%, var(--c-deep))'
                    : 'radial-gradient(circle at 35% 30%, #3a4660, #1a2233)',
                  backgroundColor: nd.lit ? undefined : '#1a2233',
                  boxShadow: nd.lit && anim ? '0 0 9px var(--glow)' : 'none',
                  opacity: 0.45 + sc * 0.55,
                }}
              />
            );
          })}
        </div>
        <Value size={200} n={n} dim={mini} />
      </div>
    );
  }

  return <div style={wrap}>{body}</div>;
}

export default Gauge3D;
