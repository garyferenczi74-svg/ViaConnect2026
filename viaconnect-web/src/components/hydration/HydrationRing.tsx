/**
 * Prompt 170o Phase 1 Phase C: HydrationRing component.
 *
 * Shared circular progress ring per Hannah §1 + §2 + §4. Used at three sizes:
 * - Large (Dashboard widget + Detail view Today section): 128px diameter
 * - Small (NutriVision card): 64px diameter
 * - Stroke width scales with size.
 *
 * Color: Teal at-or-above target; Card-tint when below target (NOT Orange;
 * Hannah explicitly rejected warning-color framing in §1 push-back).
 * Animates 0.6s ease-in-out on value updates; reduced-motion fallback to
 * instant update. SVG-based; no canvas dependencies.
 */

'use client';

import { useEffect, useState } from 'react';

export interface HydrationRingProps {
  total_ml: number;
  target_ml: number;
  size?: 'small' | 'large';
  unitLabel?: string;
  centerLabel?: string;
  centerSublabel?: string;
}

const SMALL = { diameter: 64, stroke: 6 };
const LARGE = { diameter: 128, stroke: 12 };

export function HydrationRing({
  total_ml,
  target_ml,
  size = 'large',
  centerLabel,
  centerSublabel,
}: HydrationRingProps): JSX.Element {
  const dims = size === 'small' ? SMALL : LARGE;
  const radius = (dims.diameter - dims.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTarget = target_ml > 0 ? target_ml : 1890;
  const ratio = Math.min(1, total_ml / safeTarget);

  const [drawRatio, setDrawRatio] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent): void => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setDrawRatio(ratio);
      return;
    }
    const id = window.requestAnimationFrame(() => setDrawRatio(ratio));
    return () => window.cancelAnimationFrame(id);
  }, [ratio, reducedMotion]);

  const ringColor = ratio >= 1 ? '#2DA5A0' : 'rgba(255,255,255,0.16)';
  const dashOffset = circumference * (1 - drawRatio);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: dims.diameter, height: dims.diameter }}
      aria-label={`Hydration ${Math.round(ratio * 100)} percent of daily target`}
      role="img"
    >
      <svg
        width={dims.diameter}
        height={dims.diameter}
        viewBox={`0 0 ${dims.diameter} ${dims.diameter}`}
        aria-hidden="true"
      >
        <circle
          cx={dims.diameter / 2}
          cy={dims.diameter / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={dims.stroke}
        />
        <circle
          cx={dims.diameter / 2}
          cy={dims.diameter / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={dims.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            transition: reducedMotion ? 'none' : 'stroke-dashoffset 0.6s ease-in-out, stroke 0.3s ease-in-out',
          }}
        />
      </svg>
      {(centerLabel || centerSublabel) ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          {centerLabel ? (
            <div className={size === 'large' ? 'text-xl font-semibold' : 'text-sm font-medium'}>
              {centerLabel}
            </div>
          ) : null}
          {centerSublabel ? (
            <div className={size === 'large' ? 'text-sm text-white/70' : 'text-[10px] text-white/70'}>
              {centerSublabel}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function formatVolumeLabel(ml: number): string {
  if (ml < 1000) return `${Math.round(ml)} ml`;
  const liters = Math.round((ml / 1000) * 10) / 10;
  return `${liters} L`;
}
