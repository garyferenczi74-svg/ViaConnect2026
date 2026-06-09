'use client';

// Prompt 182k (2026-06-09): Neumorphic gauge family.
//
// Four prototype variants ported near verbatim from
// prototype/variants-neumorphic.jsx:
//
//   extruded   Raised neu plate with a bead arc that reads as a
//              soft extruded ridge. Highlight up left, shadow down
//              right. metric=activity.
//
//   inset      Raised outer plate with a carved inner channel that
//              the progress ring fills. The channel reads as a
//              groove the bead sits inside. metric=nutrition.
//
//   pillow     Raised plate with 22 segment circles around the arc.
//              Each segment is a pillowed bead; lit beads take the
//              metric accent + glow, unlit beads stay dark. The
//              ring reads like an analog beaded clock face.
//              metric=sleep.
//
//   knob       Raised cylindrical knob in the center, surrounded by
//              a tick ring. A pointer line connects the knob center
//              to the value position on the ring. Pointer angle =
//              GAP + SWEEP * p so it points at the current value.
//              metric=energy.
//
// No continuous CSS animations used by this family. The
// neumorphic look is built entirely from inset / raised box shadows
// and gradients driven by the value fraction. The count up entrance
// still runs on first inView fire via useCountUp.
//
// Helpers consumed from PlasmaGauge.tsx: useCountUp, arcPath,
// polar, GAP, SWEEP.

import { useId, type ReactNode } from 'react';
import {
  GAP,
  SWEEP,
  arcPath,
  polar,
  useCountUp,
  type GaugeMetric,
} from './PlasmaGauge';

export type NeuVariant = 'extruded' | 'inset' | 'pillow' | 'knob';

export interface GaugeNeuProps {
  value: number;
  size: number;
  metric: GaugeMetric;
  live: boolean;
  mini?: boolean;
  variant: NeuVariant;
}

// Neumorphic tokens (back to back light + dark box shadows on a flat
// surface). The raised shadow lifts the plate off the card; the carved
// shadow recesses an inset channel into the plate.
const NEU = '#1b2434';
const RAISED =
  '7px 7px 16px rgba(0,0,0,.55), -6px -6px 14px rgba(255,255,255,.055)';
const CARVED =
  'inset 6px 6px 12px rgba(0,0,0,.6), inset -5px -5px 11px rgba(255,255,255,.05)';

export function GaugeNeu({ value, size, metric: _metric, live, mini = false, variant }: GaugeNeuProps): ReactNode {
  const uid = useId().replace(/[^a-zA-Z0-9_]/g, '_');
  const n = useCountUp(Math.round(value), live && !mini);
  const p = Math.max(0, Math.min(1, value / 100));
  const cx = 100, cy = 100, R = 70, sw = 12;
  const trackD = arcPath(cx, cy, R, 0, 1);
  const progD = arcPath(cx, cy, R, 0, Math.max(0.0001, p));

  // Bead arc rendered for the extruded + inset variants. Knob and
  // pillow variants draw their own composition.
  const beadArc: ReactNode = (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      style={{ position: 'absolute', inset: 0, zIndex: 3 }}
    >
      <defs>
        <linearGradient id={`n${uid}`} x1="14%" y1="0%" x2="86%" y2="100%">
          <stop offset="0%"   stopColor="var(--c-deep)" />
          <stop offset="55%"  stopColor="var(--c)" />
          <stop offset="100%" stopColor="var(--c-bright)" />
        </linearGradient>
      </defs>
      {variant === 'inset' ? (
        <>
          {/* carved channel */}
          <path d={trackD} fill="none" stroke="rgba(0,0,0,.55)" strokeWidth={sw + 5} strokeLinecap="round" />
          <path
            d={trackD}
            fill="none"
            stroke="rgba(255,255,255,.05)"
            strokeWidth={sw + 5}
            strokeLinecap="round"
            transform="translate(0,1.4)"
          />
          <path d={trackD} fill="none" stroke="#0d1320" strokeWidth={sw} strokeLinecap="round" />
          {/* glowing fill inside channel */}
          <path
            d={progD}
            fill="none"
            stroke={`url(#n${uid})`}
            strokeWidth={sw - 2}
            strokeLinecap="round"
            pathLength={100}
            style={{ filter: mini ? 'none' : 'drop-shadow(0 0 6px var(--glow))' }}
          />
        </>
      ) : (
        <>
          <path d={trackD} fill="none" stroke="rgba(0,0,0,.4)" strokeWidth={sw} strokeLinecap="round" />
          {/* shadow base offset down right */}
          <path
            d={progD}
            fill="none"
            stroke="rgba(0,0,0,.5)"
            strokeWidth={sw}
            strokeLinecap="round"
            transform="translate(1.4,1.6)"
          />
          {/* main bead */}
          <path
            d={progD}
            fill="none"
            stroke={`url(#n${uid})`}
            strokeWidth={sw}
            strokeLinecap="round"
            pathLength={100}
          />
          {/* bevel highlight offset up left */}
          <path
            d={progD}
            fill="none"
            stroke="rgba(255,255,255,.55)"
            strokeWidth={sw * 0.3}
            strokeLinecap="round"
            transform="translate(-1.2,-1.8)"
            opacity={0.7}
          />
        </>
      )}
    </svg>
  );

  // Pillow segments around the arc (pillow variant only).
  const segs: ReactNode[] = [];
  if (variant === 'pillow') {
    const N = 22;
    for (let i = 0; i < N; i++) {
      const a = GAP + SWEEP * (i / (N - 1));
      const [x, y] = polar(cx, cy, R, a);
      const lit = (i / (N - 1)) <= p + 0.001;
      segs.push(
        <circle
          key={i}
          cx={x}
          cy={y}
          r={lit ? 5.4 : 4.4}
          fill={lit ? 'var(--c)' : '#141c2a'}
          style={{ filter: lit ? (mini ? 'none' : 'drop-shadow(0 0 5px var(--glow))') : 'none' }}
        />,
      );
    }
  }

  // Knob pointer angle: where the pointer line ends inside the ring.
  const knobAng = GAP + SWEEP * p;
  const [px, py] = polar(cx, cy, 50, knobAng);

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      {/* Base neu plate (raised). */}
      <div
        style={{
          position: 'absolute',
          inset: '8%',
          borderRadius: '50%',
          background: NEU,
          boxShadow: RAISED,
          zIndex: 1,
        }}
      />

      {/* Inset variant adds a carved inner well so the bead reads as
          a fill inside a groove. */}
      {variant === 'inset' ? (
        <div
          style={{
            position: 'absolute',
            inset: '20%',
            borderRadius: '50%',
            background: NEU,
            boxShadow: CARVED,
            zIndex: 2,
          }}
        />
      ) : null}

      {/* Pillow variant renders the bead ring as discrete circles. */}
      {variant === 'pillow' ? (
        <svg
          viewBox="0 0 200 200"
          width={size}
          height={size}
          style={{ position: 'absolute', inset: 0, zIndex: 3 }}
        >
          {segs}
        </svg>
      ) : null}

      {/* Knob variant: tick ring + raised cylindrical knob + pointer. */}
      {variant === 'knob' ? (
        <>
          {/* tick ring */}
          <svg
            viewBox="0 0 200 200"
            width={size}
            height={size}
            style={{ position: 'absolute', inset: 0, zIndex: 2 }}
          >
            {Array.from({ length: 21 }).map((_, i) => {
              const a = GAP + SWEEP * (i / 20);
              const [x1, y1] = polar(cx, cy, 84, a);
              const [x2, y2] = polar(cx, cy, i % 5 === 0 ? 76 : 79, a);
              const lit = (i / 20) <= p + 0.001;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={lit ? 'var(--c)' : 'rgba(255,255,255,.16)'}
                  strokeWidth={i % 5 === 0 ? 2.4 : 1.4}
                  strokeLinecap="round"
                  style={{ filter: lit && !mini ? 'drop-shadow(0 0 4px var(--glow))' : 'none' }}
                />
              );
            })}
          </svg>

          {/* raised knob cylinder */}
          <div
            style={{
              position: 'absolute',
              inset: '24%',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 30%, #28344a, #141c2a 72%)',
              boxShadow: `${RAISED}, inset 0 1px 1px rgba(255,255,255,.1)`,
              zIndex: 4,
            }}
          />

          {/* pointer from knob center to value position on ring */}
          <svg
            viewBox="0 0 200 200"
            width={size}
            height={size}
            style={{ position: 'absolute', inset: 0, zIndex: 5 }}
          >
            <line
              x1={cx}
              y1={cy}
              x2={px}
              y2={py}
              stroke="var(--c-bright)"
              strokeWidth={4}
              strokeLinecap="round"
              style={{ filter: mini ? 'none' : 'drop-shadow(0 0 6px var(--glow))' }}
            />
            <circle cx={px} cy={py} r={4.6} fill="var(--c-bright)" />
          </svg>
        </>
      ) : (
        beadArc
      )}

      {/* Debossed value text. Knob variant uses a smaller centered
          readout because the knob occupies the middle. */}
      {!mini && variant !== 'knob' ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 6,
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
              color: 'var(--c-bright)',
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 1px 0 rgba(255,255,255,.07), 0 -1px 2px rgba(0,0,0,.6)',
            }}
          >
            {n}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 600,
              fontSize: size * 0.07,
              color: 'var(--text-lo)',
              letterSpacing: 1,
              marginTop: size * 0.01,
            }}
          >
            / 100
          </div>
        </div>
      ) : null}

      {!mini && variant === 'knob' ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: size * 0.2,
              color: 'var(--c-bright)',
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 -1px 2px rgba(0,0,0,.6)',
            }}
          >
            {n}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default GaugeNeu;
