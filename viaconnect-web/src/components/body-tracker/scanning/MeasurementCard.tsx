'use client';

import { Circle } from 'lucide-react';
import type { ConfidenceLevel, MeasuredValue } from '@/lib/arnold/scanning/types';
import { privacySparklineShape } from '@/lib/body-tracker/numbers-optional';
import { RevealableMetric, Sparkline } from './RevealableMetric';
import type { NumbersOptionalController } from './numbersOptionalController';

interface MeasurementCardProps {
  label: string;
  measured: MeasuredValue;
  unitSystem: 'imperial' | 'metric';
  // Optional "Hide specific numbers" controller (Prompt #169b section 3.2.4).
  numbers?: NumbersOptionalController;
  // Stable metric id used for reveal tracking (defaults to the label).
  metricId?: string;
}

const CONFIDENCE_COLOR: Record<ConfidenceLevel, string> = {
  high:     '#22C55E',
  moderate: '#E8803A',
  low:      '#EF4444',
};

const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  high:     'High',
  moderate: 'Moderate',
  low:      'Low',
};

const CALIBRATED_SOURCES = ['tape_calibrated', 'inbody_calibrated', 'dexa_calibrated'];

export function MeasurementCard({ label, measured, unitSystem, numbers, metricId }: MeasurementCardProps) {
  const isImperial = unitSystem === 'imperial';
  const value = isImperial ? measured.cm / 2.54 : measured.cm;
  const uncertainty = isImperial ? measured.uncertaintyCm / 2.54 : measured.uncertaintyCm;
  const unit = isImperial ? 'in' : 'cm';

  const calibrated = CALIBRATED_SOURCES.includes(measured.source);
  const badgeColor = CONFIDENCE_COLOR[measured.confidence];
  const sourceLabel = sourceToLabel(measured.source);

  const id = metricId ?? label;
  const mode = numbers ? numbers.displayMode(id, 'measurement') : 'value';
  const revealable = !!numbers && numbers.numbersOptional && !numbers.isRevealed(id);

  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] text-white/50 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-1 mt-0.5">
        {measured.cm > 0 ? (
          <RevealableMetric
            mode={mode}
            label={label}
            revealable={revealable}
            numbersOptionalOn={!!numbers && numbers.numbersOptional}
            onToggle={() => numbers?.toggleReveal(id)}
            onHoldStart={() => numbers?.revealHold(id)}
            onHoldEnd={() => numbers?.hideHold(id)}
            value={
              <span className="flex items-baseline gap-1">
                <span className="text-sm font-semibold text-white">{value.toFixed(1)}</span>
                <span className="text-[10px] text-white/45">{unit}</span>
                {uncertainty > 0 && (
                  <span className="text-[10px] text-white/40">+/- {uncertainty.toFixed(1)}</span>
                )}
              </span>
            }
            // Measurements redact to a sparkline SHAPE only (no number). The shape
            // is seeded by the metric id and does not encode the hidden value.
            sparkline={<Sparkline points={privacySparklineShape(id)} color={badgeColor} />}
          />
        ) : (
          <p className="text-sm text-white/40">not measured</p>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <Circle className="h-2 w-2" strokeWidth={1.5} style={{ color: badgeColor, fill: badgeColor }} />
        <span className="text-[10px] text-white/55">
          {CONFIDENCE_LABEL[measured.confidence]}
          {calibrated ? ', calibrated' : ''}
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
