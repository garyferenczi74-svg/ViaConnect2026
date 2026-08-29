'use client';

/**
 * FormaVision debug skeleton overlay.
 *
 * Draws MediaPipe pose landmarks and their connecting segments over the
 * camera preview. Debug-only: renders null unless landmarks are explicitly
 * provided. Wiring this on behind a debug flag is a later task; this
 * component only owns the drawing itself.
 */

export interface SkeletonLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface SkeletonConnection {
  from: number;
  to: number;
}

export interface SkeletonOverlayProps {
  landmarks?: SkeletonLandmark[] | null;
  connections?: SkeletonConnection[];
}

export function SkeletonOverlay({
  landmarks,
  connections = [],
}: SkeletonOverlayProps) {
  if (!landmarks || landmarks.length === 0) return null;

  return (
    <svg
      data-testid="skeleton-overlay"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {connections.map((connection, i) => {
        const from = landmarks[connection.from];
        const to = landmarks[connection.to];
        if (!from || !to) return null;
        return (
          <line
            key={`skeleton-connection-${i}`}
            x1={`${from.x * 100}%`}
            y1={`${from.y * 100}%`}
            x2={`${to.x * 100}%`}
            y2={`${to.y * 100}%`}
            stroke="white"
            strokeOpacity={0.6}
            strokeWidth={2}
          />
        );
      })}
      {landmarks.map((point, i) => (
        <circle
          key={`skeleton-point-${i}`}
          cx={`${point.x * 100}%`}
          cy={`${point.y * 100}%`}
          r={3}
          fill="white"
          fillOpacity={0.8}
        />
      ))}
    </svg>
  );
}
