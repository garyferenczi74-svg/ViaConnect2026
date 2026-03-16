import React from 'react';

export interface HeroBadge {
  label: string;
}

export interface HeroProps {
  headline: string;
  backgroundImage?: string;
  badges?: HeroBadge[];
  className?: string;
}

export function Hero({
  headline,
  backgroundImage,
  badges = [],
  className = '',
}: HeroProps) {
  const bgStyle: React.CSSProperties = backgroundImage
    ? {
        backgroundImage: `linear-gradient(0deg, rgba(10, 15, 28, 1) 0%, rgba(10, 15, 28, 0.2) 100%), url('${backgroundImage}')`,
        backgroundSize: 'cover',
      }
    : {
        background: 'linear-gradient(0deg, rgba(10, 15, 28, 1) 0%, rgba(10, 15, 28, 0.2) 100%)',
      };

  return (
    <section className={`space-y-4 ${className}`}>
      <div
        className="relative overflow-hidden rounded-xl h-64 flex items-end p-6"
        style={bgStyle}
      >
        <div>
          <h2 className="font-[Syne] text-3xl font-bold leading-tight text-white mb-2">
            {headline}
          </h2>
          {badges.length > 0 && (
            <div className="flex gap-2">
              {badges.map((badge) => (
                <span
                  key={badge.label}
                  className="px-3 py-1 bg-[#05bed6]/20 text-[#05bed6] text-[10px] font-bold rounded-full border border-[#05bed6]/30 uppercase"
                >
                  {badge.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
