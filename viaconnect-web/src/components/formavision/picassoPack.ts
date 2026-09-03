// Gary-locked Picasso pack — bundled local PNGs only (Brief 59 LOOK amend).
// Never a remote Supabase Male/Female Avatar.svg.

import type { Sex } from '@/lib/formavision/geometry/types';
import {
  defaultFloorView,
  type FloorPlateView,
} from '@/lib/formavision/motion/floorMotionSpec';

export const PICASSO_PACK_BASE = '/formavision/picasso' as const;

export const PICASSO_PACK_FILES = [
  'male-front.png',
  'male-rear.png',
  'female-front.png',
  'female-rear.png',
] as const;

export const PICASSO_PACK = {
  male: {
    front: `${PICASSO_PACK_BASE}/male-front.png`,
    rear: `${PICASSO_PACK_BASE}/male-rear.png`,
  },
  female: {
    front: `${PICASSO_PACK_BASE}/female-front.png`,
    rear: `${PICASSO_PACK_BASE}/female-rear.png`,
  },
} as const;

export function picassoPackSrc(
  sex: Sex,
  view: FloorPlateView = defaultFloorView(),
): string {
  return PICASSO_PACK[sex][view];
}

export function isPicassoPackSrc(src: string): boolean {
  return src.startsWith(`${PICASSO_PACK_BASE}/`) && src.endsWith('.png');
}
