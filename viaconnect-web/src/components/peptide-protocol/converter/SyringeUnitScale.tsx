'use client';

/**
 * Prompt 226: read-only syringe unit scale.
 * NOT draggable. NOT tap-to-set. Numeric result always in text.
 * Barrel markings mimic a real insulin syringe (1u / 5u / 10u ticks).
 * Barrel SVG stretches to the full card width.
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

/** Tick geometry in SVG viewBox units (barrel band is y=10..50). */
function tickGeom(kind: TickKind): { y1: number; y2: number; stroke: string; width: number } {
  if (kind === 'major') {
    return { y1: 10, y2: 50, stroke: 'rgba(255,255,255,0.62)', width: 1.35 };
  }
  if (kind === 'mid') {
    return { y1: 16, y2: 46, stroke: 'rgba(255,255,255,0.42)', width: 1.05 };
  }
  return { y1: 22, y2: 42, stroke: 'rgba(255,255,255,0.24)', width: 0.8 };
}

export function SyringeUnitScale({
  units,
  barrelSize,
  state,
  numericLabel,
}: Props) {
  const token = severityToken(tierFor(state));
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

  // Logical viewBox; preserveAspectRatio=none stretches X to the card width.
  const width = 1000;
  const height = 76;
  const edge = 2;
  const labelPad = 10;
  const barrelY = 10;
  const barrelH = 40;
  const innerLeft = labelPad;
  const innerRight = width - labelPad;
  const innerW = innerRight - innerLeft;
  const xFor = (unit: number) => innerLeft + (unit / barrelSize) * innerW;
  const fillW = (clamped / barrelSize) * innerW;
  const markerLeftPct = (xFor(clamped) / width) * 100;

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
        className={`relative w-full overflow-hidden rounded-2xl border bg-[#15243f] ${token.matchedBorder}`}
        role="img"
        aria-label={numericLabel}
        onPointerDown={(e) => e.preventDefault()}
        onClick={(e) => e.preventDefault()}
        style={{ touchAction: 'none', userSelect: 'none' }}
        data-testid="syringe-barrel"
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height="76"
          preserveAspectRatio="none"
          className="relative block h-[76px] w-full max-w-none"
          aria-hidden
          data-testid="syringe-tick-svg"
        >
          {/* Barrel tube spans nearly the full card */}
          <rect
            x={edge}
            y={barrelY}
            width={width - edge * 2}
            height={barrelH}
            rx={12}
            ry={12}
            fill="rgba(26,39,68,0.75)"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1.25}
          />

          {/* Dose fill (left to marker) */}
          <rect
            x={innerLeft}
            y={barrelY + 3}
            width={Math.max(0, fillW)}
            height={barrelH - 6}
            rx={8}
            ry={8}
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

          {/* Graduation lines: every 1u, taller at 5u / 10u like a real syringe */}
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

          {/* Major labels under the barrel */}
          {majors.map((m) => (
            <text
              key={`label-${m}`}
              x={xFor(m)}
              y={72}
              textAnchor="middle"
              fill="rgba(255,255,255,0.42)"
              fontSize={11}
              fontFamily="system-ui, sans-serif"
            >
              {m}
            </text>
          ))}

          {/* Plunger / dose marker */}
          {units != null && Number.isFinite(units) && units <= barrelSize ? (
            <g data-testid="syringe-indicator" style={{ pointerEvents: 'none' }}>
              <line
                x1={xFor(clamped)}
                y1={barrelY - 2}
                x2={xFor(clamped)}
                y2={barrelY + barrelH + 2}
                stroke="rgba(45,165,160,0.95)"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              <circle
                cx={xFor(clamped)}
                cy={barrelY + barrelH / 2}
                r={5}
                fill="#2DA5A0"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth={1.25}
              />
            </g>
          ) : null}
        </svg>

        {units != null && Number.isFinite(units) && units <= barrelSize ? (
          <div
            className="pointer-events-none absolute top-0.5 z-[2] -translate-x-1/2"
            style={{ left: `${markerLeftPct}%` }}
          >
            <div
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${token.pillActive}`}
            >
              {clamped.toFixed(1)} u
            </div>
          </div>
        ) : null}
      </div>
      <p className="text-[10px] text-white/40">
        Scale shows 1-unit ticks like a syringe barrel. Use the numeric result above. Indicator is
        not draggable.
      </p>
    </div>
  );
}
