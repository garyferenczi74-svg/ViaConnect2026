'use client';

// ParallaxDivider — thin parallax band used between portal sections.
// Built on top of ParallaxSection with smaller height + slower speed.

import ParallaxSection from './ParallaxSection';

interface ParallaxDividerProps {
  imagePath: string;
  alt?: string;
}

export default function ParallaxDivider({ imagePath, alt }: ParallaxDividerProps) {
  return (
    <ParallaxSection
      imagePath={imagePath}
      speed={0.3}
      height="h-[150px] md:h-[200px]"
      overlayOpacity={0.5}
      gradientFade="both"
      alt={alt || 'Section divider'}
    />
  );
}
