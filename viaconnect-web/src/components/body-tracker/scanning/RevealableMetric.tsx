'use client';

// RevealableMetric.tsx  (Prompt #169b, spec section 3.2.4)
//
// Presentational wrappers for the "Hide specific numbers" mode. A metric whose
// number is hidden becomes tappable: tap-to-toggle reveals/re-hides it, and
// press-and-hold reveals it only while held. While hidden it shows a redacted
// stand-in (a trend arrow + confidence range, a sparkline shape, or nothing for
// avatar labels), per the surface.
//
// These take an already-computed display mode + the reveal callbacks from
// useNumbersOptional; the decision logic lives in the pure module
// src/lib/body-tracker/numbers-optional.ts. Lucide icons at strokeWidth 1.5; no
// dashes in copy.

import type { KeyboardEvent, ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight, ArrowRight, Lock } from 'lucide-react';
import type { MetricDisplayMode } from '@/lib/body-tracker/numbers-optional';

export type TrendDirection = 'up' | 'down' | 'flat';

interface RevealableMetricProps {
  mode: MetricDisplayMode;
  // Shown when mode === 'value'. The precise number.
  value: ReactNode;
  // Shown when mode === 'range' (composition: trend arrow + confidence range).
  range?: ReactNode;
  // Shown when mode === 'sparkline' (measurement: sparkline shape only).
  sparkline?: ReactNode;
  // Whether this metric can be tapped to reveal (mode is on and not revealed).
  revealable: boolean;
  // Reveal callbacks (from useNumbersOptional).
  onToggle: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  label: string;
}

// A small redacted placeholder for fully-hidden metrics (body fat % / visceral
// fat index) and avatar labels: a lock glyph, never a number.
export function RedactedDot({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-white/40 ${className}`}>
      <Lock className="h-2.5 w-2.5" strokeWidth={1.5} />
      <span className="text-[10px]">hidden</span>
    </span>
  );
}

// Trend arrow + confidence range, the composition-tab redaction. The arrow color
// is neutral (this is a body-image-safe surface: no good/bad framing).
export function TrendRange({ direction, range }: { direction: TrendDirection; range: string }) {
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : ArrowRight;
  return (
    <span className="inline-flex items-center gap-1 text-white/70">
      <Icon className="h-3.5 w-3.5 text-white/55" strokeWidth={1.5} />
      <span className="text-xs font-medium">{range}</span>
    </span>
  );
}

export function RevealableMetric({
  mode,
  value,
  range,
  sparkline,
  revealable,
  onToggle,
  onHoldStart,
  onHoldEnd,
  label,
}: RevealableMetricProps) {
  // When the value is visible there is nothing to reveal; render it plainly.
  if (mode === 'value') return <>{value}</>;

  const content =
    mode === 'range' ? (range ?? <RedactedDot />) :
    mode === 'sparkline' ? (sparkline ?? <RedactedDot />) :
    <RedactedDot />;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  if (!revealable) {
    // Defensive: should not happen (mode is non-value only when the flag is on),
    // but render the redacted content inert rather than as a dead button.
    return <span>{content}</span>;
  }

  return (
    <button
      type="button"
      aria-label={`Reveal ${label}`}
      title="Tap to reveal, or press and hold"
      onClick={onToggle}
      onKeyDown={onKeyDown}
      onPointerDown={onHoldStart}
      onPointerUp={onHoldEnd}
      onPointerLeave={onHoldEnd}
      onPointerCancel={onHoldEnd}
      className="inline-flex items-center rounded-md px-1 -mx-1 hover:bg-white/[0.06] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#2DA5A0]/60 cursor-pointer"
    >
      {content}
    </button>
  );
}

// A minimal SVG sparkline shape (no axis labels, no numbers): the measurement
// redaction. Points are normalized 0..1; renders as a smooth polyline. When
// fewer than two points are available it shows a flat baseline so the cell still
// reads as "a trend, hidden" rather than empty.
export function Sparkline({
  points,
  width = 44,
  height = 16,
  color = '#2DA5A0',
}: {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const usable = points.filter((p) => Number.isFinite(p));
  const series = usable.length >= 2 ? usable : [0.5, 0.5];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const stepX = width / (series.length - 1);
  const d = series
    .map((p, i) => {
      const x = i * stepX;
      // Invert y so larger values sit higher.
      const y = height - ((p - min) / span) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Trend sparkline, value hidden"
      className="overflow-visible"
    >
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
