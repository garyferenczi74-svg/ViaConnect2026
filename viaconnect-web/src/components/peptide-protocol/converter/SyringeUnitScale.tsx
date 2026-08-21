'use client';

/**
 * Prompt 226: read-only syringe unit scale.
 * NOT draggable. NOT tap-to-set. Numeric result always in text.
 * Barrel markings mimic a real insulin syringe (1u / 5u / 10u ticks).
 * Full card width; marker and labels sit outside the tick band (no overlap).
 */

import { useMemo } from 'react';
import { severityToken } from '@/lib/genetics/severity';
import { CONVERTER_COPY } from '@/lib/peptides/converterMath';

export type ScaleState = 'normal' | 'precision' | 'error';

interface Props {
  units: number | null;
  barrelSize: 100 | 50 | 30;
  state: ScaleState;
  /** Accessible numeric label always present. */
  numericLabel: string;
}

function tierFor(state: ScaleState): 'low' | 'moderate' | 'high' {
  if (state === 'error') return 'high';
  if (state === 'precision') return 'moderate';
  return 'low';
}

type TickKind = 'minor' | 'mid' | 'major';

function tickKind(unit: number): TickKind {
  if (unit % 10 === 0) return 'major';
  if (unit % 5 === 0) return 'mid';
  return 'minor';
}

/** Tick geometry in a square-ish viewBox so none-stretch keeps vertical proportions. */
function tickGeom(kind: TickKind): { y1: number; y2: number; stroke: string; width: number } {
  if (kind === 'major') {
    return { y1: 4, y2: 44, stroke: 'rgba(255,255,255,0.65)', width: 1.4 };
  }
  if (kind === 'mid') {
    return { y1: 10, y2: 38, stroke: 'rgba(255,255,255,0.42)', width: 1.05 };
  }
  return { y1: 16, y2: 32, stroke: 'rgba(255,255,255,0.24)', width: 0.8 };
}

export function SyringeUnitScale({
  units,
  barrelSize,
  state,
  numericLabel,
}: Props) {
  const token = severityToken(tierFor(state));
  const hasMarker =
    units != null && Number.isFinite(units) && units >= 0 && units <= barrelSize;
  const clamped =
    units == null || !Number.isFinite(units)
      ? 0
      : Math.max(0, Math.min(barrelSize, units));

  const ticks = useMemo(() => {
    return Array.from({ length: barrelSize + 1 }, (_, unit) => ({
      unit,
      kind: tickKind(unit),
    }));
  }, [barrelSize]);

  const majors = useMemo(
    () => Array.from({ length: Math.floor(barrelSize / 10) + 1 }, (_, i) => i * 10),
    [barrelSize],
  );

  // Wide viewBox: X stretches to card; ticks only (no SVG text).
  const width = 1000;
  const height = 48;
  const edge = 0;
  const inset = 8;
  const barrelY = 2;
  const barrelH = 44;
  const innerLeft = inset;
  const innerW = width - inset * 2;
  const xFor = (unit: number) => innerLeft + (unit / barrelSize) * innerW;
  const fillW = (clamped / barrelSize) * innerW;
  // Percent across the SVG so the pill lines up with the plunger.
  const markerLeftPct = (xFor(clamped) / width) * 100;
  const markerLeftClamped = Math.min(92, Math.max(8, markerLeftPct));

  return (
    <div
      className="w-full space-y-2"
      data-testid="syringe-unit-scale"
      data-interactive="false"
    >
      <p className="text-xs text-white/55">{CONVERTER_COPY.scaleInstruction}</p>
      <p className="sr-only">{numericLabel}</p>
      <p
        className={`text-sm font-semibold ${token.badge} inline-flex px-2 py-0.5 rounded-full`}
        aria-live="polite"
      >
        {numericLabel}
      </p>

      <div
        className={`pep-glass--subtle relative w-full rounded-2xl p-3 ${token.matchedBorder}`}
        role="img"
        aria-label={numericLabel}
        onPointerDown={(e) => e.preventDefault()}
        onClick={(e) => e.preventDefault()}
        style={{ touchAction: 'none', userSelect: 'none' }}
        data-testid="syringe-barrel"
      >
        {/* Marker pill ABOVE the tube so it never covers ticks */}
        <div className="relative mb-1 h-6 w-full">
          {hasMarker ? (
            <div
              className="pointer-events-none absolute top-0 z-[2] -translate-x-1/2"
              style={{ left: `${markerLeftClamped}%` }}
              data-testid="syringe-marker-label"
            >
              <div
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shadow-sm ${token.pillActive}`}
              >
                {clamped.toFixed(1)} u
              </div>
            </div>
          ) : null}
        </div>

        {/* Tick band only (no text inside SVG) */}
        {/* Tick band stays opaque; glass is only the outer card (226b 4.5) */}
        <div className="relative w-full overflow-hidden rounded-xl border border-[var(--glass-border-226)] bg-[var(--deep-navy)]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            height="48"
            preserveAspectRatio="none"
            className="relative block h-12 w-full max-w-none"
            aria-hidden
            data-testid="syringe-tick-svg"
          >
            <rect
              x={edge}
              y={barrelY}
              width={width - edge * 2}
              height={barrelH}
              rx={10}
              ry={10}
              fill="rgba(15, 28, 52, 0.55)"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={1}
            />

            <rect
              x={innerLeft}
              y={barrelY + 3}
              width={Math.max(0, fillW)}
              height={barrelH - 6}
              rx={7}
              ry={7}
              fill={
                state === 'error'
                  ? 'rgba(248,113,113,0.35)'
                  : state === 'precision'
                    ? 'rgba(251,191,36,0.32)'
                    : 'rgba(45,165,160,0.38)'
              }
              data-testid="syringe-fill"
              style={{ pointerEvents: 'none' }}
            />

            {ticks.map(({ unit, kind }) => {
              const g = tickGeom(kind);
              const x = xFor(unit);
              return (
                <line
                  key={unit}
                  x1={x}
                  y1={g.y1}
                  x2={x}
                  y2={g.y2}
                  stroke={g.stroke}
                  strokeWidth={g.width}
                  strokeLinecap="round"
                  data-tick={kind}
                  data-unit={unit}
                />
              );
            })}

            {hasMarker ? (
              <g data-testid="syringe-indicator" style={{ pointerEvents: 'none' }}>
                <line
                  x1={xFor(clamped)}
                  y1={2}
                  x2={xFor(clamped)}
                  y2={46}
                  stroke="rgba(45,165,160,0.95)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                <circle
                  cx={xFor(clamped)}
                  cy={24}
                  r={5}
                  fill="#2DA5A0"
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth={1.25}
                />
              </g>
            ) : null}
          </svg>
        </div>

        {/* HTML labels under the tube: no SVG stretch distortion, no overlap with ticks */}
        <div
          className="mt-1.5 flex w-full justify-between px-0.5"
          data-testid="syringe-major-labels"
          aria-hidden
        >
          {majors.map((m) => (
            <span
              key={m}
              className="min-w-0 flex-1 text-center text-[10px] leading-none text-white/45"
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-white/40">
        Scale shows 1-unit ticks like a syringe barrel. Use the numeric result above. Indicator is
        not draggable.
      </p>
    </div>
  );
}
