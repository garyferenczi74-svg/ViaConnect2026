'use client';

/**
 * FormaVision level bubble.
 *
 * When device orientation is available, shows a bubble-level indicator that
 * highlights (Teal token) once the phone is within tolerance degrees of flat
 * on both beta (front/back tilt) and gamma (left/right tilt). When
 * orientation is unavailable (permission denied, unsupported device), shows
 * a fallback checklist instructing the viewer to place the phone on a flat
 * surface instead of a bubble that cannot reflect real orientation.
 *
 * Token discipline: aligned state uses the Teal token (border-teal / bg-teal),
 * never a raw hex literal.
 */

export interface LevelBubbleProps {
  beta: number;
  gamma: number;
  tolerance?: number;
  available: boolean;
  /** When orientation is unavailable, Continue / tap-through dismisses.
   * Duration only: copy stays Hannah-cleared. */
  onDismiss?: () => void;
}

const CHECKLIST_COPY = 'Place the phone on a flat surface';
const DEFAULT_TOLERANCE = 3;
const MAX_OFFSET_PX = 20;
const OFFSET_RANGE_DEG = 30;

function clampOffset(deg: number): number {
  const ratio = Math.max(-1, Math.min(1, deg / OFFSET_RANGE_DEG));
  return ratio * MAX_OFFSET_PX;
}

export function LevelBubble({
  beta,
  gamma,
  tolerance = DEFAULT_TOLERANCE,
  available,
  onDismiss,
}: LevelBubbleProps) {
  if (!available) {
    return (
      <div
        data-testid="level-bubble-unavailable"
        className="rounded-xl bg-navy-700 p-4 text-sm text-white"
        onClick={onDismiss}
      >
        <p className="font-semibold">Orientation unavailable</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-white/80">
          <li>{CHECKLIST_COPY}</li>
          <li>Allow motion and orientation access in your browser</li>
        </ul>
        {onDismiss ? (
          <button
            type="button"
            data-testid="scan-orientation-continue"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="mt-3 min-h-[44px] rounded-xl bg-[var(--teal)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Continue
          </button>
        ) : null}
      </div>
    );
  }

  const aligned = Math.abs(beta) <= tolerance && Math.abs(gamma) <= tolerance;
  const offsetX = clampOffset(gamma);
  const offsetY = clampOffset(beta);

  return (
    <div
      data-testid="level-bubble"
      data-aligned={aligned}
      aria-hidden="true"
      className={`relative h-16 w-16 rounded-full border-2 ${
        aligned ? 'border-teal' : 'border-white/50'
      }`}
    >
      <div
        className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ${
          aligned ? 'bg-teal' : 'bg-white/70'
        }`}
        style={{
          left: `calc(50% + ${offsetX}px)`,
          top: `calc(50% + ${offsetY}px)`,
        }}
      />
    </div>
  );
}
