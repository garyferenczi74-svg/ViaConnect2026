'use client';

// Prompt #157k: glass card surface for one body region. Variant
// drives whether the close affordance shows (pinned only) and which
// AnimatePresence layer hosts it. Width follows the spec's
// 220 / 180 px desktop / mobile contract; the parent supplies the
// already-resolved width via prop so the card stays display-only.

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, X } from 'lucide-react';
import {
  CARD_VARIANTS,
  CARD_VARIANTS_REDUCED,
  REDUCED_MOTION_TRANSITION,
  SPRING_CONFIG,
  Z_CARD,
} from './constants';
import { REGION_LABELS } from './constants';
import type {
  BodyRegionData,
  CardPosition,
  CardVariant,
  Classification,
} from './types';

interface SegmentalCardProps {
  readonly region: BodyRegionData;
  readonly variant: CardVariant;
  readonly position: CardPosition;
  readonly width: number;
  readonly reducedMotion: boolean;
  readonly onClose?: () => void;
}

const CHIP_STYLES: Record<Classification, { color: string; bg: string; border: string }> = {
  Low:      { color: '#FAB773', bg: 'rgba(183, 94, 24, 0.18)',  border: 'rgba(183, 94, 24, 0.45)' },
  Standard: { color: '#7AD7D2', bg: 'rgba(45, 165, 160, 0.18)', border: 'rgba(45, 165, 160, 0.45)' },
  Good:     { color: '#7AE0A1', bg: 'rgba(34, 197, 94, 0.18)',  border: 'rgba(34, 197, 94, 0.45)' },
  High:     { color: '#F4B73D', bg: 'rgba(234, 179, 8, 0.18)',  border: 'rgba(234, 179, 8, 0.45)' },
};

export function SegmentalCard({
  region,
  variant,
  position,
  width,
  reducedMotion,
  onClose,
}: SegmentalCardProps) {
  const variants = reducedMotion ? CARD_VARIANTS_REDUCED : CARD_VARIANTS;
  const transition = reducedMotion ? REDUCED_MOTION_TRANSITION : SPRING_CONFIG;
  const chip = CHIP_STYLES[region.classification];
  const label = region.label || REGION_LABELS[region.id];

  return (
    <motion.div
      key={region.id}
      data-region={region.id}
      data-variant={variant}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`segmental-card-${region.id}-label`}
      className="pointer-events-auto absolute select-none rounded-[14px] border border-[rgba(45,165,160,0.30)] bg-[rgba(30,48,84,0.55)] px-4 py-3 font-[Instrument_Sans] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl"
      style={{
        left: position.x,
        top: position.y,
        width,
        zIndex: Z_CARD,
      }}
      initial={variants.initial}
      animate={variants.animate}
      exit={variants.exit}
      transition={transition}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span
          id={`segmental-card-${region.id}-label`}
          className="text-[13px] font-medium text-[rgba(229,235,245,0.85)]"
        >
          {label}
        </span>
        {variant === 'pinned' && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${label} card`}
            className="-mr-1 -mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[rgba(229,235,245,0.6)] transition-colors hover:bg-white/[0.06] hover:text-[rgba(229,235,245,0.9)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(45,165,160,0.7)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E3054]"
          >
            <X size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-[Instrument_Sans] text-[28px] font-semibold leading-none tabular-nums text-white">
          {region.metric.value.toFixed(1)}
        </span>
        <span className="text-[14px] text-[rgba(229,235,245,0.6)]">
          {region.metric.unit}
        </span>
        {region.trend === 'up' && (
          <TrendingUp size={14} strokeWidth={1.5} className="text-[#FAB773]" aria-label="Trending up" />
        )}
        {region.trend === 'down' && (
          <TrendingDown size={14} strokeWidth={1.5} className="text-[#7AE0A1]" aria-label="Trending down" />
        )}
      </div>

      <span
        className="inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase"
        style={{
          color: chip.color,
          backgroundColor: chip.bg,
          borderColor: chip.border,
          letterSpacing: '0.04em',
        }}
      >
        {region.classification}
      </span>
    </motion.div>
  );
}
