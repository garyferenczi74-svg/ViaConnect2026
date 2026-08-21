'use client';

/**
 * Prompt 226: read-only syringe unit scale.
 * NOT draggable. NOT tap-to-set. Numeric result always in text.
 */

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
  const pct = barrelSize > 0 ? (clamped / barrelSize) * 100 : 0;
  const majors = Array.from({ length: Math.floor(barrelSize / 10) + 1 }, (_, i) => i * 10);

  return (
    <div
      className="space-y-2"
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
        className={`relative h-12 rounded-xl border bg-[#1E3054]/80 ${token.matchedBorder}`}
        role="img"
        aria-label={numericLabel}
        // Read-only: no pointer handlers that set dose
        onPointerDown={(e) => e.preventDefault()}
        onClick={(e) => e.preventDefault()}
        style={{ touchAction: 'none', userSelect: 'none' }}
      >
        <div
          className={`absolute left-0 top-0 bottom-0 rounded-l-xl transition-[width] ${token.rowGlassMatched}`}
          style={{ width: `${pct}%`, pointerEvents: 'none' }}
          data-testid="syringe-fill"
        />
        {units != null && Number.isFinite(units) && units <= barrelSize ? (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none"
            style={{ left: `${pct}%` }}
            data-testid="syringe-indicator"
          >
            <div
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${token.pillActive}`}
            >
              {clamped.toFixed(1)} u
            </div>
          </div>
        ) : null}
        <div className="absolute inset-x-2 bottom-1 flex justify-between pointer-events-none">
          {majors.map((m) => (
            <div key={m} className="flex flex-col items-center">
              <div className="w-px h-2 bg-white/30" />
              <span className="text-[9px] text-white/35">{m}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-white/40">
        Scale is decorative. Use the numeric result above. Indicator is not draggable.
      </p>
    </div>
  );
}
