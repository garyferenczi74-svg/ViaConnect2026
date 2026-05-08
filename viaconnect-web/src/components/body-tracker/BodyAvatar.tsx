'use client';

// Prompt #85m: anatomical avatar image that replaces the segmental SVG on the
// Composition page. Gender selects between two Supabase-hosted images. The 12
// segmental callouts (#85k) flank this avatar; segmental coloring + journey
// overlay + ghost outline that the SVG used to provide are intentionally
// dropped here per spec since the callouts now carry that data.

interface BodyAvatarProps {
  gender: 'male' | 'female';
  className?: string;
}

const AVATAR_URLS: Record<'male' | 'female', string> = {
  male:   'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Body%20Tracker/Male%20Avatar.svg',
  female: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Body%20Tracker/Female%20Avartar.png',
};

export function BodyAvatar({ gender, className }: BodyAvatarProps) {
  return (
    <div className={`mx-auto w-full max-w-[200px] md:max-w-[240px] lg:max-w-[280px] ${className ?? ''}`}>
      <img
        src={AVATAR_URLS[gender]}
        alt={`${gender === 'male' ? 'Male' : 'Female'} body composition avatar`}
        className="h-auto w-full select-none object-contain"
        draggable={false}
      />
    </div>
  );
}
