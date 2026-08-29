'use client';

import { Check, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { POSES, POSE_ORDER, type PoseId } from '@/lib/scan/poses';
import type { ScanFrame } from '@/lib/scan/types';

/**
 * Prompt 231: the four-tile Review screen. Tap a tile to retake that pose;
 * Use these scans submits (Task 13 wires the real write); Discard revokes
 * every real object URL and returns to My Biology.
 *
 * Interface contract (Task 5 ruling, progress.md): a skipped frame carries
 * skipped:true and objectUrl:''. This component branches on `skipped`
 * FIRST and never renders that empty objectUrl as an <img src>.
 *
 * Token discipline: var(--card) / var(--teal) / var(--orange), no raw hex.
 */
export interface ScanReviewProps {
  frames: ReadonlyArray<ScanFrame | null>;
  voiceEnabled: boolean;
  voiceAvailable: boolean;
  onToggleVoice: () => void;
  onRetake: (poseIndex: number) => void;
  onDiscard: () => void;
  onSubmit: () => void;
  submitDisabled: boolean;
  submitDisabledReason?: string;
  submitError?: string;
}

function tileLabel(pose: PoseId): string {
  return POSES.find((p) => p.id === pose)?.label ?? pose;
}

export function ScanReview({
  frames,
  voiceEnabled,
  voiceAvailable,
  onToggleVoice,
  onRetake,
  onDiscard,
  onSubmit,
  submitDisabled,
  submitDisabledReason,
  submitError,
}: ScanReviewProps) {
  return (
    <div className="font-instrument space-y-4" data-testid="scan-review">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Review your scan</h2>
        {voiceAvailable && (
          <button
            type="button"
            data-testid="scan-review-voice-toggle"
            aria-pressed={voiceEnabled}
            onClick={onToggleVoice}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70"
          >
            {voiceEnabled ? (
              <Volume2 className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <VolumeX className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3" data-testid="scan-review-tiles">
        {POSE_ORDER.map((pose, index) => {
          const frame = frames[index] ?? null;
          const label = tileLabel(pose);

          return (
            <button
              key={pose}
              type="button"
              data-testid={`scan-review-tile-${pose}`}
              onClick={() => onRetake(index)}
              className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-[var(--card)] text-left"
            >
              {frame && !frame.skipped ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- object URL, not an optimizable remote asset */}
                  <img
                    src={frame.objectUrl}
                    alt={`${label} pose`}
                    className="h-full w-full object-cover"
                  />
                  <span
                    className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--teal)] text-white"
                    aria-hidden
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </span>
                </>
              ) : frame && frame.skipped ? (
                <div
                  data-testid={`scan-review-tile-${pose}-skipped`}
                  className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/50"
                >
                  <X className="h-6 w-6" strokeWidth={1.5} />
                  <span className="text-xs font-medium">Skipped</span>
                </div>
              ) : (
                <div
                  data-testid={`scan-review-tile-${pose}-missing`}
                  className="flex h-full w-full items-center justify-center text-xs text-white/40"
                >
                  Missing
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-white">
                  {label}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-white/70">
                  <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
                  Retake
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {submitError && (
        <p className="text-xs text-red-300" data-testid="scan-review-submit-error">
          {submitError}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          data-testid="scan-review-discard"
          onClick={onDiscard}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80"
        >
          Discard
        </button>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            data-testid="scan-review-submit"
            onClick={onSubmit}
            disabled={submitDisabled}
            className="rounded-xl bg-[var(--teal)] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Use these scans
          </button>
          {submitDisabled && submitDisabledReason && (
            <p className="text-right text-[11px] text-white/50" data-testid="scan-review-submit-note">
              {submitDisabledReason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
