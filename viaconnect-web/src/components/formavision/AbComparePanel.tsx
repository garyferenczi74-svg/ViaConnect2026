'use client';

// Prompt Brief 2: 3D A/B compare controls for /body-tracker/formavision.
//
// Dual-home toggle (md+ top row, phone above Journey) keeps the 210m layout
// contract. The wipe slider, baseline picker, and measurement deltas live in a
// single controls slot so they are not duplicated. Circumference deltas only;
// UNKNOWN omitted, never shown as 0. Lucide 1.5. Existing palette. No drug pairing.

import { ArrowDown, ArrowUp, Minus, MoveHorizontal, SplitSquareVertical } from 'lucide-react';
import type { CircumferenceDelta } from '@/lib/formavision/deltas/compositionDeltas';
import type { AbBaselineKind, AbBaselineMode } from '@/lib/formavision/compare/resolveAbBaseline';
import { wipePercentFromT, wipeTFromPercent } from '@/lib/formavision/compare/abWipe';

export type AbComparePlacement = 'top' | 'phone' | 'controls';

export interface AbComparePanelContentProps {
  comparable: boolean;
  compareOn: boolean;
  onToggle: () => void;
  baselineMode: AbBaselineMode;
  onBaselineModeChange: (mode: AbBaselineMode) => void;
  baselineKind: AbBaselineKind | null;
  wipeT: number;
  onWipeTChange: (t: number) => void;
  deltas: CircumferenceDelta[];
  placement: AbComparePlacement;
  reducedMotion?: boolean;
}

function formatVal(value: number, unit: string): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)} ${unit}`;
}

function directionPresentation(direction: CircumferenceDelta['direction']): {
  Icon: typeof ArrowDown;
  toneClass: string;
} {
  if (direction === 'improved') return { Icon: ArrowDown, toneClass: 'text-[#2DA5A0]' };
  if (direction === 'worsened') return { Icon: ArrowUp, toneClass: 'text-white/80' };
  return { Icon: Minus, toneClass: 'text-white/50' };
}

function ToggleButton({
  comparable,
  compareOn,
  onToggle,
}: Pick<AbComparePanelContentProps, 'comparable' | 'compareOn' | 'onToggle'>) {
  return (
    <button
      type="button"
      data-testid="comparison-overlay-toggle"
      aria-pressed={compareOn}
      disabled={!comparable}
      onClick={onToggle}
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/15 bg-[#0D1520]/85 px-2.5 py-1.5 text-[11px] font-medium text-white/80 disabled:opacity-40"
    >
      <SplitSquareVertical className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
      {compareOn ? 'Hide A/B Compare' : 'Show A/B Compare'}
    </button>
  );
}

export function AbComparePanelContent({
  comparable,
  compareOn,
  onToggle,
  baselineMode,
  onBaselineModeChange,
  baselineKind,
  wipeT,
  onWipeTChange,
  deltas,
  placement,
  reducedMotion = false,
}: AbComparePanelContentProps) {
  if (placement === 'top' || placement === 'phone') {
    const phone = placement === 'phone';
    return (
      <div
        data-testid={phone ? 'comparison-overlay-home-phone' : 'comparison-overlay-home-top'}
        className={
          phone
            ? 'flex flex-col items-center gap-1 md:hidden'
            : 'hidden max-w-[14rem] flex-col items-end gap-1 md:flex'
        }
      >
        <ToggleButton comparable={comparable} compareOn={compareOn} onToggle={onToggle} />
        {!comparable && (
          <p
            className={
              phone
                ? 'max-w-xs text-center text-[10px] leading-snug text-white/45'
                : 'text-right text-[10px] leading-snug text-white/45'
            }
          >
            Comparison needs a prior scan. Complete a second scan to wipe against your last body.
          </p>
        )}
      </div>
    );
  }

  if (!compareOn) {
    return null;
  }

  const pct = wipePercentFromT(wipeT);
  const fallbackNote = baselineKind === 'first_scan_fallback';

  return (
    <div
      data-testid="ab-compare-controls"
      className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 backdrop-blur-md sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-white/40">A/B Compare</p>
        <p className="text-[10px] text-white/45">Parametric body. No photographic reconstruction.</p>
      </div>

      <div
        role="radiogroup"
        aria-label="Compare baseline"
        className="flex flex-col gap-2 sm:flex-row"
      >
        <button
          type="button"
          role="radio"
          aria-checked={baselineMode === 'last_scan'}
          data-testid="ab-baseline-last-scan"
          onClick={() => onBaselineModeChange('last_scan')}
          className={`min-h-[44px] flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
            baselineMode === 'last_scan'
              ? 'border-[#2DA5A0]/60 bg-[#2DA5A0]/15 text-[#2DA5A0]'
              : 'border-white/20 bg-white/[0.04] text-white/60'
          }`}
        >
          Last scan
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={baselineMode === 'protocol_start'}
          data-testid="ab-baseline-protocol-start"
          onClick={() => onBaselineModeChange('protocol_start')}
          className={`min-h-[44px] flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
            baselineMode === 'protocol_start'
              ? 'border-[#B75E18]/60 bg-[#B75E18]/15 text-[#B75E18]'
              : 'border-white/20 bg-white/[0.04] text-white/60'
          }`}
        >
          Protocol start
        </button>
      </div>

      {fallbackNote && (
        <p data-testid="ab-baseline-fallback-note" className="text-[11px] leading-snug text-white/55">
          No protocol start on file. Showing your first scan.
        </p>
      )}

      <label className="flex flex-col gap-2">
        <span className="flex items-center justify-between text-[11px] text-white/60">
          <span>Before</span>
          <span className="inline-flex items-center gap-1">
            <MoveHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            Wipe
          </span>
          <span>After</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          data-testid="ab-wipe-slider"
          aria-label="A/B wipe between baseline and current"
          onChange={(e) => onWipeTChange(wipeTFromPercent(Number(e.target.value)))}
          className={`h-11 w-full accent-[#2DA5A0] ${reducedMotion ? '' : ''}`}
        />
      </label>

      <div data-testid="ab-compare-deltas">
        <p className="text-xs uppercase tracking-wider text-white/40">Measurement deltas</p>
        {deltas.length === 0 ? (
          <p data-testid="ab-compare-deltas-empty" className="mt-2 text-sm text-white/60">
            No measured changes to show. Unknown values are omitted, never shown as 0.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {deltas.map((row) => {
              const present = directionPresentation(row.direction);
              return (
                <li
                  key={row.key}
                  data-testid={`ab-delta-${row.key}`}
                  data-direction={row.direction}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2"
                >
                  <span className="text-sm text-white/80">{row.label}</span>
                  <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${present.toneClass}`}>
                    <present.Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    {formatVal(Math.abs(row.delta), row.unit)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export interface AbWipeSplitOverlayProps {
  wipeT: number;
  visible: boolean;
}

export function AbWipeSplitOverlay({ wipeT, visible }: AbWipeSplitOverlayProps) {
  if (!visible) return null;
  const left = `${wipePercentFromT(wipeT)}%`;
  return (
    <div
      data-testid="ab-wipe-split"
      className="pointer-events-none absolute inset-0 z-10"
      aria-hidden="true"
    >
      <div className="absolute top-0 bottom-0 w-0.5 bg-white/80" style={{ left }} />
      <span className="absolute top-3 left-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
        Before
      </span>
      <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
        After
      </span>
    </div>
  );
}
