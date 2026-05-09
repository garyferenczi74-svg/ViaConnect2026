'use client';

// Prompt #153 MT-07: SVG wrapper that hosts the body figure image and
// the per-segment pill overlays in a single shared coordinate space.
// The avatar fills the 400x800 viewBox via preserveAspectRatio="none"
// so pill coordinates positioned in viewBox units always sit on the
// same anatomical landmarks regardless of the natural aspect ratio
// of the underlying SVG asset (male 720x1152, female 720x1008). The
// resulting horizontal compression is uniform across both the
// avatar and the pill positions, so visually they stay aligned
// together.

import type { ReactNode } from 'react';
import { FIGURE_VIEWBOX, type Sex } from '@/lib/body-tracker/segments';

interface BodyFigureSvgProps {
  sex: Sex;
  children?: ReactNode;
  className?: string;
}

const FIGURE_HREF: Record<Sex, string> = {
  male:   'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Body%20Tracker/Male%20Avatar.svg',
  female: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Body%20Tracker/Female.svg',
};

export function BodyFigureSvg({ sex, children, className }: BodyFigureSvgProps) {
  return (
    <svg
      viewBox={`0 0 ${FIGURE_VIEWBOX.width} ${FIGURE_VIEWBOX.height}`}
      className={className}
      role="img"
      aria-label={`${sex === 'male' ? 'Male' : 'Female'} body figure with segmental fat analysis indicators`}
      preserveAspectRatio="xMidYMid meet"
    >
      <image
        href={FIGURE_HREF[sex]}
        x={0}
        y={0}
        width={FIGURE_VIEWBOX.width}
        height={FIGURE_VIEWBOX.height}
        preserveAspectRatio="none"
      />
      {children}
    </svg>
  );
}
