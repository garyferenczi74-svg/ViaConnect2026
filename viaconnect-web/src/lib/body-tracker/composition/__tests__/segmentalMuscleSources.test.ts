import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { filterSubmitDetails } from '@/components/body-tracker/manual-input/submitEntry';
import {
  MUSCLE_BREAKDOWN_TITLE,
  canWriteSegmentalMuscleLbs,
  formatCompositionProvenanceChip,
  formatSegmentalMuscleProvenanceChip,
  isScaleSourceId,
  showMuscleSegmentalBreakdownTitle,
} from '../segmentalMuscleSources';
import { buildMetricCards } from '../metricCards';
import type { CompositionSnapshot } from '../types';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const muscleDetail = {
  table: 'body_tracker_segmental_muscle' as const,
  row: { right_arm_lbs: 8, total_muscle_mass_lbs: 70 },
};
const fatDetail = {
  table: 'body_tracker_segmental_fat' as const,
  row: { total_body_fat_pct: 22 },
};

describe('segmental muscle lbs — Manual / DEXA / InBody only', () => {
  it('allows Manual, DEXA, and InBody and blocks bathroom scale', () => {
    expect(canWriteSegmentalMuscleLbs('dexa')).toBe(true);
    expect(canWriteSegmentalMuscleLbs('inbody')).toBe(true);
    expect(canWriteSegmentalMuscleLbs('other')).toBe(true);
    expect(canWriteSegmentalMuscleLbs('bathroom_scale')).toBe(false);
    expect(canWriteSegmentalMuscleLbs('smart_scale')).toBe(false);
    expect(isScaleSourceId('bathroom_scale')).toBe(true);
  });

  it('submitEntry drops segmental_muscle for scale sources and keeps fat', () => {
    const scale = filterSubmitDetails([muscleDetail, fatDetail], 'bathroom_scale');
    expect(scale).toEqual([fatDetail]);
    const dexa = filterSubmitDetails([muscleDetail, fatDetail], 'dexa');
    expect(dexa).toEqual([muscleDetail, fatDetail]);
  });

  it('provenance chips label Manual / DEXA / InBody', () => {
    expect(formatSegmentalMuscleProvenanceChip('dexa')).toBe('DEXA');
    expect(formatSegmentalMuscleProvenanceChip('inbody')).toBe('InBody');
    expect(formatSegmentalMuscleProvenanceChip('other')).toBe('Manual');
    expect(formatSegmentalMuscleProvenanceChip('bathroom_scale')).toBeNull();
    expect(formatCompositionProvenanceChip('dexa')).toBe('DEXA');
  });

  it('shows segmental breakdown title only when allowed source has muscle lbs', () => {
    expect(
      showMuscleSegmentalBreakdownTitle({ manualSourceId: 'dexa', hasMuscleLbs: true }),
    ).toBe(true);
    expect(
      showMuscleSegmentalBreakdownTitle({ manualSourceId: 'bathroom_scale', hasMuscleLbs: true }),
    ).toBe(false);
    expect(
      showMuscleSegmentalBreakdownTitle({ manualSourceId: 'dexa', hasMuscleLbs: false }),
    ).toBe(false);
    expect(MUSCLE_BREAKDOWN_TITLE).toMatch(/Segmental muscle mass breakdown/);
  });

  it('metric cards carry a provenance chip for C writes', () => {
    const snap: CompositionSnapshot = {
      entryId: 'e1',
      source: 'manual',
      recordedAt: '2026-09-06T00:00:00Z',
      totalBodyFatPct: 21.3,
      regionFatPct: { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null },
      visceralFatRating: null,
      bodyWaterPct: null,
      regionMuscleLbs: { right_arm: 8, left_arm: 8, trunk: 40, right_leg: 16, left_leg: 16 },
      totalMuscleMassLbs: 88,
      skeletalMuscleMassLbs: null,
      manualSourceId: 'inbody',
    };
    const cards = buildMetricCards(snap, null);
    expect(cards.every((c) => c.provenance === 'InBody')).toBe(true);
  });

  it('BodyCompositionForm and submitEntry stay the only muscle write path', () => {
    const form = src('src/components/body-tracker/BodyCompositionForm.tsx');
    const submit = src('src/components/body-tracker/manual-input/submitEntry.ts');
    const composition = src('src/app/(app)/(consumer)/body-tracker/composition/page.tsx');
    expect(form).toMatch(/canWriteSegmentalMuscleLbs/);
    expect(form).toMatch(/body-comp-form-provenance/);
    expect(form).not.toMatch(/createElement\(\s*['"]form['"]/);
    expect(submit).toMatch(/filterSubmitDetails/);
    expect(submit).toMatch(/canWriteSegmentalMuscleLbs/);
    expect(composition).toMatch(/BodyCompositionForm/);
    expect(composition).toMatch(/muscle-analysis-provenance-chip/);
    expect(composition).toMatch(/body-comp-provenance-chip/);
    expect(composition).toMatch(/HYBRID_COSETTLE_COPY/);
  });
});
