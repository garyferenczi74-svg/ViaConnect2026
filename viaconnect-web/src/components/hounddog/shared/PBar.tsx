'use client';

import React from 'react';

interface PBarProps {
  value: number;
  color: string;
  height?: number;
}

export default function PBar({ value, color, height = 3 }: PBarProps) {
  return (
    <div
      style={{
        width: '100%',
        height,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: '100%',
          background: color,
          borderRadius: 2,
          transition: 'width 1.2s ease',
        }}
      />
    </div>
  );
}
