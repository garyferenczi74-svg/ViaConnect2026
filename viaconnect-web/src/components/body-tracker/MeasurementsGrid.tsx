'use client';

import { Ruler } from 'lucide-react';
import { MeasurementCard } from './MeasurementCard';
import {
  allCircumferenceCardsEmpty,
  BODY_REGIONS,
  MEASUREMENT_LABELS,
  type CircumferenceConfidence,
  type CircumferenceMeasurements,
  type MeasurementUnit,
} from '@/lib/body-tracker/circumference';
import {
  LOG_MEASUREMENTS_CTA,
  MEASUREMENTS_EMPTY_COPY,
} from '@/lib/body-tracker/composition/circWriteContract';

interface MeasurementsGridProps {
  data: CircumferenceMeasurements | null;
  previous: CircumferenceMeasurements | null;
  unit: MeasurementUnit;
  /**
   * Per-measurement confidence scores (0-1) from the latest scan entry.
   * Passed through to each MeasurementCard to render a ConfidenceChip.
   * null or omitted = no confidence indicators (manual entries, pre-Task-10 scans).
   */
  confidence?: CircumferenceConfidence | null;
  onLogMeasurements?: () => void;
}

export function MeasurementsGrid({
  data,
  previous,
  unit,
  confidence,
  onLogMeasurements,
}: MeasurementsGridProps) {
  const empty = allCircumferenceCardsEmpty(data);
  return (
    <div>
      {empty && onLogMeasurements ? (
        <div
          data-testid="measurements-empty-cta"
          className="mb-5 flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-2">
            <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden />
            <p className="text-sm text-white/70">{MEASUREMENTS_EMPTY_COPY}</p>
          </div>
          <button
            type="button"
            data-testid="measurements-log-cta"
            onClick={onLogMeasurements}
            className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center rounded-xl border border-[#2DA5A0]/50 bg-[#2DA5A0]/15 px-4 py-2.5 text-sm font-medium text-[#2DA5A0] sm:w-auto"
          >
            {LOG_MEASUREMENTS_CTA}
          </button>
        </div>
      ) : null}
      {BODY_REGIONS.map((region, regionIdx) => (
        <section key={region.id} className={regionIdx === 0 ? '' : 'mt-6'}>
          <h4 className="mb-3 border-b border-white/[0.05] pb-1 text-xs uppercase tracking-widest text-white/30">
            {region.label}
          </h4>
          <div className={`grid gap-3 grid-cols-1 ${region.cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {region.measurements.map((key) => (
              <MeasurementCard
                key={key}
                label={MEASUREMENT_LABELS[key]}
                value={data?.[key] ?? null}
                previousValue={previous?.[key] ?? null}
                unit={unit}
                confidence={confidence?.[key] ?? null}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
