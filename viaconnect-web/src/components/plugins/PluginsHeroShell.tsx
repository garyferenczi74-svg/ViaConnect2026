import type { ReactNode } from 'react';

/**
 * Full-viewport Athlete 29 hero behind the /plugins glass IA.
 * One public Hero Images URL for mobile and desktop (no invented Mobile Hero swap).
 * Background and scrim only; PluginsAppsSurface keeps its own header.
 */
export const PLUGINS_HERO_IMAGE =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Athlete%2029.png';

export function PluginsHeroShell({ children }: { children: ReactNode }) {
  return (
    <>
      <div
        className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
        style={{ width: '100vw', height: '100vh', top: 0, left: 0 }}
        aria-hidden
        data-testid="plugins-hero-layer"
      >
        <img
          src={PLUGINS_HERO_IMAGE}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 20%',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          data-testid="plugins-hero-scrim"
          style={{
            background:
              'linear-gradient(180deg, rgba(13, 21, 32, 0.72) 0%, rgba(26, 39, 68, 0.58) 42%, rgba(45, 165, 160, 0.22) 100%)',
          }}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </>
  );
}
