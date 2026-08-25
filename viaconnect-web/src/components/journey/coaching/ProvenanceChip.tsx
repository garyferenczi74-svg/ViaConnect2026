/**
 * Brief 32 — small source chip for Analytics coaching numbers.
 * Lucide is not used (text-only). Vocabulary is exact from provenance.ts.
 */

import type { CSSProperties } from 'react';
import type { AnalyticsProvenanceChip } from '@/lib/analytics/provenance';

const CHIP_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  marginLeft: 6,
  padding: '2px 7px',
  borderRadius: 999,
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: 0.2,
  color: '#8DA0C0',
  background: '#16203A',
  border: '1px solid rgba(141,160,192,0.16)',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
};

export function ProvenanceChip({
  chip,
  testId,
}: {
  chip: AnalyticsProvenanceChip;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId ?? 'analytics-provenance-chip'}
      data-provenance={chip}
      style={CHIP_STYLE}
    >
      {chip}
    </span>
  );
}
