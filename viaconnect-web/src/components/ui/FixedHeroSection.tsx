'use client';

// FixedHeroSection — Sonar-style fixed-background scroll-over section.
// Pure CSS: background-attachment:fixed on desktop, bg-scroll on mobile
// (iOS Safari fallback). No JavaScript motion hooks needed.
//
// When height="auto", the section grows to fit its children (use
// className="min-h-[420px]" etc. to set a minimum). Children layout
// is flex-col so callers control alignment via their own classes.

import type { ReactNode } from 'react';

interface FixedHeroSectionProps {
  /** Full Supabase URL or relative path in Hero Images bucket */
  imageUrl: string;
  /** Tailwind height classes OR 'auto' to let children drive height. */
  height?: string;
  /** Overlay darkness 0-1. Default: 0.55 */
  overlayOpacity?: number;
  /** Gradient fade direction for blend into next section */
  gradientFade?: 'bottom' | 'top' | 'both' | 'none';
  /** Alt text for accessibility */
  alt?: string;
  /** Content rendered over image */
  children?: ReactNode;
  /** Additional className (e.g. min-h-[420px] when height='auto') */
  className?: string;
}

export default function FixedHeroSection({
  imageUrl,
  height = 'h-[320px] md:h-[420px]',
  overlayOpacity = 0.55,
  gradientFade = 'bottom',
  alt = 'Section background',
  children,
  className = '',
}: FixedHeroSectionProps) {
  const gradientMap = {
    bottom:
      'linear-gradient(to bottom, transparent 50%, #1A2744 100%)',
    top:
      'linear-gradient(to top, transparent 50%, #1A2744 100%)',
    both:
      'linear-gradient(to bottom, #1A2744 0%, transparent 30%, transparent 70%, #1A2744 100%)',
    none: 'none',
  };

  // When height='auto', omit fixed height; let children drive height
  const heightClass = height === 'auto' ? '' : height;

  return (
    <section
      role="img"
      aria-label={alt}
      className={`relative overflow-hidden ${heightClass} ${className}`}
    >
      {/* Fixed background: bg-scroll on mobile (<md), bg-fixed on desktop (>=md) */}
      <div
        className="absolute inset-0 bg-scroll bg-center bg-cover md:bg-fixed"
        style={{ backgroundImage: `url('${imageUrl}')` }}
      />

      {/* Colour overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(10, 15, 35, ${overlayOpacity})` }}
      />

      {/* Gradient fade to page background */}
      {gradientFade !== 'none' && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: gradientMap[gradientFade] }}
        />
      )}

      {/* Children layout:
          height='auto' → flex-col, children control positioning
          fixed height  → centred by default */}
      {children && (
        <div
          className={`relative z-10 flex h-full w-full flex-col ${
            height !== 'auto' ? 'items-center justify-center' : ''
          }`}
        >
          {children}
        </div>
      )}
    </section>
  );
}
