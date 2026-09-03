import { FRBL_ORDER, type FrblPhoto } from './types';
import type { PoseId } from '@/lib/scan/poses';

export type PosePathRecord = Partial<Record<`${PoseId}_full_path`, string | null | undefined>>;

/**
 * Resolve 1-4 full-body photo paths in Front, Right, Back, Left order.
 * Missing poses are skipped. Front is always first when present.
 */
export function orderFrblPhotos(row: PosePathRecord): FrblPhoto[] {
  const photos: FrblPhoto[] = [];
  for (const view of FRBL_ORDER) {
    const path = row[`${view}_full_path`];
    if (typeof path === 'string' && path.length > 0) {
      photos.push({ view, path });
    }
  }
  return photos;
}

export function frblGlbStoragePath(userId: string, sessionId: string): string {
  return `${userId}/${sessionId}/meshy/visual.glb`;
}
