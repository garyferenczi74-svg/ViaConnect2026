'use client';

// Prompt #156: 12 soft glowing radial-gradient zones over each muscle
// group on the photographic avatar. Color is driven by the existing
// regionStatuses map; each zone's width/height defines the muscle
// area it covers (chest spans wider + taller than calf, etc.).
// mix-blend-mode: screen lightens the avatar pixels under the glow,
// matching the reference image style.

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
  readonly width?: string;
  readonly height?: string;
}

const OVAL_POSITIONS: Record<'male' | 'female', Record<string, Position>> = {
  male: {
    neck:      { top: '10%', left: '50%', width: '10%', height: '5%'  },
    shoulders: { top: '15%', left: '50%', width: '15%', height: '6%'  },
    chest:     { top: '22%', left: '50%', width: '28%', height: '13%' },
    waist:     { top: '33%', left: '50%', width: '26%', height: '13%' },
    l_bicep:   { top: '22%', left: '28%', width: '11%', height: '12%' },
    r_bicep:   { top: '22%', left: '72%', width: '11%', height: '12%' },
    l_forearm: { top: '34%', left: '22%', width: '11%', height: '12%' },
    r_forearm: { top: '34%', left: '78%', width: '11%', height: '12%' },
    l_quad:    { top: '52%', left: '40%', width: '13%', height: '16%' },
    r_quad:    { top: '52%', left: '60%', width: '13%', height: '16%' },
    l_calf:    { top: '70%', left: '40%', width: '9%',  height: '15%' },
    r_calf:    { top: '70%', left: '60%', width: '9%',  height: '15%' },
  },
  female: {
    neck:      { top: '12%', left: '50%', width: '10%', height: '5%'  },
    shoulders: { top: '17%', left: '50%', width: '15%', height: '6%'  },
    chest:     { top: '24%', left: '50%', width: '28%', height: '13%' },
    waist:     { top: '35%', left: '50%', width: '26%', height: '13%' },
    l_bicep:   { top: '24%', left: '26%', width: '11%', height: '12%' },
    r_bicep:   { top: '24%', left: '74%', width: '11%', height: '12%' },
    l_forearm: { top: '36%', left: '20%', width: '11%', height: '12%' },
    r_forearm: { top: '36%', left: '80%', width: '11%', height: '12%' },
    l_quad:    { top: '54%', left: '40%', width: '13%', height: '16%' },
    r_quad:    { top: '54%', left: '60%', width: '13%', height: '16%' },
    l_calf:    { top: '72%', left: '40%', width: '9%',  height: '15%' },
    r_calf:    { top: '72%', left: '60%', width: '9%',  height: '15%' },
  },
};

const COLOR_RGB: Record<OvalColor, string> = {
  green:  '34, 197, 94',
  yellow: '234, 179, 8',
  red:    '239, 68, 68',
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
        const rgb = COLOR_RGB[color];
        return (
          <div
            key={regionId}
            data-region={regionId}
            data-color={color}
            aria-hidden="true"
            className="pointer-events-none absolute rounded-[50%]"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width ?? '14%',
              height: pos.height ?? '8%',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(ellipse at center, rgba(${rgb}, 0.75) 0%, rgba(${rgb}, 0.55) 35%, rgba(${rgb}, 0) 70%)`,
              mixBlendMode: 'screen',
            }}
          />
        );
      })}
    </div>
  );
}
