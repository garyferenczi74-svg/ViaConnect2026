'use client';

import React from 'react';

type PillColor = 'teal' | 'orange' | 'green' | 'red' | 'gray';
type PillSize = 'sm' | 'md';

interface HounddogPillProps {
  label: string;
  color: PillColor;
  size?: PillSize;
  className?: string;
}

const colorMap: Record<PillColor, string> = {
  teal: 'bg-[#2DA5A0]/20 text-[#2DA5A0]',
  orange: 'bg-[#B75E18]/20 text-[#E8863A]',
  green: 'bg-emerald-500/20 text-emerald-400',
  red: 'bg-red-500/20 text-red-400',
  gray: 'bg-white/10 text-white/50',
};

const sizeMap: Record<PillSize, string> = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-3 py-1',
};

export default function HounddogPill({
  label,
  color,
  size = 'sm',
  className = '',
}: HounddogPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colorMap[color]} ${sizeMap[size]} ${className}`}
    >
      {label}
    </span>
  );
}
