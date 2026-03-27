'use client';

import React from 'react';
import { TAG_COLORS } from './tagColors';

interface TagPillProps {
  tag: string;
}

const FALLBACK = { bg: 'rgba(160, 174, 192, 0.18)', text: '#A0AEC0' };

export default function TagPill({ tag }: TagPillProps) {
  const colors = TAG_COLORS[tag] || FALLBACK;

  return (
    <span
      className="px-2.5 py-1 rounded-md text-[11px] font-semibold"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      {tag}
    </span>
  );
}
