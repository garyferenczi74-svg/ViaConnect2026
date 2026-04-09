'use client';

// useParallaxImage — reusable hook for custom parallax implementations.
// Returns a ref + scroll-driven y MotionValue + reduced-motion flag.
// Used internally by ParallaxSection but exposed for one-off custom layouts.

import { useRef } from 'react';
import {
  MotionValue,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';

interface UseParallaxImageOptions {
  /** Parallax speed: 0 = fixed, 0.5 = half scroll speed, 1 = normal scroll. */
  speed?: number;
  /** Framer Motion useScroll offset tuple. */
  offset?: ['start end' | 'start start' | 'end end' | 'end start', 'start end' | 'start start' | 'end end' | 'end start'];
}

interface UseParallaxImageReturn {
  ref: React.RefObject<HTMLDivElement>;
  y: MotionValue<number>;
  isReduced: boolean;
}

export function useParallaxImage(
  { speed = 0.5, offset = ['start end', 'end start'] }: UseParallaxImageOptions = {},
): UseParallaxImageReturn {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: offset as any,
  });

  // Always create the transform; we conditionally use it via the static fallback.
  const transformedY = useTransform(scrollYProgress, [0, 1], [-100 * speed, 100 * speed]);
  const staticY = useMotionValue(0);

  return {
    ref,
    y: prefersReducedMotion ? staticY : transformedY,
    isReduced: !!prefersReducedMotion,
  };
}
