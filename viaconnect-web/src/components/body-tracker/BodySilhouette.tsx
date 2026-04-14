'use client';

// BodySilhouette — SVG body outline with 5 interactive segmental regions.
// Used by both Body Composition (fat) and Muscle Analysis (muscle) tabs.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { getSegmentStatus, STATUS_COLORS, type SegmentStatus } from '@/lib/body-tracker/calculations';
import { SegmentalCallout, type SegmentKey } from './SegmentalCallout';

interface SegmentalFatData {
  right_arm_pct: number;
  left_arm_pct: number;
  trunk_pct: number;
  right_leg_pct: number;
  left_leg_pct: number;
  total_body_fat_pct: number;
}

interface SegmentalMuscleData {
  right_arm_lbs: number;
  left_arm_lbs: number;
  trunk_lbs: number;
  right_leg_lbs: number;
  left_leg_lbs: number;
  total_muscle_mass_lbs: number;
  skeletal_muscle_mass_lbs: number;
}

interface BodySilhouetteProps {
  mode: 'fat' | 'muscle';
  segmentalData: SegmentalFatData | SegmentalMuscleData;
  gender?: 'male' | 'female';
  onSegmentClick?: (segment: SegmentKey) => void;
}

const SEGMENTS: Array<{ key: SegmentKey; segType: 'arm' | 'trunk' | 'leg'; d: string }> = [
  { key: 'right_arm', segType: 'arm', d: 'M135,165 C125,180 118,210 112,270 L100,275 C95,275 92,270 95,260 L108,210 C112,190 118,175 128,162 Z' },
  { key: 'left_arm', segType: 'arm', d: 'M265,165 C275,180 282,210 288,270 L300,275 C305,275 308,270 305,260 L292,210 C288,190 282,175 272,162 Z' },
  { key: 'trunk', segType: 'trunk', d: 'M145,160 L255,160 C258,200 260,260 258,340 L142,340 C140,260 142,200 145,160 Z' },
  { key: 'right_leg', segType: 'leg', d: 'M148,345 L198,345 C196,420 192,500 188,580 L184,620 L180,620 C178,620 170,620 168,620 L150,580 C146,500 144,420 148,345 Z' },
  { key: 'left_leg', segType: 'leg', d: 'M202,345 L252,345 C256,420 258,500 254,580 L250,620 C248,620 240,620 232,620 L220,620 L216,620 C212,580 208,500 202,345 Z' },
];

function getValue(data: SegmentalFatData | SegmentalMuscleData, key: SegmentKey, mode: 'fat' | 'muscle'): number {
  if (mode === 'fat') {
    const d = data as SegmentalFatData;
    const map: Record<SegmentKey, number> = {
      right_arm: d.right_arm_pct, left_arm: d.left_arm_pct,
      trunk: d.trunk_pct, right_leg: d.right_leg_pct, left_leg: d.left_leg_pct,
    };
    return map[key] ?? 0;
  }
  const d = data as SegmentalMuscleData;
  const map: Record<SegmentKey, number> = {
    right_arm: d.right_arm_lbs, left_arm: d.left_arm_lbs,
    trunk: d.trunk_lbs, right_leg: d.right_leg_lbs, left_leg: d.left_leg_lbs,
  };
  return map[key] ?? 0;
}

export function BodySilhouette({ mode, segmentalData, gender = 'male', onSegmentClick }: BodySilhouetteProps) {
  const [hovered, setHovered] = useState<SegmentKey | null>(null);
  const unit = mode === 'fat' ? '%' : 'lbs';

  const segmentData = SEGMENTS.map((seg) => {
    const value = getValue(segmentalData, seg.key, mode);
    const status = getSegmentStatus(value, seg.segType, mode, gender);
    return { ...seg, value, status };
  });

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center lg:gap-8">
      {/* Left callouts (desktop) */}
      <div className="hidden w-[180px] flex-col gap-3 lg:flex">
        {segmentData.filter((_, i) => i % 2 === 0).map((seg) => (
          <SegmentalCallout
            key={seg.key}
            segment={seg.key}
            value={seg.value}
            unit={unit}
            status={seg.status}
            position="left"
            onClick={() => onSegmentClick?.(seg.key)}
          />
        ))}
      </div>

      {/* SVG Body */}
      <div className="relative w-[280px] lg:w-[350px]">
        <svg viewBox="0 0 400 660" className="h-auto w-full">
          {/* Head (decorative) */}
          <circle cx="200" cy="80" r="45" fill="none" stroke="rgba(45,165,160,0.25)" strokeWidth="1.5" />
          <circle cx="200" cy="80" r="30" fill="rgba(45,165,160,0.08)" />
          {/* Neck */}
          <rect x="188" y="125" width="24" height="30" rx="6" fill="rgba(45,165,160,0.08)" stroke="rgba(45,165,160,0.15)" strokeWidth="1" />
          {/* Skeletal overlay (decorative) */}
          <line x1="200" y1="160" x2="200" y2="340" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <line x1="160" y1="200" x2="240" y2="200" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <line x1="160" y1="240" x2="240" y2="240" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <line x1="160" y1="280" x2="240" y2="280" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

          {/* Segment paths */}
          {segmentData.map((seg, i) => {
            const color = STATUS_COLORS[seg.status];
            const isHovered = hovered === seg.key;
            const fillOpacity = isHovered ? 0.5 : 0.2;
            return (
              <motion.path
                key={seg.key}
                d={seg.d}
                fill={`${color}${Math.round(fillOpacity * 255).toString(16).padStart(2, '0')}`}
                stroke={`${color}88`}
                strokeWidth={isHovered ? 2 : 1}
                initial={{ opacity: 0, pathLength: 0 }}
                animate={{ opacity: 1, pathLength: 1 }}
                transition={{ pathLength: { duration: 1, delay: i * 0.12 }, opacity: { duration: 0.3, delay: i * 0.12 } }}
                className="cursor-pointer transition-all"
                style={isHovered ? { filter: `drop-shadow(0 0 8px ${color}80)` } : undefined}
                onMouseEnter={() => setHovered(seg.key)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSegmentClick?.(seg.key)}
              />
            );
          })}
        </svg>
      </div>

      {/* Right callouts (desktop) */}
      <div className="hidden w-[180px] flex-col gap-3 lg:flex">
        {segmentData.filter((_, i) => i % 2 === 1).map((seg) => (
          <SegmentalCallout
            key={seg.key}
            segment={seg.key}
            value={seg.value}
            unit={unit}
            status={seg.status}
            position="right"
            onClick={() => onSegmentClick?.(seg.key)}
          />
        ))}
      </div>

      {/* Mobile callout list */}
      <div className="flex w-full flex-col gap-2 px-2 lg:hidden">
        {segmentData.map((seg) => (
          <SegmentalCallout
            key={seg.key}
            segment={seg.key}
            value={seg.value}
            unit={unit}
            status={seg.status}
            position="left"
            onClick={() => onSegmentClick?.(seg.key)}
          />
        ))}
      </div>
    </div>
  );
}
