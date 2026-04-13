'use client';

import React from 'react';

interface LiveBadgeProps {
  active: boolean;
}

export default function LiveBadge({ active }: LiveBadgeProps) {
  if (active) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(39,201,122,0.12)',
          color: '#27C97A',
          fontSize: 9,
          fontWeight: 700,
          borderRadius: 4,
          padding: '2px 6px',
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#27C97A',
            animation: 'hd-pulse 1.8s infinite',
          }}
        />
        LIVE
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'rgba(255,255,255,0.06)',
        color: 'rgba(255,255,255,0.38)',
        fontSize: 9,
        fontWeight: 700,
        borderRadius: 4,
        padding: '2px 6px',
      }}
    >
      IDLE
    </span>
  );
}
