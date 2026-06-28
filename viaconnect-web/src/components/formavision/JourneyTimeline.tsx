'use client';

// Prompt 210b P3-T2b: the JourneyTimeline scrubber, the Time Machine UI. Drags
// and plays the user's journey across REAL scans and drives the avatar body via
// the scrubVector prop (P3-T2a renders it directly with no tween).
//
// Honesty contract: only real scans are snap points (never a fabricated scan).
// The body SHAPE interpolates between two adjacent real scans (the magic) via
// lerpParamVector (the shared interpolation core, no second impl). The NUMBERS
// in the readout are real-scan-only: at a snap they are that scan's measured
// values; between scans they are shown as a labeled visual transition
// ("Transitioning between [dateA] and [dateB]") and never presented as a
// measured value at the in-between position (readout-honesty choice (b)).
//
// Reduced motion: Play JUMPS scan to scan (snap + brief pause), no smooth
// interpolation; dragging snaps to the nearest real scan. No fabricated frames.
//
// Resting: on release the scrubVector is left at the last position (the avatar
// stays at that shape and normal morph resumes from there per P3-T2a). The
// scrubber rests at the latest scan on mount (sensible default).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';
import { lerpParamVector } from '@/lib/formavision/geometry/lerpParamVector';
import {
  buildSnapPositions,
  resolveReadoutMode,
  resolveTimelinePosition,
  snapPositionToNearestScan,
  positionForIndex,
  type ReadoutMode,
} from '@/lib/formavision/timeline/journeyTimeline';

// Per-scan readout values. Numbers are the REAL measured values for that scan
// (null === UNKNOWN, never fabricated, never 0).
export interface JourneyScanReadout {
  recordedAt: string;
  totalBodyFatPct: number | null;
  // A key circumference (waist) in the active unit, or null when UNKNOWN.
  waist: number | null;
}

export interface JourneyTimelineProps {
  // One BodyParamVector per real scan, oldest first. These are the snap points.
  vectors: BodyParamVector[];
  // Per-scan readout values, aligned by index to vectors.
  readouts: JourneyScanReadout[];
  // The active measurement unit, for the circumference readout label.
  unit: 'in' | 'cm';
  reducedMotion?: boolean;
  // Push the current scrub shape to the avatar. null clears scrub (rest).
  onScrub: (vec: BodyParamVector | null) => void;
  // P8-T1b: telemetry seam. Called once when the Play button is pressed to start
  // playback (formavision.journey_played). Absent means no telemetry.
  onPlay?: () => void;
  className?: string;
}

const PLAY_DURATION_MS = 4000; // first to latest cinematic length
const REDUCED_STEP_PAUSE_MS = 700; // dwell on each scan when reduced motion

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatPct(v: number | null): string {
  if (v === null || v === 0) return 'Not measured';
  return `${(Math.round(v * 10) / 10).toFixed(1)}%`;
}

function formatLen(v: number | null, unit: string): string {
  if (v === null || v === 0) return 'Not measured';
  return `${(Math.round(v * 10) / 10).toFixed(1)} ${unit}`;
}

export function JourneyTimeline({
  vectors,
  readouts,
  unit,
  reducedMotion = false,
  onScrub,
  onPlay,
  className,
}: JourneyTimelineProps) {
  const count = vectors.length;
  const last = Math.max(0, count - 1);

  // Position is a normalized [0, 1] value over the scans. Rest at latest.
  const [position, setPosition] = useState(1);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const playStartRef = useRef<number | null>(null);
  const reducedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const snaps = useMemo(() => buildSnapPositions(count), [count]);

  // The scrub vector for a normalized position: interpolate the two adjacent
  // real scan vectors at the local t. At a snap this equals that scan's vector.
  const vectorForPosition = useCallback(
    (p: number): BodyParamVector | null => {
      if (count === 0) return null;
      if (count === 1) return vectors[0];
      const pos = resolveTimelinePosition(p, count);
      const a = vectors[pos.indexA];
      const b = vectors[pos.indexB];
      if (!a || !b) return null;
      return lerpParamVector(a, b, pos.localT);
    },
    [vectors, count],
  );

  // Apply a position: set state and push the scrub shape to the avatar.
  const applyPosition = useCallback(
    (p: number) => {
      setPosition(p);
      onScrub(vectorForPosition(p));
    },
    [onScrub, vectorForPosition],
  );

  const stopPlay = useCallback(() => {
    setPlaying(false);
    playStartRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (reducedTimerRef.current !== null) {
      clearTimeout(reducedTimerRef.current);
      reducedTimerRef.current = null;
    }
  }, []);

  // Cleanup any running animation on unmount.
  useEffect(() => stopPlay, [stopPlay]);

  // Continuous (full motion) play: animate position 0 -> 1 over PLAY_DURATION_MS.
  const runSmoothPlay = useCallback(() => {
    const tick = (now: number) => {
      if (playStartRef.current === null) playStartRef.current = now;
      const elapsed = now - playStartRef.current;
      const p = Math.min(1, elapsed / PLAY_DURATION_MS);
      applyPosition(p);
      if (p >= 1) {
        stopPlay();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [applyPosition, stopPlay]);

  // Reduced motion play: JUMP scan to scan with a dwell, no interpolation.
  const runJumpPlay = useCallback(() => {
    let i = 0;
    const stepTo = (index: number) => {
      applyPosition(positionForIndex(index, count));
    };
    stepTo(0);
    const advance = () => {
      i += 1;
      if (i > last) {
        stopPlay();
        return;
      }
      stepTo(i);
      reducedTimerRef.current = setTimeout(advance, REDUCED_STEP_PAUSE_MS);
    };
    reducedTimerRef.current = setTimeout(advance, REDUCED_STEP_PAUSE_MS);
  }, [applyPosition, count, last, stopPlay]);

  const togglePlay = useCallback(() => {
    if (playing) {
      stopPlay();
      return;
    }
    if (count < 2) return;
    setPlaying(true);
    playStartRef.current = null;
    // P8-T1b: signal the journey_played telemetry seam when play starts.
    onPlay?.();
    // Always start a play from the beginning of the journey.
    if (reducedMotion) {
      runJumpPlay();
    } else {
      runSmoothPlay();
    }
  }, [playing, count, reducedMotion, runJumpPlay, runSmoothPlay, stopPlay, onPlay]);

  // Manual scrub from the slider. Reduced motion snaps to the nearest scan.
  const handleScrubInput = useCallback(
    (raw: number) => {
      if (playing) stopPlay();
      const p = reducedMotion ? snapPositionToNearestScan(raw, count) : raw;
      applyPosition(p);
    },
    [applyPosition, playing, reducedMotion, count, stopPlay],
  );

  // Keyboard: arrows step between scans (always snap to a real scan).
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (count < 2) return;
      const pos = resolveTimelinePosition(position, count);
      let target = pos.nearestIndex;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        target = Math.min(last, pos.nearestIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        target = Math.max(0, pos.nearestIndex - 1);
      } else if (e.key === 'Home') {
        target = 0;
      } else if (e.key === 'End') {
        target = last;
      } else {
        return;
      }
      e.preventDefault();
      if (playing) stopPlay();
      applyPosition(positionForIndex(target, count));
    },
    [count, last, position, playing, applyPosition, stopPlay],
  );

  // Honest empty / disabled state: a single scan or no history is never a fake
  // timeline. The avatar still shows the single scan; we invite another.
  if (count < 2) {
    return (
      <div
        data-testid="journey-timeline-empty"
        className={`rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 text-center backdrop-blur-sm ${className ?? ''}`}
      >
        <p className="text-xs uppercase tracking-wider text-white/40">Your Journey</p>
        <p className="mt-2 text-sm text-white/60">
          Log another scan to see your journey come to life over time.
        </p>
      </div>
    );
  }

  const pos = resolveTimelinePosition(position, count);
  const readoutMode: ReadoutMode = resolveReadoutMode(pos);

  // The readout always shows REAL numbers from a real scan. Between scans it is
  // labeled a visual transition and shows the nearest scan's measured values.
  const shownIndex =
    readoutMode.kind === 'measured' ? readoutMode.scanIndex : readoutMode.nearestIndex;
  const shown = readouts[shownIndex];

  // Slider value uses scan-index space so the native step lands on snaps.
  const sliderValue = position * last;

  return (
    <div
      data-testid="journey-timeline"
      className={`rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 backdrop-blur-sm ${className ?? ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wider text-white/40">Your Journey</p>
        <button
          type="button"
          data-testid="journey-play"
          aria-label={playing ? 'Pause journey' : 'Play journey'}
          aria-pressed={playing}
          onClick={togglePlay}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#2DA5A0]/40 bg-[#2DA5A0]/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#2DA5A0]/20"
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Play className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          )}
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>

      {/* Track + snap markers + draggable handle (native range input for drag,
          keyboard, and aria slider semantics). */}
      <div
        className="relative mt-4 min-h-[44px]"
        role="group"
        aria-label="Journey timeline scrubber"
        onKeyDown={handleKeyDown}
      >
        {/* Visual track. */}
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/15" />
        {/* Progress fill up to the handle. */}
        <div
          className="pointer-events-none absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#2DA5A0]"
          style={{ width: `${position * 100}%` }}
        />
        {/* Snap markers, one per real scan. */}
        {snaps.map((s) => (
          <span
            key={s.index}
            data-testid={`journey-snap-${s.index}`}
            className="pointer-events-none absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-[#1E3054]"
            style={{ left: `${s.p * 100}%` }}
            aria-hidden="true"
          />
        ))}
        {/* The real input: spans index space 0..last with native snapping. The
            visible handle is the input thumb (styled via accent color). */}
        <input
          type="range"
          data-testid="journey-range"
          min={0}
          max={last}
          step={reducedMotion ? 1 : 0.001}
          value={sliderValue}
          onChange={(e) => handleScrubInput(Number(e.target.value) / last)}
          aria-label="Scrub through your scan history"
          aria-valuetext={
            readoutMode.kind === 'measured'
              ? `${readouts[shownIndex] ? formatDate(readouts[shownIndex].recordedAt) : ''}`
              : `Transitioning between ${readouts[pos.indexA] ? formatDate(readouts[pos.indexA].recordedAt) : ''} and ${readouts[pos.indexB] ? formatDate(readouts[pos.indexB].recordedAt) : ''}`
          }
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent accent-[#2DA5A0]"
        />
      </div>

      {/* Readout in lockstep. Numbers are real-scan-only. */}
      <div className="mt-4" data-testid="journey-readout">
        {readoutMode.kind === 'transition' ? (
          <p data-testid="journey-transition-label" className="text-xs font-medium text-[#2DA5A0]">
            Transitioning between {readouts[pos.indexA] ? formatDate(readouts[pos.indexA].recordedAt) : ''} and{' '}
            {readouts[pos.indexB] ? formatDate(readouts[pos.indexB].recordedAt) : ''}
          </p>
        ) : (
          <p data-testid="journey-measured-date" className="text-xs font-medium text-white/70">
            {formatDate(shown.recordedAt)}
          </p>
        )}

        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
          <span className="text-sm text-white/80">
            <span className="text-white/40">Body fat </span>
            {formatPct(shown.totalBodyFatPct)}
          </span>
          <span className="text-sm text-white/80">
            <span className="text-white/40">Waist </span>
            {formatLen(shown.waist, unit)}
          </span>
        </div>

        {readoutMode.kind === 'transition' && (
          <p className="mt-2 text-[10px] leading-relaxed text-white/35">
            The body shape is a visual transition between your measured scans. The numbers shown are from your {formatDate(shown.recordedAt)} scan, the nearest measured point.
          </p>
        )}
      </div>
    </div>
  );
}
