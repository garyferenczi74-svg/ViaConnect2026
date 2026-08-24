'use client';

import { MeasurementCard } from './MeasurementCard';
import {
  BODY_REGIONS,
  MEASUREMENT_LABELS,
  type CircumferenceConfidence,
  type CircumferenceMeasurements,
  type MeasurementUnit,
} from '@/lib/body-tracker/circumference';

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
}

export function MeasurementsGrid({ data, previous, unit, confidence }: MeasurementsGridProps) {
  return (
    <div>
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
