'use client';

// Prompt #157 + #157a Phase B: anatomical muscle highlight heat map.
// Replaces the v3 oval indicators (BodyAvatarWithIndicators, deleted)
// with per-muscle alpha-mask overlays so the highlight shape follows
// each muscle's anatomy rather than approximating it with a circle or
// pill. Each motion.div carries:
//   - position absolute inset-0 covering the full avatar container
//   - mask-image: the muscle's alpha mask PNG (defines the shape)
//   - background-color: the muscle's status color (red / yellow /
//     green via the existing OvalColor enum)
//   - mix-blend-mode: screen (lightens the avatar pixels under the
//     mask, producing the soft glow look from the reference images)
//   - filter: blur(3px) (softens the mask edges into a diffuse glow)
//   - opacity: 0.75 baseline + Framer Motion hover/tap transitions
//
// Per #157a Blocker 2: SegmentId values are the snake_case keys that
// already exist in the data layer (composition/page.tsx BODY_PARTS,
// useFatChangeData REGION_TO_SEGMENT). Per #157a Blocker 3: no
// onClick navigation; hover/tap visual feedback only.

import { motion } from 'framer-motion';
import { OVAL_HEX, type OvalColor } from '@/lib/body-tracker/heatmap-colors';

type Sex = 'male' | 'female';

type SegmentId =
  | 'neck' | 'shoulders' | 'chest' | 'waist'
  | 'l_bicep' | 'r_bicep' | 'l_forearm' | 'r_forearm'
  | 'l_quad' | 'r_quad' | 'l_calf' | 'r_calf';

const ALL_SEGMENT_IDS: readonly SegmentId[] = [
  'neck', 'shoulders', 'chest', 'waist',
  'l_bicep', 'r_bicep', 'l_forearm', 'r_forearm',
  'l_quad', 'r_quad', 'l_calf', 'r_calf',
];

// Per #157a §2.4: mask filenames use the snake_case SegmentId keys.
// The shoulders mask is one combined silhouette covering both
// deltoids; if the script outputs separate left/right deltoid PNGs
// they get unioned into shoulders.png at generation time per the
// generate-muscle-masks.ts authoring.
const SEGMENT_MASK_FILES: Record<SegmentId, readonly string[]> = {
  neck:      ['neck.png'],
  shoulders: ['shoulders.png'],
  chest:     ['chest.png'],
  waist:     ['waist.png'],
  l_bicep:   ['l_bicep.png'],
  r_bicep:   ['r_bicep.png'],
  l_forearm: ['l_forearm.png'],
  r_forearm: ['r_forearm.png'],
  l_quad:    ['l_quad.png'],
  r_quad:    ['r_quad.png'],
  l_calf:    ['l_calf.png'],
  r_calf:    ['r_calf.png'],
};

const AVATAR_URLS: Record<Sex, string> = {
  male:   'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Body%20Tracker/Male%20Avatar.svg',
  female: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Body%20Tracker/Female.svg',
};

interface MuscleHighlightProps {
  sex: Sex;
  segmentId: SegmentId;
  color: OvalColor;
}

function MuscleHighlight({ sex, segmentId, color }: MuscleHighlightProps) {
  const fillHex = OVAL_HEX[color];
  const maskFiles = SEGMENT_MASK_FILES[segmentId];

  return (
    <>
      {maskFiles.map((file) => {
        const maskUrl = `/body-tracker/masks/${sex}/${file}`;
        return (
          <motion.div
            key={file}
            className="pointer-events-auto absolute inset-0"
            data-region={segmentId}
            data-color={color}
            aria-label={`${segmentId} muscle highlight, status ${color}`}
            style={{
              backgroundColor: fillHex,
              WebkitMaskImage: `url(${maskUrl})`,
              maskImage: `url(${maskUrl})`,
              WebkitMaskSize: '100% 100%',
              maskSize: '100% 100%',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              mixBlendMode: 'screen',
              filter: 'blur(3px)',
              opacity: 0.45,
              transformOrigin: 'center center',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            whileHover={{
              opacity: 0.65,
              scale: 1.02,
              filter: 'blur(2px) brightness(1.15)',
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
        );
      })}
    </>
  );
}

interface SegmentalHeatMapProps {
  sex: Sex;
  segmentStatuses: Partial<Record<SegmentId, OvalColor>>;
  className?: string;
}

export function SegmentalHeatMap({
  sex,
  segmentStatuses,
  className,
}: SegmentalHeatMapProps) {
  const avatarUrl = AVATAR_URLS[sex];

  return (
    <div
      className={`relative mx-auto flex w-full max-w-[200px] items-center justify-center md:max-w-[240px] lg:h-full lg:w-auto lg:max-w-none ${className ?? ''}`}
      data-testid="segmental-heat-map"
    >
      <img
        src={avatarUrl}
        alt={`${sex === 'male' ? 'Male' : 'Female'} body composition avatar`}
        className="h-auto w-full max-w-full select-none object-contain lg:h-full lg:max-h-full lg:w-auto"
        draggable={false}
      />
      {ALL_SEGMENT_IDS.map((segmentId) => {
        const color = segmentStatuses[segmentId];
        if (!color) return null;
        return (
          <MuscleHighlight
            key={segmentId}
            sex={sex}
            segmentId={segmentId}
            color={color}
          />
        );
      })}
    </div>
  );
}
