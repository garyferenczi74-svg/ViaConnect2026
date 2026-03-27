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

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius,
    background: `linear-gradient(135deg, ${source.color}26, ${source.color}40)`,
    border: `1.5px solid ${source.color}40`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  };

  if (source.logoUrl && !imgError) {
    return (
      <div style={containerStyle} className={className}>
        <img
          src={source.logoUrl}
          alt={source.name}
          onError={() => setImgError(true)}
          style={{
            width: size * 0.65,
            height: size * 0.65,
            objectFit: 'contain',
            borderRadius: 4,
          }}
        />
      </div>
    );
  }

  // Fallback: initials / icon text
  return (
    <div style={containerStyle} className={className}>
      <span
        style={{
          fontSize: size * 0.29,
          fontWeight: 800,
          color: source.color,
          lineHeight: 1,
        }}
      >
        {source.icon}
      </span>
    </div>
  );
}
