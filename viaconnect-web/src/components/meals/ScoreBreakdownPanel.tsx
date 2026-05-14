'use client';

// Prompt #168 Apply A: Gordon score breakdown accordion.
// Card token #1E3054 surface; positive green, negative red, neutral white/60.
// Defaults to open on desktop via window width sniff at mount (simpler than
// requiring caller to wire useMediaQuery; avoids new hook surface in Apply A).

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ScoreBreakdown } from '@/lib/gordon/types';

export interface ScoreBreakdownPanelProps {
  readonly breakdown: ScoreBreakdown;
  readonly defaultOpen?: boolean;
}

function valueColor(value: number): string {
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return 'text-white/60';
}

function formatValue(value: number): string {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export function ScoreBreakdownPanel(props: ScoreBreakdownPanelProps) {
  const { breakdown, defaultOpen } = props;
  const [open, setOpen] = useState<boolean>(() => {
    if (defaultOpen !== undefined) return defaultOpen;
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 768;
  });

  useEffect(() => {
    if (defaultOpen !== undefined) {
      setOpen(defaultOpen);
    }
  }, [defaultOpen]);

  return (
    <section className="font-[Instrument_Sans] rounded-2xl border border-white/10 bg-[#1E3054] text-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-[14px] font-medium text-white/95"
      >
        <span>Score breakdown</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-white/70" strokeWidth={1.5} />
        ) : (
          <ChevronDown className="h-4 w-4 text-white/70" strokeWidth={1.5} />
        )}
      </button>

      {open ? (
        <div className="border-t border-white/10 px-4 py-3">
          <ul className="space-y-2">
            {breakdown.modifiers.map((modifier, idx) => (
              <li
                key={`${modifier.name}-${idx}`}
                className="flex flex-col gap-0.5 border-b border-white/10 pb-2 last:border-b-0 last:pb-0"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] text-white/85">{modifier.name}</span>
                  <span
                    className={`text-[13px] font-semibold tabular-nums ${valueColor(modifier.value)}`}
                  >
                    {formatValue(modifier.value)}
                  </span>
                </div>
                <span className="text-[12px] text-white/60">{modifier.note}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/40">
            <span>Calculated {formatTimestamp(breakdown.calculated_at)}</span>
            <span>Gordon {breakdown.gordon_version}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ScoreBreakdownPanel;
