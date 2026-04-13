'use client';

// CheckInSlider — shared reusable slider for the Quick Daily Check widget.
// Uses CSS custom properties for fill color + percentage, avoiding JS paint.

import { useRef, useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CheckInSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  formatLabel: (value: number) => string;
  leftLabel?: string;
  rightLabel?: string;
  icon?: ReactNode;
  title: string;
  accentColor?: string;
  id: string;
}

export function CheckInSlider({
  min,
  max,
  step,
  value,
  onChange,
  formatLabel,
  leftLabel,
  rightLabel,
  icon,
  title,
  accentColor = '#2DA5A0',
  id,
}: CheckInSliderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      const pct = (((value - min) / (max - min)) * 100).toFixed(1);
      inputRef.current.style.setProperty('--slider-pct', `${pct}%`);
      inputRef.current.style.setProperty('--slider-color', accentColor);
    }
  }, [value, min, max, accentColor]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mb-4"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm text-white/70">{title}</span>
        </div>
        <span
          className="min-w-[4rem] text-right text-sm font-semibold tabular-nums"
          style={{ color: accentColor }}
        >
          {formatLabel(value)}
        </span>
      </div>

      <div className="relative flex items-center gap-2">
        {leftLabel && (
          <span className="shrink-0 text-[10px] text-white/40">{leftLabel}</span>
        )}
        <input
          ref={inputRef}
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="checkin-slider h-1 flex-1 cursor-pointer appearance-none rounded-full"
          aria-label={title}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
        {rightLabel && (
          <span className="shrink-0 text-[10px] text-white/40">{rightLabel}</span>
        )}
      </div>
    </motion.div>
  );
}
