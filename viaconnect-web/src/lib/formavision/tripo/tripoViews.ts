import { orderFrblPhotos, type PosePathRecord } from '@/lib/formavision/meshy/frblOrder';
import {
  TRIPO_MULTIVIEW_MODEL,
  TRIPO_VIEW_ORDER,
  isTripoViewId,
  type TripoCreateRequestBody,
  type TripoViewId,
  type TripoViewInput,
} from './types';

export function orderTripoViews(
  row: PosePathRecord,
  signedByPath: ReadonlyMap<string, string>,
): TripoViewInput[] {
  const photos = orderFrblPhotos(row);
  const byView = new Map<TripoViewId, string>();
  for (const photo of photos) {
    if (!isTripoViewId(photo.view)) continue;
    const url = signedByPath.get(photo.path);
    if (typeof url === 'string' && url.length > 0) {
      byView.set(photo.view, url);
    }
  }
  const ordered: TripoViewInput[] = [];
  for (const view of TRIPO_VIEW_ORDER) {
    const url = byView.get(view);
    if (url) ordered.push({ view, url });
  }
  return ordered;
}

export function buildTripoMultiviewBody(views: readonly TripoViewInput[]): TripoCreateRequestBody {
  return {
    model: TRIPO_MULTIVIEW_MODEL,
    inputs: views.map((item) => ({ [item.view]: item.url })),
    texture: true,
  };
}

export function tripoGlbStoragePath(userId: string, sessionId: string): string {
  return `${userId}/${sessionId}/tripo/visual.glb`;
}
