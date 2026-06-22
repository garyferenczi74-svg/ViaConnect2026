'use client';

// Prompt 180 (2026-06-08): per card media layer.
//
// Renders behind the BentoCard content. Fails open through three layers:
//   1. Gradient placeholder is always present underneath.
//   2. Image on error hides itself, gradient remains.
//   3. Video on error or reduced motion falls back to poster; poster on
//      error falls back to gradient.
//
// Reduced motion: when (prefers-reduced-motion: reduce) is set the video
// is never played; the poster (or the gradient when no poster) shows
// instead. IntersectionObserver gates video playback to in view cards so
// several MP4 backgrounds do not drain the page.
//
// Prompt 189 (2026-06-11): additive instrumentation seam. An optional logKey
// turns on ONE structured safeLog.warn per failure transition (image error,
// video error, poster error, dead stream stall). When logKey is omitted no
// logging path executes and the render is identical to before, with one
// strict resilience addition: a video that stalls with NO current frame data
// (readyState < 2, a dead stream) now falls open to the poster / gradient
// like an error. A working video never enters that state, so the My Biology
// consumers are untouched.

import { useEffect, useRef, useState } from 'react';
import { safeLog } from '@/lib/utils/safe-log';
import type { SurfaceMedia } from './hubConfig';

type MediaFailureType = 'image' | 'video' | 'poster' | 'video-stalled';

// The single logging path. Guarded on logKey so an uninstrumented consumer
// (the My Biology hub passes none) executes no logging at all.
function logMediaFailure(logKey: string | undefined, mediaType: MediaFailureType, src?: string) {
  if (!logKey) return;
  safeLog.warn('hub.card-media', 'media failed', { cardKey: logKey, mediaType, src });
}

interface CardMediaProps {
  media: SurfaceMedia;
  logKey?: string;
}

// Gary fix (2026-06-11): every media layer clips itself to the host card's
// radius (rounded-[inherit]; the video wrapper also overflow-hidden). The card
// roots already carry overflow-hidden, but a backdrop-filter on the root can
// defeat child clipping in some engines, letting a video bleed past the
// rounded frame. Explicit self-clipping is visually neutral when the root
// clip works, so every consumer (both hubs) is safe.
export function CardMedia({ media, logKey }: CardMediaProps) {
  const gradientClass = media.gradientClass || '';

  if (media.kind === 'gradient' || !media.src) {
    return (
      <div
        aria-hidden="true"
        className={`absolute inset-0 z-0 rounded-[inherit] ${gradientClass}`}
      />
    );
  }

  if (media.kind === 'image') {
    return <ImageMedia media={media} gradientClass={gradientClass} logKey={logKey} />;
  }

  return <VideoMedia media={media} gradientClass={gradientClass} logKey={logKey} />;
}

function ImageMedia({
  media,
  gradientClass,
  logKey,
}: {
  media: SurfaceMedia;
  gradientClass: string;
  logKey?: string;
}) {
  const [errored, setErrored] = useState(false);
  return (
    <>
      <div aria-hidden="true" className={`absolute inset-0 z-0 rounded-[inherit] ${gradientClass}`} />
      {!errored && media.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.src}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => {
            setErrored(true);
            logMediaFailure(logKey, 'image', media.src);
          }}
          style={{ objectPosition: media.objectPosition ?? 'center' }}
          className={`absolute inset-0 z-0 h-full w-full rounded-[inherit] ${
            media.objectFit === 'contain' ? 'object-contain' : 'object-cover'
          }`}
        />
      ) : null}
    </>
  );
}

function VideoMedia({
  media,
  gradientClass,
  logKey,
}: {
  media: SurfaceMedia;
  gradientClass: string;
  logKey?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoErrored, setVideoErrored] = useState(false);
  const [posterErrored, setPosterErrored] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    if (videoErrored) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const node = wrapperRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const v = videoRef.current;
          if (!v) continue;
          if (entry.isIntersecting) {
            // Swallow promise rejection: Safari resolves play() to a
            // promise that rejects when interrupted by visibility
            // transitions; the fail open path covers that.
            void v.play().catch(() => undefined);
          } else {
            v.pause();
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [reducedMotion, videoErrored]);

  const showVideo = !reducedMotion && !videoErrored && media.src;
  const showPoster = (reducedMotion || videoErrored) && !posterErrored && media.poster;

  return (
    <div ref={wrapperRef} className="absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
      <div aria-hidden="true" className={`absolute inset-0 ${gradientClass}`} />
      {showPoster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.poster}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => {
            setPosterErrored(true);
            logMediaFailure(logKey, 'poster', media.poster);
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {showVideo ? (
        <video
          ref={videoRef}
          src={media.src}
          poster={media.poster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onError={() => {
            setVideoErrored(true);
            logMediaFailure(logKey, 'video', media.src);
          }}
          onStalled={() => {
            // readyState < 2 means no current frame data: the stream is dead,
            // so fall open exactly like onError (poster, then gradient).
            // readyState >= 2 means frames exist and this is a transient
            // network stall on a playing video: no state change, log only
            // when instrumented via logKey.
            const v = videoRef.current;
            if (v && v.readyState < 2) {
              setVideoErrored(true);
            }
            logMediaFailure(logKey, 'video-stalled', media.src);
          }}
          style={{ objectPosition: media.objectPosition ?? 'top' }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </div>
  );
}

export default CardMedia;
