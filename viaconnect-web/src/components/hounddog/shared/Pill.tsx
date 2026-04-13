'use client';

import React from 'react';

interface PillProps {
  label: string;
  color: string;
  className?: string;
}

export default function Pill({ label, color, className }: PillProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: color + '1A',
        border: `1px solid ${color}40`,
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 600,
        color,
        padding: '2px 7px',
      }}
    >
      {label}
    </span>
  );
}
