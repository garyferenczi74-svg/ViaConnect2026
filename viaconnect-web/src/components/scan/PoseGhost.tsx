'use client';

import type { PoseId } from '@/lib/scan/poses';

/**
 * FormaVision pose ghost silhouette.
 *
 * One inline SVG silhouette per pose, drawn as an outline only (white stroke
 * at 40 percent opacity, no fill) so the camera preview stays visible behind
 * it. The viewer lines their body up against the ghost during capture.
 *
 * Token discipline: stroke is the "white" keyword, never a raw hex literal.
 */

export interface PoseGhostProps {
  pose: PoseId;
}

const STROKE_PROPS = {
  stroke: 'white',
  strokeOpacity: 0.4,
  strokeWidth: 2,
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Front-facing silhouette: symmetric body outline, arms slightly out. */
function FrontSilhouette() {
  return (
    <>
      <circle cx="100" cy="40" r="22" {...STROKE_PROPS} />
      <path
        d="M100 62 L100 150 M100 80 L60 130 M100 80 L140 130 M100 150 L75 230 M100 150 L125 230"
        {...STROKE_PROPS}
      />
      <path d="M60 78 L140 78" {...STROKE_PROPS} />
    </>
  );
}

/** Right-profile silhouette: side outline facing right. */
function RightProfileSilhouette() {
  return (
    <>
      <circle cx="95" cy="40" r="22" {...STROKE_PROPS} />
      <path
        d="M95 62 C 80 90, 80 120, 95 150 M95 90 L130 110 M95 150 L90 230 M95 150 L120 225"
        {...STROKE_PROPS}
      />
    </>
  );
}

/** Back silhouette: same outline as front (no facial detail markers). */
function BackSilhouette() {
  return (
    <>
      <circle cx="100" cy="40" r="22" {...STROKE_PROPS} />
      <path
        d="M100 62 L100 150 M100 80 L60 130 M100 80 L140 130 M100 150 L75 230 M100 150 L125 230"
        {...STROKE_PROPS}
      />
    </>
  );
}

/** Left-profile silhouette: mirror of the right-profile outline. */
function LeftProfileSilhouette() {
  return (
    <>
      <circle cx="105" cy="40" r="22" {...STROKE_PROPS} />
      <path
        d="M105 62 C 120 90, 120 120, 105 150 M105 90 L70 110 M105 150 L110 230 M105 150 L80 225"
        {...STROKE_PROPS}
      />
    </>
  );
}

const SILHOUETTE_BY_POSE: Record<PoseId, () => React.JSX.Element> = {
  front: FrontSilhouette,
  right: RightProfileSilhouette,
  back: BackSilhouette,
  left: LeftProfileSilhouette,
};

export function PoseGhost({ pose }: PoseGhostProps) {
  const Silhouette = SILHOUETTE_BY_POSE[pose];

  return (
    <svg
      data-testid="pose-ghost"
      data-pose={pose}
      aria-hidden="true"
      viewBox="0 0 200 260"
      className="pointer-events-none h-full w-full"
    >
      <Silhouette />
    </svg>
  );
}
