'use client';

import React, { useState } from 'react';

interface SourceLogoSource {
  color: string;
  icon: string;
  logoUrl: string | null;
  logoType: 'square' | 'wide' | 'round';
  name: string;
}

interface SourceLogoProps {
  source: SourceLogoSource;
  size?: number;
  className?: string;
}

export function SourceLogo({ source, size = 48, className }: SourceLogoProps) {
  const [imgError, setImgError] = useState(false);

  const borderRadius = source.logoType === 'round' ? '50%' : 14;
  const isSvg = source.logoUrl?.endsWith('.svg');

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius,
    background: `linear-gradient(135deg, ${source.color}15, ${source.color}30)`,
    border: `1.5px solid ${source.color}30`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  };

  if (source.logoUrl && !imgError) {
    return (
      <div style={containerStyle} className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={source.logoUrl}
          alt={source.name}
          onError={() => setImgError(true)}
          loading="lazy"
          style={{
            width: isSvg ? size * 0.55 : size * 0.75,
            height: isSvg ? size * 0.55 : size * 0.75,
            objectFit: 'contain',
            borderRadius: isSvg ? 0 : 6,
            imageRendering: 'auto',
          }}
        />
      </div>
    );
  }

  // Fallback: styled initials
  return (
    <div style={containerStyle} className={className}>
      <span
        style={{
          fontSize: size * 0.29,
          fontWeight: 800,
          color: source.color,
          lineHeight: 1,
          letterSpacing: '-0.5px',
        }}
      >
        {source.icon}
      </span>
    </div>
  );
}
