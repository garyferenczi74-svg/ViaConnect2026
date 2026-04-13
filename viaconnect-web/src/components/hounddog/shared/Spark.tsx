'use client';

import React from 'react';

interface SparkProps {
  data: number[];
  color: string;
  w?: number;
  h?: number;
}

export default function Spark({ data, color, w = 80, h = 26 }: SparkProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((val - min) / range) * h;
    return `${x},${y}`;
  });

  const gradientId = `spark-${color.replace(/[^a-zA-Z]/g, '')}`;
  const pointsStr = points.join(' ');
  const fillPath = `M0,${h} ${points.map((p, i) => `${i === 0 ? 'L' : ''}${p}`).join(' L')} L${w},${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradientId})`} />
      <polyline
        points={pointsStr}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
