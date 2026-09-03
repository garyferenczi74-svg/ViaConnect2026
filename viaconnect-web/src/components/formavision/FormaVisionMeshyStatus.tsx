'use client';

import { Loader2 } from 'lucide-react';
import type { MeshyVisualStatus } from '@/lib/formavision/meshy/types';
import { meshyStatusLabel } from '@/lib/formavision/meshy/honestyCopy';

export interface FormaVisionMeshyStatusProps {
  status: MeshyVisualStatus;
  progress?: number | null;
}

export function FormaVisionMeshyStatus({ status, progress = null }: FormaVisionMeshyStatusProps) {
  const label = meshyStatusLabel(status);
  if (!label) return null;
  const busy = status === 'pending' || status === 'in_progress';
  const pct =
    busy && typeof progress === 'number' && Number.isFinite(progress)
      ? Math.max(0, Math.min(100, Math.round(progress)))
      : null;

  return (
    <p
      data-testid="formavision-meshy-status"
      data-meshy-status={status}
      className="pointer-events-none absolute left-2 right-2 top-2 z-30 rounded-md bg-black/35 px-2 py-1 text-center text-[11px] leading-snug text-white/80 sm:text-xs"
    >
      {busy ? (
        <span className="inline-flex items-center justify-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" strokeWidth={1.5} />
          {label}
          {pct !== null ? ` ${pct}%` : ''}
        </span>
      ) : (
        label
      )}
    </p>
  );
}
