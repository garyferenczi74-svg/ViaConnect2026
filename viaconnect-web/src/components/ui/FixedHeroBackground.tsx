'use client';

import Image from 'next/image';

interface FixedHeroBackgroundProps {
  /** Supabase Storage path OR full URL */
  imagePath: string;
  /** Dark overlay opacity (0–1) for text readability */
  overlayOpacity?: number;
  /** Alt text for accessibility */
  alt?: string;
}

const SUPABASE_STORAGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;

export default function FixedHeroBackground({
  imagePath,
  overlayOpacity = 0.35,
  alt = 'Dashboard background',
}: FixedHeroBackgroundProps) {
  const imageUrl = imagePath.startsWith('http')
    ? imagePath
    : `${SUPABASE_STORAGE_URL}/${imagePath}`;

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <Image
        src={imageUrl}
        alt={alt}
        fill
        className="object-cover"
        sizes="100vw"
        priority
        quality={80}
      />
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(26, 39, 68, ${overlayOpacity})` }}
      />
    </div>
  );
}
