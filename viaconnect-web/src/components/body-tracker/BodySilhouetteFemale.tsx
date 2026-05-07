'use client';

// Female body silhouette — 5-segment SVG with hourglass proportions.
// Same callout architecture as BodySilhouetteMale.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { getSegmentStatus, STATUS_COLORS } from '@/lib/body-tracker/calculations';
import {
  computeJourneyOverlay,
  shouldShowGhostOutline,
} from '@/lib/body-tracker/journey-overlay';
import type {
  JourneyType,
  JourneyStartingSnapshot,
} from '@/hooks/body-tracker/useUserJourney';
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

interface BodySilhouetteFemaleProps {
  mode: 'fat' | 'muscle';
  segmentalData: SegmentalFatData | SegmentalMuscleData;
  journey?: JourneyType | null;
  journeyStartSnapshot?: JourneyStartingSnapshot | null;
  onSegmentClick?: (segment: SegmentKey) => void;
}

// Female anatomy: narrower shoulders (~155-245), pinched waist around y=290,
// wider hips (~145-255 around y=400), legs taper from hips.
const SEGMENTS: Array<{ key: SegmentKey; segType: 'arm' | 'trunk' | 'leg'; d: string }> = [
  { key: 'right_arm', segType: 'arm',   d: 'M148,168 C138,182 130,210 122,265 L112,275 C107,275 104,270 107,260 L120,210 C124,192 130,180 140,168 Z' },
  { key: 'left_arm',  segType: 'arm',   d: 'M252,168 C262,182 270,210 278,265 L288,275 C293,275 296,270 293,260 L280,210 C276,192 270,180 260,168 Z' },
  { key: 'trunk',     segType: 'trunk', d: 'M158,160 L242,160 C248,200 252,250 230,290 C220,310 218,320 222,335 L178,335 C182,320 180,310 170,290 C148,250 152,200 158,160 Z' },
  { key: 'right_leg', segType: 'leg',   d: 'M155,340 L198,340 C200,400 196,490 192,580 L186,620 L182,620 C180,620 172,620 170,620 L155,580 C150,490 148,400 155,340 Z' },
  { key: 'left_leg',  segType: 'leg',   d: 'M202,340 L245,340 C252,400 250,490 245,580 L230,620 C228,620 220,620 214,620 L208,620 L204,580 C200,490 200,400 202,340 Z' },
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

export function BodySilhouetteFemale({
  mode,
  segmentalData,
  journey,
  journeyStartSnapshot,
  onSegmentClick,
}: BodySilhouetteFemaleProps) {
  const [hovered, setHovered] = useState<SegmentKey | null>(null);
  const unit = mode === 'fat' ? '%' : 'lbs';

  const segmentData = SEGMENTS.map((seg) => {
    const value = getValue(segmentalData, seg.key, mode);
    const status = getSegmentStatus(value, seg.segType, mode, 'female');
    return { ...seg, value, status };
  });

  const totalForJourney =
    mode === 'fat'
      ? (segmentalData as SegmentalFatData).total_body_fat_pct
      : (segmentalData as SegmentalMuscleData).total_muscle_mass_lbs;
  const journeyOverlay = computeJourneyOverlay(
    journey,
    mode,
    totalForJourney,
    journeyStartSnapshot,
  );
  const showGhost = shouldShowGhostOutline(journey, mode, journeyStartSnapshot);

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center lg:gap-8">
      <div className="hidden w-[180px] flex-col gap-3 lg:flex">
        {segmentData.filter((_, i) => i % 2 === 0).map((seg) => (
          <SegmentalCallout key={seg.key} segment={seg.key} value={seg.value} unit={unit} status={seg.status} position="left" onClick={() => onSegmentClick?.(seg.key)} />
        ))}
      </div>

      <div className="relative w-[280px] lg:w-[350px]">
        <svg viewBox="0 0 400 660" className="h-auto w-full" aria-label="Female body silhouette">
          <circle cx="200" cy="80" r="40" fill="none" stroke="rgba(183,94,24,0.25)" strokeWidth="1.5" />
          <circle cx="200" cy="80" r="26" fill="rgba(183,94,24,0.08)" />
          <rect x="190" y="120" width="20" height="32" rx="5" fill="rgba(183,94,24,0.08)" stroke="rgba(183,94,24,0.15)" strokeWidth="1" />
          <line x1="200" y1="160" x2="200" y2="335" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <line x1="170" y1="200" x2="230" y2="200" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <line x1="180" y1="240" x2="220" y2="240" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <line x1="170" y1="290" x2="230" y2="290" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

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

          {journeyOverlay && (
            <g pointerEvents="none" aria-hidden="true">
              {SEGMENTS.map((seg) => (
                <path
                  key={`overlay-${seg.key}`}
                  d={seg.d}
                  fill={journeyOverlay.color}
                  fillOpacity={journeyOverlay.opacity}
                  stroke="none"
                />
              ))}
            </g>
          )}

          {showGhost && (
            <g pointerEvents="none" aria-hidden="true">
              {SEGMENTS.map((seg) => (
                <path
                  key={`ghost-${seg.key}`}
                  d={seg.d}
                  fill="none"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
              ))}
            </g>
          )}
        </svg>
      </div>

      <div className="hidden w-[180px] flex-col gap-3 lg:flex">
        {segmentData.filter((_, i) => i % 2 === 1).map((seg) => (
          <SegmentalCallout key={seg.key} segment={seg.key} value={seg.value} unit={unit} status={seg.status} position="right" onClick={() => onSegmentClick?.(seg.key)} />
        ))}
      </div>

      <div className="flex w-full flex-col gap-2 px-2 lg:hidden">
        {segmentData.map((seg) => (
          <SegmentalCallout key={seg.key} segment={seg.key} value={seg.value} unit={unit} status={seg.status} position="left" onClick={() => onSegmentClick?.(seg.key)} />
        ))}
      </div>
    </div>
  );
}
