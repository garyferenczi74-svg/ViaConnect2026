'use client';

// ParallaxSection — reusable scroll-driven parallax wrapper.
// Performance: uses Framer Motion useScroll + useTransform (translateY only,
// GPU-composited). No background-attachment: fixed (broken on iOS Safari).
// Accessibility: respects prefers-reduced-motion via useReducedMotion.
//
// Image source:
//   - Full URL  → used as-is (e.g., existing "Hero Images" Supabase bucket)
//   - Short path → resolved against the parallax-images bucket via env URL
// The dashboard hero uses the live URL of an already-uploaded image, so the
// migration / new bucket are intentionally skipped.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

interface ParallaxSectionProps {
  /** Supabase Storage path (e.g., 'shop-hero.webp') OR full URL. */
  imagePath: string;
  /** Parallax speed: 0 = fixed, 0.5 = half scroll speed, 1 = normal scroll. */
  speed?: number;
  /** Tailwind height classes. */
  height?: string;
  /** Dark navy overlay opacity (0–1). Improves text legibility. */
  overlayOpacity?: number;
  /** Gradient fade direction for seamless blending into the navy background. */
  gradientFade?: 'top' | 'bottom' | 'both' | 'none';
  /** Alt text. */
  alt?: string;
  /** Mark image as priority (LCP hero). */
  priority?: boolean;
  /** Halve the parallax speed on mobile (< md) for smoother performance. */
  reduceOnMobile?: boolean;
  /** Content rendered over the parallax image. */
  children?: ReactNode;
  /** Extra container className. */
  className?: string;
}

const SUPABASE_STORAGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/storage/v1/object/public/parallax-images`;

export default function ParallaxSection({
  imagePath,
  speed = 0.5,
  height = 'h-[400px] md:h-[500px] lg:h-[600px]',
  overlayOpacity = 0.4,
  gradientFade = 'both',
  alt = 'Background image',
  priority = false,
  reduceOnMobile = true,
  children,
  className = '',
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Hydration-safe mobile detection (initial render matches SSR `false`).
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const effectiveSpeed = isMobile && reduceOnMobile ? speed * 0.5 : speed;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // translateY only — GPU composited, no layout triggers.
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [-100 * effectiveSpeed, 100 * effectiveSpeed],
  );

  // Resolve image URL: full URL or short path
  const imageUrl = imagePath.startsWith('http')
    ? imagePath
    : `${SUPABASE_STORAGE_URL}/${imagePath}`;

  // Gradient overlays — fade seamlessly into Deep Navy #1A2744
  const gradientTopClass = 'bg-gradient-to-b from-[#1A2744] via-transparent to-transparent';
  const gradientBottomClass = 'bg-gradient-to-t from-[#1A2744] via-transparent to-transparent';

  return (
    <div ref={ref} className={`relative overflow-hidden ${height} ${className}`}>
      {/* Parallax image layer — extra vertical bleed prevents edge gaps as it translates */}
      <motion.div
        style={{ y: prefersReducedMotion ? 0 : y }}
        className="absolute inset-x-0 -top-[20%] -bottom-[20%]"
      >
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes="100vw"
          className="object-cover"
          priority={priority}
          quality={80}
        />
      </motion.div>

      {/* Dark overlay for text contrast */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(26, 39, 68, ${overlayOpacity})` }}
      />

      {/* Top gradient fade */}
      {(gradientFade === 'top' || gradientFade === 'both') && (
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-24 md:h-32 ${gradientTopClass}`}
        />
      )}
      {/* Bottom gradient fade */}
      {(gradientFade === 'bottom' || gradientFade === 'both') && (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-24 md:h-32 ${gradientBottomClass}`}
        />
      )}

      {/* Content layer */}
      {children && (
        <div className="relative z-10 flex h-full items-center justify-center px-4 md:px-8">
          {children}
        </div>
      )}
    </div>
  );
}
