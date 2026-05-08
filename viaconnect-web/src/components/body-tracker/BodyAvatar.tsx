'use client';

// Prompt #85m: anatomical avatar image that replaces the segmental SVG on the
// Composition page. Gender selects between two Supabase-hosted images. The 12
// segmental callouts (#85k) flank this avatar; segmental coloring + journey
// overlay + ghost outline that the SVG used to provide are intentionally
// dropped here per spec since the callouts now carry that data.
//
// Prompt #153: desktop layout lifts the prior 280px width cap and switches
// the inner image to h-full w-auto so the avatar scales to fill its parent
// flex column. Mobile keeps the bounded mx-auto layout so the page stack
// reflows naturally without horizontal overflow.

interface BodyAvatarProps {
  gender: 'male' | 'female';
  className?: string;
}

const AVATAR_URLS: Record<'male' | 'female', string> = {
  male:   'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Body%20Tracker/Male%20Avatar.svg',
  female: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Body%20Tracker/Female.svg',
};

export function BodyAvatar({ gender, className }: BodyAvatarProps) {
  return (
    <div
      className={`mx-auto flex w-full max-w-[200px] items-center justify-center md:max-w-[240px] lg:h-full lg:max-w-none ${className ?? ''}`}
    >
      <img
        src={AVATAR_URLS[gender]}
        alt={`${gender === 'male' ? 'Male' : 'Female'} body composition avatar`}
        className="h-auto w-full max-w-full select-none object-contain lg:h-full lg:max-h-full lg:w-auto"
        draggable={false}
      />
    </div>
  );
}
