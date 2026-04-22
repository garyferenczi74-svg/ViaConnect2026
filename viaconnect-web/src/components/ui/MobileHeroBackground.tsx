'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface MobileHeroBackgroundProps {
  src: string;
  mobileSrc?: string;
  mobileBreakpoint?: number;
  alt?: string;
  overlayOpacity?: number;
  overlayGradient?: boolean;
  priority?: boolean;
  quality?: number;
  objectPosition?: string;
  zIndex?: number;
  flipX?: boolean;
}

export function MobileHeroBackground({
  src,
  mobileSrc,
  mobileBreakpoint = 768,
  alt = '',
  overlayOpacity = 0.55,
  overlayGradient = true,
  priority = true,
  quality = 85,
  objectPosition = 'center 45%',
  zIndex = 0,
  flipX = false,
}: MobileHeroBackgroundProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<string>('100vh');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const supportsDvh =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('height', '100dvh');

    const update = () => {
      if (supportsDvh) {
        setViewportHeight('100dvh');
      } else {
        setViewportHeight(`${window.innerHeight}px`);
      }
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [mobileBreakpoint]);

  const activeSrc = isMobile && mobileSrc ? mobileSrc : src;

  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  const op = clamp(overlayOpacity);

  return (
    <div
      aria-hidden="true"
      className="hero-bg-fixed pointer-events-none"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex,
        height: viewportHeight,
        width: '100vw',
        overflow: 'hidden',
        willChange: 'transform',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      <Image
        key={activeSrc}
        src={activeSrc}
        alt={alt}
        fill
        priority={priority}
        quality={quality}
        sizes="100vw"
        onLoad={() => setIsLoaded(true)}
        className={`object-cover transition-opacity duration-700 ease-out ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          objectPosition,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          ...(flipX ? { transform: 'scaleX(-1)' } : {}),
        }}
      />

      {overlayGradient && (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(13, 21, 32, ${
              op * 0.85
            }) 0%, rgba(26, 39, 68, ${op * 0.45}) 30%, rgba(26, 39, 68, ${
              op * 0.65
            }) 70%, rgba(13, 21, 32, ${op}) 100%)`,
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        />
      )}
    </div>
  );
}
