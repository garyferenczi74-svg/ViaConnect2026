'use client';

import Image from 'next/image';
import { useState } from 'react';

interface SectionHeroBackgroundProps {
  src: string;
  alt?: string;
  height?: string;
  overlayOpacity?: number;
  objectPosition?: string;
  quality?: number;
  className?: string;
  children?: React.ReactNode;
}

export function SectionHeroBackground({
  src,
  alt = '',
  height = '300px',
  overlayOpacity = 0.5,
  objectPosition = 'center center',
  quality = 80,
  className = '',
  children,
}: SectionHeroBackgroundProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const op = Math.min(1, Math.max(0, overlayOpacity));

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{ height }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="100vw"
        quality={quality}
        onLoad={() => setIsLoaded(true)}
        className={`object-cover transition-opacity duration-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          objectPosition,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      />

      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background: `linear-gradient(180deg, rgba(13, 21, 32, ${
            op * 0.4
          }) 0%, rgba(26, 39, 68, ${op}) 100%)`,
        }}
      />

      {children && <div className="relative z-10 h-full w-full">{children}</div>}
    </div>
  );
}
