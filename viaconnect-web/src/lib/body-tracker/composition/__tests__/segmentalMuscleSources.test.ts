import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { filterSubmitDetails } from '@/components/body-tracker/manual-input/submitEntry';
import { DATA_SOURCES, getDataSource } from '@/lib/body-tracker/manual-input';
import {
  MUSCLE_BREAKDOWN_TITLE,
  SEGMENTAL_MUSCLE_SOURCE_MANUAL,
  canWriteSegmentalMuscleLbs,
  formatCompositionProvenanceChip,
  formatMuscleSectionProvenanceChip,
  formatSegmentalMuscleProvenanceChip,
  isScaleSourceId,
  isSegmentalMuscleSourceId,
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
  it('uses a clear Manual source id, not opaque other', () => {
    expect(SEGMENTAL_MUSCLE_SOURCE_MANUAL).toBe('manual');
    expect(isSegmentalMuscleSourceId('manual')).toBe(true);
    expect(isSegmentalMuscleSourceId('other')).toBe(false);
    const manual = getDataSource('manual');
    expect(manual?.label).toBe('Manual');
    expect(manual?.group).toBe('manual');
    expect(manual?.tier).toBe('manual');
    expect(manual?.providesSegmental).toBe(true);
    expect(manual?.confidence).toBeGreaterThanOrEqual(0.7);
    expect(manual?.confidence).toBeLessThanOrEqual(0.85);
    const other = getDataSource('other');
    expect(other?.label).toBe('Other / Estimate');
    expect(other?.providesSegmental).toBe(false);
    expect(DATA_SOURCES.filter((s) => s.id === 'other')).toHaveLength(1);
  });

  it('allows Manual, DEXA, and InBody and blocks scale plus other', () => {
    expect(canWriteSegmentalMuscleLbs('dexa')).toBe(true);
    expect(canWriteSegmentalMuscleLbs('inbody')).toBe(true);
    expect(canWriteSegmentalMuscleLbs('manual')).toBe(true);
    expect(canWriteSegmentalMuscleLbs('other')).toBe(false);
    expect(canWriteSegmentalMuscleLbs('bathroom_scale')).toBe(false);
    expect(canWriteSegmentalMuscleLbs('smart_scale')).toBe(false);
    expect(isScaleSourceId('bathroom_scale')).toBe(true);
  });

  it('submitEntry drops segmental_muscle for scale and other, keeps Manual / DEXA', () => {
    const scale = filterSubmitDetails([muscleDetail, fatDetail], 'bathroom_scale');
    expect(scale).toEqual([fatDetail]);
    const other = filterSubmitDetails([muscleDetail, fatDetail], 'other');
    expect(other).toEqual([fatDetail]);
    const dexa = filterSubmitDetails([muscleDetail, fatDetail], 'dexa');
    expect(dexa).toEqual([muscleDetail, fatDetail]);
    const manual = filterSubmitDetails([muscleDetail, fatDetail], 'manual');
    expect(manual).toEqual([muscleDetail, fatDetail]);
  });

  it('provenance chips label Manual / DEXA / InBody, with legacy other → Manual on muscle reads', () => {
    expect(formatSegmentalMuscleProvenanceChip('dexa')).toBe('DEXA');
    expect(formatSegmentalMuscleProvenanceChip('inbody')).toBe('InBody');
    expect(formatSegmentalMuscleProvenanceChip('manual')).toBe('Manual');
    expect(formatSegmentalMuscleProvenanceChip('other')).toBe('Manual');
    expect(formatSegmentalMuscleProvenanceChip('bathroom_scale')).toBeNull();
    expect(formatCompositionProvenanceChip('dexa')).toBe('DEXA');
    expect(formatCompositionProvenanceChip('manual')).toBe('Manual');
    expect(formatCompositionProvenanceChip('other')).toBe('Other / Estimate');
    expect(formatMuscleSectionProvenanceChip('other', true)).toBe('Manual');
    expect(formatMuscleSectionProvenanceChip('other', false)).toBe('Other / Estimate');
    expect(formatMuscleSectionProvenanceChip('manual', true)).toBe('Manual');
  });

  it('shows segmental breakdown title only when allowed source has muscle lbs', () => {
    expect(
      showMuscleSegmentalBreakdownTitle({ manualSourceId: 'dexa', hasMuscleLbs: true }),
    ).toBe(true);
    expect(
      showMuscleSegmentalBreakdownTitle({ manualSourceId: 'manual', hasMuscleLbs: true }),
    ).toBe(true);
    expect(
      showMuscleSegmentalBreakdownTitle({ manualSourceId: 'other', hasMuscleLbs: true }),
    ).toBe(true);
    expect(
      showMuscleSegmentalBreakdownTitle({ manualSourceId: 'other', hasMuscleLbs: false }),
    ).toBe(false);
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
    expect(form).toMatch(/prefillTotalBodyFat !== null \? 'manual' : null/);
    expect(form).not.toMatch(/prefillTotalBodyFat !== null \? 'other' : null/);
    expect(form).not.toMatch(/createElement\(\s*['"]form['"]/);
    expect(submit).toMatch(/filterSubmitDetails/);
    expect(submit).toMatch(/canWriteSegmentalMuscleLbs/);
    expect(composition).toMatch(/BodyCompositionForm/);
    expect(composition).toMatch(/muscle-analysis-provenance-chip/);
    expect(composition).toMatch(/formatMuscleSectionProvenanceChip/);
    expect(composition).toMatch(/body-comp-provenance-chip/);
    expect(composition).toMatch(/HYBRID_COSETTLE_COPY/);
  });
});
