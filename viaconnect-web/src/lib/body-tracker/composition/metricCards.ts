// Pure builder: CompositionSnapshot + bmi -> four MetricCardData entries.
// UNKNOWN (null) renders value 'No data' and status 'Unknown' - never '0' or '0%'.

import type { MetricStatus } from '@/components/body-tracker/FloatingMetricCard';
import {
  formatPhotoSourcedBfChip,
  photoSourcedBfStatusValue,
} from '@/lib/formavision/twoProtocolCopy';
import { formatCompositionProvenanceChip } from './segmentalMuscleSources';
import type { CompositionSnapshot } from './types';

export type MetricCardData = {
  label: string;
  value: string;
  status: MetricStatus | 'Unknown';
  trend?: 'up' | 'down' | 'stable';
  provenance?: string | null;
};

function bmiStatus(bmi: number): MetricStatus {
  if (bmi < 18.5) return 'Low';
  if (bmi < 25) return 'Good';
  if (bmi < 30) return 'High';
  return 'High';
}

function bodyFatStatus(pct: number): MetricStatus {
  // Approximate ranges (unisex fallback; clinical context not available here)
  if (pct < 6) return 'Low';
  if (pct < 24) return 'Good';
  if (pct < 32) return 'Standard';
  return 'High';
}

function visceralStatus(rating: number): MetricStatus {
  if (rating <= 9) return 'Good';
  if (rating <= 14) return 'Standard';
  return 'High';
}

function bodyWaterStatus(pct: number): MetricStatus {
  if (pct >= 45 && pct <= 65) return 'Good';
  if (pct >= 40) return 'Standard';
  return 'Low';
}

const NO_DATA = 'No data';

export function buildMetricCards(
  snap: CompositionSnapshot | null,
  bmi: number | null
): MetricCardData[] {
  const totalFatPct = snap?.totalBodyFatPct ?? null;
  const visceralFatRating = snap?.visceralFatRating ?? null;
  const bodyWaterPct = snap?.bodyWaterPct ?? null;
  const photoChip = snap ? formatPhotoSourcedBfChip(snap) : null;
  const photoStatusValue = snap ? photoSourcedBfStatusValue(snap) : null;
  const provenance = snap ? formatCompositionProvenanceChip(snap.manualSourceId) : null;

  const fatCard: MetricCardData = photoChip
    ? {
        label: 'Total Body Fat',
        value: photoChip,
        status: photoStatusValue !== null ? bodyFatStatus(photoStatusValue) : 'Unknown',
      }
    : totalFatPct !== null
      ? {
          label: 'Total Body Fat',
          value: `${totalFatPct}%`,
          status: bodyFatStatus(totalFatPct),
        }
      : { label: 'Total Body Fat', value: NO_DATA, status: 'Unknown' };

  const bmiCard: MetricCardData =
    bmi !== null
      ? { label: 'BMI', value: String(Math.round(bmi * 10) / 10), status: bmiStatus(bmi) }
      : { label: 'BMI', value: NO_DATA, status: 'Unknown' };

  const visceralCard: MetricCardData =
    visceralFatRating !== null
      ? { label: 'Visceral Fat', value: String(visceralFatRating), status: visceralStatus(visceralFatRating) }
      : { label: 'Visceral Fat', value: NO_DATA, status: 'Unknown' };

  const waterCard: MetricCardData =
    bodyWaterPct !== null
      ? { label: 'Body Water', value: `${bodyWaterPct}%`, status: bodyWaterStatus(bodyWaterPct) }
      : { label: 'Body Water', value: NO_DATA, status: 'Unknown' };

  return [fatCard, bmiCard, visceralCard, waterCard].map((card) =>
    provenance ? { ...card, provenance } : card,
  );
}
