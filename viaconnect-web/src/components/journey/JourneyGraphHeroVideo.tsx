'use client';

/**
 * Prompt 216: full-bleed background hero video for the Journey graph card only.
 * Decorative (aria-hidden). Fail-open to static scrim if video errors.
 * Lazy play via IntersectionObserver; pause when far out of view.
 * prefers-reduced-motion: poster still only, no playback.
 */

import { useEffect, useRef, useState } from 'react';
import { safeLog } from '@/lib/utils/safe-log';

const DESKTOP_MP4 =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Unwind%20Forest%2016x9.mp4';
const MOBILE_MP4 =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Unwind%20Forest%209x16.mp4';

/** Solid Deep Navy poster until still frames are uploaded beside the mp4s. */
const POSTER_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#1A2744"/></svg>`,
  );

/** Mobile switch aligns with Tailwind md (768px). */
const MOBILE_MQ = '(max-width: 767px)';

export interface JourneyGraphHeroVideoProps {
  /** Test hook: force error path without network. */
  forceError?: boolean;
}

export function JourneyGraphHeroVideo({ forceError = false }: JourneyGraphHeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [failed, setFailed] = useState(false);
  const [inView, setInView] = useState(false);

  // Source selection: only the breakpoint-appropriate asset.
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
      setSrc(mqMobile.matches ? MOBILE_MP4 : DESKTOP_MP4);
    };

    apply();
    mqMotion.addEventListener('change', apply);
    mqMobile.addEventListener('change', apply);
    return () => {
      mqMotion.removeEventListener('change', apply);
      mqMobile.removeEventListener('change', apply);
    };
  }, []);

  // Viewport observer: play near view, pause far out.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setInView(Boolean(entry?.isIntersecting));
      },
      { root: null, rootMargin: '120px 0px', threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Play / pause control (never throws to UI).
  useEffect(() => {
    const v = videoRef.current;
    if (!v || reducedMotion || failed || !src) return;

    if (forceError) {
      setFailed(true);
      safeLog.warn('journey.graphVideo', 'forceError test path: fail-open static');
      return;
    }

    if (inView) {
      const p = v.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err: unknown) => {
          safeLog.warn('journey.graphVideo', 'autoplay blocked or failed open', {
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
  }, [inView, src, reducedMotion, failed, forceError]);

  const onError = () => {
    setFailed(true);
    safeLog.warn('journey.graphVideo', 'video error: fail-open to static scrim', {
      src: src ?? 'none',
    });
  };

  // Reduced motion or failure: no video element (poster layer still paints via parent scrim).
  const showVideo = Boolean(src) && !reducedMotion && !failed && !forceError;

  return (
    <div
      ref={rootRef}
      data-testid="journey-graph-hero-video"
      data-video-state={failed || forceError ? 'failed' : reducedMotion ? 'reduced-motion' : showVideo ? 'ready' : 'idle'}
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

      {/*
        Legibility scrim over video (and as static ambient when video off).
        Deep Navy gradient: stronger at bottom where legend/footnote sit,
        lighter mid so forest texture still reads as ambience.
        Opacities: top 0.72, mid 0.78, bottom 0.88 solid navy tint.
      */}
      <div
        data-testid="journey-graph-video-scrim"
        style={{
          position: 'absolute',
          inset: 0,
          background: failed || reducedMotion || !showVideo
            ? `linear-gradient(180deg, #16203A 0%, #1A2744 55%, #1E3054 100%)`
            : `linear-gradient(180deg, rgba(26,39,68,0.72) 0%, rgba(26,39,68,0.78) 45%, rgba(26,39,68,0.88) 100%)`,
        }}
      />
    </div>
  );
}

export const JOURNEY_GRAPH_VIDEO_ASSETS = {
  desktop: DESKTOP_MP4,
  mobile: MOBILE_MP4,
  mobileBreakpoint: MOBILE_MQ,
  poster: 'deep-navy-svg-data-uri',
  /** Approximate public CDN; actual bytes reported in completion note after HEAD. */
  notes:
    'Posters: solid Deep Navy data-URI until still frames are uploaded next to the mp4 assets.',
} as const;

export default JourneyGraphHeroVideo;
