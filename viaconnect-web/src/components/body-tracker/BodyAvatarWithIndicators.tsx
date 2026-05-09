'use client';

// Prompt #85n v3: avatar with 12 oval status indicators. Replaces the
// prior mask-image / clip-path full-body color wash from v1 + v2 with
// 12 small pill-shaped indicators positioned on the avatar at each
// region's body-part location. The avatar itself stays clean and
// untinted; each oval reads green / yellow / red from the
// regionStatuses map keyed by BODY_PARTS keys (neck, chest, r_bicep,
// l_quad, etc.).
//
// Position percentages are first-pass from the prompt brief. The
// wrapper carries lg:w-auto so its rendered width tracks the avatar
// img's intrinsic width on desktop; without that, lg:max-w-none plus
// w-full would let the wrapper widen to fill the center column and
// the percentage-positioned ovals would drift off the anatomy.
// Mobile and tablet already match wrapper width to img width via
// w-full plus max-w-[200px] / md:max-w-[240px].

import type { OvalColor } from '@/lib/body-tracker/heatmap-colors';

interface BodyAvatarWithIndicatorsProps {
  gender: 'male' | 'female';
  regionStatuses: Record<string, OvalColor>;
  className?: string;
}

const AVATAR_URLS: Record<'male' | 'female', string> = {
  male:   'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Body%20Tracker/Male%20Avatar.svg',
  female: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Body%20Tracker/Female.svg',
};

interface Position {
  readonly top: string;
  readonly left: string;
}

// Region IDs match BODY_PARTS keys in composition/page.tsx and the
// REGION_TO_SEGMENT map in useMuscleChangeData.ts. r_bicep / l_bicep
// etc. are anatomical at the data layer (r_bicep -> right_arm_lbs).
//
// Positions assume the avatar is rendered MIRROR style, so the user's
// right arm appears on the image's right half (screen-right): r_bicep
// at left: 72% sits over the user's right bicep, l_bicep at left: 28%
// sits over the user's left bicep, and the "L. Bicep" callout card
// (desktop-left column) lines up with the same side of the avatar
// where the left-bicep oval renders. Gary's prompt-brief diagram and
// every position percentage below assume mirror style.
//
// If localhost reveals the avatar is rendered PORTRAIT style instead
// (user's right arm on image-left because the figure faces the
// viewer), swap the four r_/l_ pairs' left percentages: r_bicep <->
// l_bicep, r_forearm <-> l_forearm, r_quad <-> l_quad, r_calf <->
// l_calf. No other coordinates need to change.
const OVAL_POSITIONS: Record<'male' | 'female', Record<string, Position>> = {
  male: {
    neck:      { top: '10%', left: '50%' },
    shoulders: { top: '15%', left: '50%' },
    chest:     { top: '22%', left: '50%' },
    waist:     { top: '33%', left: '50%' },
    l_bicep:   { top: '22%', left: '28%' },
    r_bicep:   { top: '22%', left: '72%' },
    l_forearm: { top: '34%', left: '22%' },
    r_forearm: { top: '34%', left: '78%' },
    l_quad:    { top: '52%', left: '40%' },
    r_quad:    { top: '52%', left: '60%' },
    l_calf:    { top: '70%', left: '40%' },
    r_calf:    { top: '70%', left: '60%' },
  },
  female: {
    neck:      { top: '12%', left: '50%' },
    shoulders: { top: '17%', left: '50%' },
    chest:     { top: '24%', left: '50%' },
    waist:     { top: '35%', left: '50%' },
    l_bicep:   { top: '24%', left: '26%' },
    r_bicep:   { top: '24%', left: '74%' },
    l_forearm: { top: '36%', left: '20%' },
    r_forearm: { top: '36%', left: '80%' },
    l_quad:    { top: '54%', left: '40%' },
    r_quad:    { top: '54%', left: '60%' },
    l_calf:    { top: '72%', left: '40%' },
    r_calf:    { top: '72%', left: '60%' },
  },
};

const COLOR_CLASS: Record<OvalColor, string> = {
  green:  'bg-green-500',
  yellow: 'bg-yellow-400',
  red:    'bg-red-500',
};

export function BodyAvatarWithIndicators({
  gender,
  regionStatuses,
  className,
}: BodyAvatarWithIndicatorsProps) {
  const avatarUrl = AVATAR_URLS[gender];
  const positions = OVAL_POSITIONS[gender];

  return (
    <div
      className={`relative mx-auto flex w-full max-w-[200px] items-center justify-center md:max-w-[240px] lg:h-full lg:w-auto lg:max-w-none ${className ?? ''}`}
      data-testid="body-avatar-indicators"
    >
      <img
        src={avatarUrl}
        alt={`${gender === 'male' ? 'Male' : 'Female'} body composition avatar`}
        className="h-auto w-full max-w-full select-none object-contain lg:h-full lg:max-h-full lg:w-auto"
        draggable={false}
      />
      {Object.entries(positions).map(([regionId, pos]) => {
        const color = regionStatuses[regionId] ?? 'yellow';
        return (
          <div
            key={regionId}
            data-region={regionId}
            data-color={color}
            aria-hidden="true"
            className={`pointer-events-none absolute h-5 w-8 rounded-full border-2 border-white/30 shadow-lg shadow-black/20 ${COLOR_CLASS[color]}`}
            style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)' }}
          />
        );
      })}
    </div>
  );
}
