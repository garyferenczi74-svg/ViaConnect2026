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

import { useEffect, useRef, useState } from 'react';
import type { SurfaceMedia } from './hubConfig';

interface CardMediaProps {
  media: SurfaceMedia;
}

export function CardMedia({ media }: CardMediaProps) {
  const gradientClass = media.gradientClass || '';

  if (media.kind === 'gradient' || !media.src) {
    return (
      <div
        aria-hidden="true"
        className={`absolute inset-0 z-0 ${gradientClass}`}
      />
    );
  }

  if (media.kind === 'image') {
    return <ImageMedia media={media} gradientClass={gradientClass} />;
  }

  return <VideoMedia media={media} gradientClass={gradientClass} />;
}

function ImageMedia({ media, gradientClass }: { media: SurfaceMedia; gradientClass: string }) {
  const [errored, setErrored] = useState(false);
  return (
    <>
      <div aria-hidden="true" className={`absolute inset-0 z-0 ${gradientClass}`} />
      {!errored && media.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.src}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setErrored(true)}
          className="absolute inset-0 z-0 h-full w-full object-cover"
        />
      ) : null}
    </>
  );
}

function VideoMedia({ media, gradientClass }: { media: SurfaceMedia; gradientClass: string }) {
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
    <div ref={wrapperRef} className="absolute inset-0 z-0">
      <div aria-hidden="true" className={`absolute inset-0 ${gradientClass}`} />
      {showPoster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.poster}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setPosterErrored(true)}
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
          onError={() => setVideoErrored(true)}
          style={{ objectPosition: media.objectPosition ?? 'top' }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </div>
  );
}

export default CardMedia;
