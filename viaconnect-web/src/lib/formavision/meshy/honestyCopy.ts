import type { MeshyVisualStatus } from './types';

export const MESHY_VISUAL_DISCLAIMER =
  'Generated visual from your photos. Not a measurement-grade body scan.';

export const MESHY_PROGRESS_COPY = 'Building a 3D visual from your photos';

export const MESHY_UNAVAILABLE_COPY =
  '3D visual from your photos is not available yet.';

export function meshyStatusLabel(status: MeshyVisualStatus): string | null {
  switch (status) {
    case 'pending':
    case 'in_progress':
      return MESHY_PROGRESS_COPY;
    case 'succeeded':
      return MESHY_VISUAL_DISCLAIMER;
    case 'failed':
    case 'moderation_blocked':
      return MESHY_UNAVAILABLE_COPY;
    case 'idle':
    case 'skipped_no_key':
      return null;
    default:
      return null;
  }
}
