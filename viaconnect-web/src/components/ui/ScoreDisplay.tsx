'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type ScoreColor = 'teal' | 'green' | 'amber' | 'red';
type ScoreSize = 'sm' | 'md' | 'lg' | 'xl';
type ScoreTrend = 'up' | 'down' | 'stable';

interface ScoreDisplayProps {
  value: number;
  maxValue?: number;
  label: string;
  trend?: ScoreTrend;
  trendValue?: string;
  color?: ScoreColor;
  size?: ScoreSize;
}

const SIZE_CONFIG: Record<ScoreSize, { ring: number; fontSize: string; fontWeight: number; strokeWidth: number }> = {
  sm: { ring: 64, fontSize: '1.25rem', fontWeight: 700, strokeWidth: 4 },
  md: { ring: 96, fontSize: '1.875rem', fontWeight: 700, strokeWidth: 5 },
  lg: { ring: 128, fontSize: '2.25rem', fontWeight: 700, strokeWidth: 6 },
  xl: { ring: 180, fontSize: '72px', fontWeight: 800, strokeWidth: 8 },
};

const COLOR_MAP: Record<ScoreColor, { stroke: string; glow: string }> = {
  teal: { stroke: '#2DA5A0', glow: 'drop-shadow(0 0 10px rgba(45,165,160,0.5))' },
  green: { stroke: '#27AE60', glow: 'drop-shadow(0 0 10px rgba(39,174,96,0.5))' },
  amber: { stroke: '#F39C12', glow: 'drop-shadow(0 0 10px rgba(243,156,18,0.5))' },
  red: { stroke: '#E74C3C', glow: 'drop-shadow(0 0 10px rgba(231,76,60,0.5))' },
};

export function ScoreDisplay({
  value,
  maxValue = 100,
  label,
  trend,
  trendValue,
  color = 'teal',
  size = 'lg',
}: ScoreDisplayProps) {
  const config = SIZE_CONFIG[size];
  const colorConfig = COLOR_MAP[color];

  const radius = (config.ring - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value / maxValue, 0), 1);
  const strokeDashoffset = circumference * (1 - progress);

  const useGradient = size === 'xl';

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#27AE60' : trend === 'down' ? '#E74C3C' : 'var(--text-secondary)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      {/* Ring */}
      <div style={{ position: 'relative', width: config.ring, height: config.ring }}>
        <svg
          width={config.ring}
          height={config.ring}
          viewBox={`0 0 ${config.ring} ${config.ring}`}
          style={{ transform: 'rotate(-90deg)', filter: colorConfig.glow }}
        >
          {useGradient && (
            <defs>
              <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2DA5A0" />
                <stop offset="100%" stopColor="#B75E18" />
              </linearGradient>
            </defs>
          )}

          {/* Track */}
          <circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={radius}
            fill="none"
            stroke="#1A2744"
            strokeWidth={config.strokeWidth}
          />

          {/* Progress */}
          <circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={radius}
            fill="none"
            stroke={useGradient ? 'url(#score-gradient)' : colorConfig.stroke}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 600ms ease' }}
          />
        </svg>

        {/* Center text */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: '2px',
          }}
        >
          <span
            style={{
              fontSize: config.fontSize,
              fontWeight: config.fontWeight,
              color: '#FFFFFF',
              lineHeight: 1,
            }}
          >
            {value}
          </span>
        </div>
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}
        className="text-caption"
      >
        {label}
      </span>

      {/* Trend */}
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: trendColor }}>
          <TrendIcon size={size === 'sm' ? 14 : 16} />
          {trendValue && (
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{trendValue}</span>
          )}
        </div>
      )}
    </div>
  );
}
