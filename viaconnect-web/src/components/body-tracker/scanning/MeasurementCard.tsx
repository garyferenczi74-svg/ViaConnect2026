'use client';

import { Circle } from 'lucide-react';
import type { ConfidenceLevel, MeasuredValue } from '@/lib/arnold/scanning/types';
import { confidenceColorVar, confidenceBodyLabel } from '@/lib/arnold/scanning/accuracy/confidenceDisplay';

interface MeasurementCardProps {
  label: string;
  measured: MeasuredValue;
  unitSystem: 'imperial' | 'metric';
}

// Color via design tokens (--severity-* CSS custom properties from globals.css).
// Confidence is INVERTED from clinical severity: high confidence is green (severity 'low').
// confidenceColorVar() is the single source; no inline hex.
function confidenceColor(level: ConfidenceLevel): string {
  return confidenceColorVar(level) ?? 'rgb(var(--severity-high))';
}

// Body-positive labels per Section 9 / RULE 9 framing.
// 'Estimated' is used for low-confidence present measurements (not "low confidence").
// FLAGGED FOR HANNAH REVIEW (tone) before production use.
function confidenceDisplayLabel(level: ConfidenceLevel, calibrated: boolean): string {
  const base = confidenceBodyLabel(level) ?? 'Estimated';
  return calibrated ? `${base}, calibrated` : base;
}

const CALIBRATED_SOURCES = ['tape_calibrated', 'inbody_calibrated', 'dexa_calibrated'];

export function MeasurementCard({ label, measured, unitSystem }: MeasurementCardProps) {
  const isImperial = unitSystem === 'imperial';
  // cm is null when the measurement is UNKNOWN (RULE 9). Treat null and any
  // non-positive value as "not measured" rather than fabricating a number.
  const cm = measured.cm;
  const value = cm !== null && cm > 0 ? (isImperial ? cm / 2.54 : cm) : null;
  const known = value !== null;
  const uncertainty = isImperial ? measured.uncertaintyCm / 2.54 : measured.uncertaintyCm;
  const unit = isImperial ? 'in' : 'cm';

  const calibrated = CALIBRATED_SOURCES.includes(measured.source);
  const badgeColor = confidenceColor(measured.confidence);
  const displayLabel = confidenceDisplayLabel(measured.confidence, calibrated);
  const sourceLabel = sourceToLabel(measured.source);

  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] text-white/50 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-1 mt-0.5">
        {known && value !== null ? (
          <>
            <p className="text-sm font-semibold text-white">{value.toFixed(1)}</p>
            <p className="text-[10px] text-white/45">{unit}</p>
            {uncertainty > 0 && (
              <p className="text-[10px] text-white/40">+/- {uncertainty.toFixed(1)}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-white/40">not measured</p>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <Circle className="h-2 w-2" strokeWidth={1.5} style={{ color: badgeColor, fill: badgeColor }} />
        <span className="text-[10px] text-white/55">
          {displayLabel}
          {sourceLabel ? `, ${sourceLabel}` : ''}
        </span>
      </div>
    </div>
  );
}

function sourceToLabel(source: string): string {
  switch (source) {
    case 'ellipse_frontSide': return 'front + side';
    case 'ellipse_frontOnly': return 'front only';
    case 'geometric_front':   return 'geometric';
    case 'tape_calibrated':   return 'tape measure';
    case 'missing':           return '';
    case 'invalid_input':     return 'bad input';
    default:                  return source;
  }
}
