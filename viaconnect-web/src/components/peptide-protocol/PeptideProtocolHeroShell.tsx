'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { FlaskConical } from 'lucide-react';
import { ShareProtocolButton } from '@/components/consumer/ShareProtocolButton';

const PEPTIDE_HERO_DESKTOP =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Athlete%2032.png';
const PEPTIDE_HERO_MOBILE =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Mobile%20Hero/Athlete%2011%20mobile.png';

export function PeptideProtocolHeroShell({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const heroSrc = isMobile ? PEPTIDE_HERO_MOBILE : PEPTIDE_HERO_DESKTOP;

  return (
    <>
      <div
        className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
        style={{ width: '100vw', height: '100vh', top: 0, left: 0 }}
      >
        <img
          src={heroSrc}
          alt="Peptide Education background"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 20%',
            filter: 'blur(2px)',
          }}
        />
        {/* Prompt 226b: Deep Navy scrim compresses photo tonal range for glass contrast */}
        <div className="pep-scrim" data-testid="peptide-hero-scrim" aria-hidden />
      </div>

      <div className="relative z-10 text-white">
        <div className="h-[80px] md:hidden" />
        <div className="min-h-screen rounded-t-3xl py-8">
          <div className="mx-auto max-w-7xl space-y-5 px-4 md:px-6">
            <div className="flex items-center justify-between gap-3 pb-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--deep-navy)] to-[var(--teal)] border border-[var(--glass-border-226)] flex items-center justify-center shrink-0">
                  <FlaskConical className="w-[18px] h-[18px] text-white" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold text-white truncate">Peptide Education</h1>
                  <p className="text-sm text-white/85 truncate">
                    Educational reference only
                  </p>
                </div>
              </div>
              <ShareProtocolButton compact label="Share" className="shrink-0" />
            </div>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
