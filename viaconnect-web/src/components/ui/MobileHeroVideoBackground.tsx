'use client';

import { useEffect, useRef, useState } from 'react';

interface MobileHeroVideoBackgroundProps {
  src: string;
  poster?: string;
  overlayOpacity?: number;
  overlayGradient?: boolean;
  objectPosition?: string;
  zIndex?: number;
  flipX?: boolean;
  playbackRate?: number;
}

// Mirror of MobileHeroBackground but for an MP4 background instead of a still
// image. Reuses the iOS Safari pause/visibility/focus retry chain from
// landing/HeroSection.tsx so the loop survives Low Power Mode, scrolled out
// of viewport, tab backgrounding, system overlays, ringtone interruption.
// Honors prefers-reduced-motion: pauses and refuses retries when active.
export function MobileHeroVideoBackground({
  src,
  poster,
  overlayOpacity = 0.55,
  overlayGradient = true,
  objectPosition = 'center 45%',
  zIndex = 0,
  flipX = false,
  playbackRate = 1,
}: MobileHeroVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [viewportHeight, setViewportHeight] = useState<string>('100vh');
  const [isReady, setIsReady] = useState(false);

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
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playbackRate !== 1) {
      try {
        video.playbackRate = playbackRate;
      } catch {
        /* some browsers reject non-default rates */
      }
    }

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');

    function tryPlay() {
      if (!video) return;
      if (mql.matches) return;
      const promise = video.play();
      if (promise !== undefined) {
        promise.catch(() => {
          /* iOS may refuse in Low Power Mode; retry on next event */
        });
      }
    }

    function handlePause() {
      tryPlay();
    }
    function handleVisibility() {
      if (document.visibilityState === 'visible') tryPlay();
    }
    function handleFocus() {
      tryPlay();
    }
    function handleReducedMotionChange() {
      if (!video) return;
      if (mql.matches) {
        video.pause();
      } else {
        tryPlay();
      }
    }

    if (mql.matches) {
      video.pause();
    } else {
      tryPlay();
    }
    video.addEventListener('pause', handlePause);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    mql.addEventListener('change', handleReducedMotionChange);
    return () => {
      video.removeEventListener('pause', handlePause);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      mql.removeEventListener('change', handleReducedMotionChange);
    };
  }, [playbackRate]);

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
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        controlsList="nodownload noplaybackrate nofullscreen"
        onLoadedData={() => setIsReady(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${
          isReady ? 'opacity-100' : 'opacity-0'
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
