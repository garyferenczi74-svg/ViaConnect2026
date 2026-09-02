'use client';

// Always-paint 2D floor for the FormaVision plate. Inline SVG — no remote
// Supabase Male/Female Avatar.svg. Arnold box + Gary phone: context-loss
// latched the remote heatmap and a slow/failing SVG left a ~341px empty
// bordered plate. This silhouette is bundled with the JS so the plate
// paints even when storage is unreachable.

import type { Sex } from '@/lib/formavision/geometry/types';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';

export const FORMAVISION_LOCAL_SILHOUETTE_TESTID = 'formavision-local-silhouette';

export interface FormaVisionLocalSilhouetteProps {
  sex: Sex;
  className?: string;
}

// Geometric body outline. Male is broader at the shoulders; female is
// broader at the hips. Not a morph and not a measurement — fallback paint.
function silhouettePath(sex: Sex): string {
  if (sex === 'female') {
    return [
      'M100 18',
      'c12 0 22 10 22 24',
      'c0 12-8 22-20 24',
      'c-2 10-4 16-6 22',
      'c18 4 32 16 38 34',
      'c8 22 6 48-2 70',
      'c-4 12-10 22-14 28',
      'v52',
      'c0 28 2 48 4 62',
      'c1 8-4 14-12 14',
      'c-8 0-12-6-13-14',
      'c-2-16-4-38-4-62',
      'v-36',
      'h-10',
      'v36',
      'c0 24-2 46-4 62',
      'c-1 8-5 14-13 14',
      'c-8 0-13-6-12-14',
      'c2-14 4-34 4-62',
      'v-52',
      'c-4-6-10-16-14-28',
      'c-8-22-10-48-2-70',
      'c6-18 20-30 38-34',
      'c-2-6-4-12-6-22',
      'c-12-2-20-12-20-24',
      'c0-14 10-24 22-24z',
    ].join(' ');
  }
  return [
    'M100 16',
    'c13 0 24 11 24 26',
    'c0 13-9 24-22 26',
    'c-1 8-2 14-3 20',
    'c22 2 40 14 48 32',
    'c10 22 8 46 2 64',
    'c-4 12-12 20-18 24',
    'v56',
    'c0 30 2 50 4 64',
    'c1 8-4 14-12 14',
    'c-8 0-12-6-13-14',
    'c-2-16-4-40-4-64',
    'v-40',
    'h-12',
    'v40',
    'c0 24-2 48-4 64',
    'c-1 8-5 14-13 14',
    'c-8 0-13-6-12-14',
    'c2-14 4-34 4-64',
    'v-56',
    'c-6-4-14-12-18-24',
    'c-6-18-8-42 2-64',
    'c8-18 26-30 48-32',
    'c-1-6-2-12-3-20',
    'c-13-2-22-13-22-26',
    'c0-15 11-26 24-26z',
  ].join(' ');
}

export function FormaVisionLocalSilhouette({
  sex,
  className,
}: FormaVisionLocalSilhouetteProps) {
  return (
    <div
      data-testid={FORMAVISION_LOCAL_SILHOUETTE_TESTID}
      data-sex={sex}
      className={`flex h-full min-h-[200px] w-full items-center justify-center ${className ?? ''}`}
    >
      <svg
        viewBox="0 0 200 360"
        className="h-full max-h-full w-auto max-w-full"
        role="img"
        aria-label={`${sex === 'male' ? 'Male' : 'Female'} body outline`}
      >
        <path
          d={silhouettePath(sex)}
          fill={FORMA_VISION_HEX.navy}
          stroke={FORMA_VISION_HEX.teal}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
