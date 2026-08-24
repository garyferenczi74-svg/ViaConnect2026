'use client';

/**
 * Prompt 216 / 216c: reusable full-bleed decorative hero video background.
 * Used by Journey graph card (responsive 16x9 / 9x16) and profile card (9x16 always).
 *
 * - autoplay muted loop playsInline, no controls
 * - preload=metadata; IntersectionObserver play/pause
 * - prefers-reduced-motion: static scrim only
 * - fail-open static scrim + safeLog on error
 * - aria-hidden, pointer-events none
 */

import { useEffect, useRef, useState } from 'react';
import { safeLog } from '@/lib/utils/safe-log';

export const HERO_VIDEO_DESKTOP_16x9 =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Unwind%20Forest%2016x9.mp4';
export const HERO_VIDEO_PORTRAIT_9x16 =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Unwind%20Forest%209x16.mp4';

const MOBILE_MQ = '(max-width: 767px)';

/** Solid Deep Navy poster until still frames are uploaded beside the mp4s. */
const POSTER_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1600" viewBox="0 0 900 1600"><rect width="900" height="1600" fill="#1A2744"/></svg>`,
  );

export type HeroVideoSourceMode = 'responsive' | 'portrait' | 'landscape';

export type HeroVideoScrimPreset = 'journey-graph' | 'profile';

export interface HeroVideoBackgroundProps {
  /** How to pick the mp4 URL. */
  sourceMode?: HeroVideoSourceMode;
  /** Scrim recipe (opacity/gradient) tuned per card. */
  scrimPreset?: HeroVideoScrimPreset;
  /** Optional override test id (default hero-video-background). */
  testId?: string;
  /** Log scope for structured warnings. */
  logScope?: string;
  /** Test hook: force fail-open path. */
  forceError?: boolean;
}

const SCRIM: Record<
  HeroVideoScrimPreset,
  { video: string; static: string; mobileVideo?: string }
> = {
  // Prompt 216 / 216a Journey graph
  'journey-graph': {
    video:
      'linear-gradient(180deg, rgba(26,39,68,0.72) 0%, rgba(26,39,68,0.78) 45%, rgba(26,39,68,0.88) 100%)',
    static: 'linear-gradient(180deg, #16203A 0%, #1A2744 55%, #1E3054 100%)',
    mobileVideo:
      'linear-gradient(180deg, rgba(26,39,68,0.82) 0%, rgba(26,39,68,0.88) 45%, rgba(26,39,68,0.94) 100%)',
  },
  // Prompt 216c profile card: denser scrim so avatar, goal inset, Hannah note stay legible
  profile: {
    video:
      'linear-gradient(180deg, rgba(26,39,68,0.78) 0%, rgba(26,39,68,0.86) 40%, rgba(26,39,68,0.93) 100%)',
    static: 'linear-gradient(180deg, #16203A 0%, #1A2744 55%, #1E3054 100%)',
    mobileVideo:
      'linear-gradient(180deg, rgba(26,39,68,0.84) 0%, rgba(26,39,68,0.90) 45%, rgba(26,39,68,0.96) 100%)',
  },
};

function resolveSrc(mode: HeroVideoSourceMode, isMobile: boolean): string {
  if (mode === 'portrait') return HERO_VIDEO_PORTRAIT_9x16;
  if (mode === 'landscape') return HERO_VIDEO_DESKTOP_16x9;
  return isMobile ? HERO_VIDEO_PORTRAIT_9x16 : HERO_VIDEO_DESKTOP_16x9;
}

export function HeroVideoBackground({
  sourceMode = 'responsive',
  scrimPreset = 'journey-graph',
  testId = 'hero-video-background',
  logScope = 'heroVideo',
  forceError = false,
}: HeroVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [failed, setFailed] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqMobile = window.matchMedia(MOBILE_MQ);

    const apply = () => {
      setReducedMotion(mqMotion.matches);
      if (mqMotion.matches) {
        setSrc(null);
        return;
      }
      setSrc(resolveSrc(sourceMode, mqMobile.matches));
    };

    apply();
    mqMotion.addEventListener('change', apply);
    mqMobile.addEventListener('change', apply);
    return () => {
      mqMotion.removeEventListener('change', apply);
      mqMobile.removeEventListener('change', apply);
    };
  }, [sourceMode]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        setInView(Boolean(entries[0]?.isIntersecting));
      },
      { root: null, rootMargin: '120px 0px', threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || reducedMotion || failed || !src) return;

    if (forceError) {
      setFailed(true);
      safeLog.warn(logScope, 'forceError test path: fail-open static');
      return;
    }

    if (inView) {
      const p = v.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err: unknown) => {
          safeLog.warn(logScope, 'autoplay blocked or failed open', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
    } else {
      try {
        v.pause();
      } catch {
        /* ignore */
      }
    }
  }, [inView, src, reducedMotion, failed, forceError, logScope]);

  const onError = () => {
    setFailed(true);
    safeLog.warn(logScope, 'video error: fail-open to static scrim', {
      src: src ?? 'none',
    });
  };

  const showVideo = Boolean(src) && !reducedMotion && !failed && !forceError;
  const scrim = SCRIM[scrimPreset];
  const videoBackground = scrim.video;
  const staticBackground = scrim.static;
  const mobileOverride = scrim.mobileVideo;

  return (
    <div
      ref={rootRef}
      data-testid={testId}
      data-video-state={
        failed || forceError ? 'failed' : reducedMotion ? 'reduced-motion' : showVideo ? 'ready' : 'idle'
      }
      data-scrim-preset={scrimPreset}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        borderRadius: 'inherit',
        pointerEvents: 'none',
      }}
    >
      {showVideo && (
        <video
          ref={videoRef}
          key={src ?? 'none'}
          src={src ?? undefined}
          poster={POSTER_SVG}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          disablePictureInPicture
          controls={false}
          onError={onError}
          aria-hidden="true"
          tabIndex={-1}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}

      <div
        data-testid={`${testId}-scrim`}
        className="vc-hero-video-scrim"
        data-scrim-mode={failed || reducedMotion || !showVideo ? 'static' : 'video'}
        data-scrim-preset={scrimPreset}
        style={{
          position: 'absolute',
          inset: 0,
          background: failed || reducedMotion || !showVideo ? staticBackground : videoBackground,
        }}
      />

      {mobileOverride && (
        <style>{`
          @media (max-width: 767px) {
            .vc-hero-video-scrim[data-scrim-mode="video"][data-scrim-preset="${scrimPreset}"] {
              background: ${mobileOverride} !important;
            }
          }
        `}</style>
      )}
    </div>
  );
}

export const HERO_VIDEO_ASSETS = {
  desktop: HERO_VIDEO_DESKTOP_16x9,
  portrait: HERO_VIDEO_PORTRAIT_9x16,
  mobileBreakpoint: MOBILE_MQ,
  poster: 'deep-navy-svg-data-uri',
} as const;

export default HeroVideoBackground;
