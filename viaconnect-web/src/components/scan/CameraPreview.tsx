'use client';

import type { RefObject } from 'react';
import type { PoseId } from '@/lib/scan/poses';
import { PoseGhost } from './PoseGhost';

/**
 * Prompt 231: full-bleed rear-camera preview with the capture overlays
 * (pose ghost, foot mark, arbitrary children for countdown/level/title)
 * composed on top. The video element itself carries no chrome; overlays
 * "never cover body, readable 6-8 ft" per spec Section 8.
 *
 * Dev fallback: when the granted stream is not the rear camera (detected
 * from the live video track's facingMode where the browser reports it;
 * unknown counts as rear, never mislabeled), the preview mirrors via CSS
 * on the <video> element only and shows a small DEV badge. QA and any
 * future landmark overlay must never depend on this mirrored display, so
 * only the <video> gets the transform, never children.
 */
export interface CameraPreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  pose: PoseId | null;
  showFootMark: boolean;
  mirrored: boolean;
  children?: React.ReactNode;
}

export function CameraPreview({ videoRef, pose, showFootMark, mirrored, children }: CameraPreviewProps) {
  return (
    <div
      data-testid="camera-preview"
      className="relative h-full w-full overflow-hidden bg-navy-700"
    >
      <video
        ref={videoRef}
        data-testid="camera-preview-video"
        playsInline
        muted
        autoPlay
        className="h-full w-full object-cover"
        style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
      />

      {mirrored && (
        <span
          data-testid="camera-preview-dev-badge"
          className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80"
        >
          DEV: using user camera
        </span>
      )}

      {pose && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 pb-16 pt-10">
          <PoseGhost pose={pose} />
        </div>
      )}

      {showFootMark && (
        <div
          data-testid="camera-preview-foot-mark"
          aria-hidden
          className="pointer-events-none absolute bottom-[8%] left-1/2 h-3 w-16 -translate-x-1/2 rounded-full border-2 border-white/50"
        />
      )}

      {children}
    </div>
  );
}
