'use client';

import { POSES, type PoseId } from '@/lib/scan/poses';

/**
 * FormaVision pose title card.
 *
 * The pose how-to shown before each capture: pose label plus the coaching
 * hint. Stays until Continue / tap-through, or SCAN_POSE_TITLE_MS (8s).
 * Instrument Sans is Helix-scoped (global body font is Inter), so this
 * card opts in explicitly via the .font-instrument class rather than
 * relying on any global font-family change.
 *
 * Token discipline: the card background uses var(--card), never a raw
 * hex literal.
 */

export interface PoseTitleCardProps {
  pose: PoseId;
  index: number;
}

export function PoseTitleCard({ pose, index }: PoseTitleCardProps) {
  const meta = POSES.find((p) => p.id === pose);
  if (!meta) return null;

  return (
    <div
      data-testid="pose-title-card"
      data-pose={pose}
      className="font-instrument rounded-2xl px-6 py-8 text-center text-white shadow-card bg-[var(--card)]"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-white/60">
        Pose {index + 1} of {POSES.length}
      </p>
      <h2 className="mt-2 text-3xl font-semibold">{meta.label}</h2>
      <p className="mt-2 text-sm text-white/75">{meta.hint}</p>
    </div>
  );
}
