'use client';

// Photo Sync prompt §3.6: shared product image renderer.
//
// Five variants (card / hero / cart / thumb / detail) with per-variant
// sizes and aspect ratios. Uses next/image with the supabase
// remotePattern already configured in next.config.mjs. Falls back to
// <ProductImageFallback /> when src is null OR when the browser fails
// to load the image (404 / network error).

import { useState } from 'react';
import Image, { type StaticImageData } from 'next/image';
import { ProductImageFallback } from './ProductImageFallback';

export type ProductImageVariant = 'card' | 'hero' | 'cart' | 'thumb' | 'detail';

interface ProductImageProps {
  src: string | StaticImageData | null;
  alt: string;                       // resolved via getDisplayName() at the call site
  variant: ProductImageVariant;
  priority?: boolean;
  className?: string;
  fallbackSku?: string | null;       // shown to admins on the fallback
  showSkuToAdmin?: boolean;          // pass true on admin surfaces only
}

const VARIANT_CLASSES: Record<ProductImageVariant, string> = {
  card:   'relative w-full aspect-square overflow-hidden rounded-lg',
  hero:   'relative w-full aspect-square md:aspect-[4/5] overflow-hidden rounded-xl',
  cart:   'relative w-[72px] h-[72px] md:w-[96px] md:h-[96px] overflow-hidden rounded-md',
  thumb:  'relative w-12 h-12 overflow-hidden rounded',
  detail: 'relative w-full aspect-[4/5] overflow-hidden rounded-xl',
};

const VARIANT_SIZES: Record<ProductImageVariant, string> = {
  card:   '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
  hero:   '(max-width: 768px) 100vw, 50vw',
  cart:   '96px',
  thumb:  '48px',
  detail: '(max-width: 768px) 100vw, 50vw',
};

export function ProductImage({
  src, alt, variant,
  priority,
  className,
  fallbackSku,
  showSkuToAdmin,
}: ProductImageProps): JSX.Element {
  const [errored, setErrored] = useState(false);
  const finalPriority = priority ?? variant === 'hero';

  const wrapperCls = `${VARIANT_CLASSES[variant]} ${className ?? ''}`;

  if (src == null || errored) {
    return (
      <div className={wrapperCls}>
        <ProductImageFallback sku={fallbackSku} showSkuToAdmin={showSkuToAdmin} />
      </div>
    );
  }

  return (
    <div
      className={`${wrapperCls} animate-pulse-once`}
      style={{ background: 'rgba(26, 39, 68, 0.05)' }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={VARIANT_SIZES[variant]}
        quality={82}
        priority={finalPriority}
        loading={finalPriority ? undefined : 'lazy'}
        className="object-cover"
        onError={() => setErrored(true)}
        onLoad={(e) => {
          // Once loaded, drop the pulse background.
          const img = e.currentTarget as HTMLImageElement;
          const wrapper = img.closest('div');
          if (wrapper) wrapper.style.background = '';
        }}
      />
    </div>
  );
}
