'use client';

import { Circle } from 'lucide-react';
import {
  numericToConfidenceLevel,
  confidenceColorVar,
  confidenceBodyLabel,
} from '@/lib/arnold/scanning/accuracy/confidenceDisplay';

interface ConfidenceChipProps {
  /**
   * Numeric confidence score (0-1) from the body_tracker_circumference or
   * body_tracker_weight confidence columns (Task 10, Prompt 210c).
   * null means UNKNOWN (measurement is not from a scan, or pre-dates Task 10).
   * Renders nothing when null; the "not measured" state has no confidence indicator.
   */
  confidence: number | null;
  className?: string;
}

/**
 * Small per-measurement confidence chip for the body-tracker measurements surface.
 * Renders a colored dot and body-positive label when confidence is a known numeric score.
 * Renders nothing when confidence is null (RULE 9: no fabricated indicator for UNKNOWN).
 *
 * Color palette: uses --severity-* CSS custom properties from globals.css (design tokens).
 * High confidence is green (severity 'low'), moderate is yellow, low is red.
 * Confidence is INVERTED from clinical severity - high confidence is the good outcome.
 *
 * Labels: FLAGGED FOR HANNAH REVIEW (tone) before production use.
 * Desktop and mobile: inline element, renders correctly at any viewport.
 */
export function ConfidenceChip({ confidence, className }: ConfidenceChipProps) {
  const level = numericToConfidenceLevel(confidence);
  const color = confidenceColorVar(level);
  const label = confidenceBodyLabel(level);

  if (level === null || color === null || label === null) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 ${className ?? ''}`}
      aria-label={`Measurement confidence: ${label}`}
    >
      <Circle
        size={7}
        strokeWidth={1.5}
        style={{ color, fill: color }}
        aria-hidden="true"
      />
      <span className="text-[10px] text-white/55">{label}</span>
    </span>
  );
}
