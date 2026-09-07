// Source lock: CAQ completion and Lifestyle save must POST the sole
// nutrition_targets writer. 422 estimate_unavailable must not invent
// macros or block CAQ.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

function src(rel: string): string {
  return readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

describe('completeCAQAndTriggerEngines nutrition_targets', () => {
  const source = src('src/lib/caq/complete-caq.ts');

  it('POSTs /api/nutrition/generate-targets', () => {
    expect(source).toContain('"/api/nutrition/generate-targets"');
    expect(source).toContain('results["nutrition_targets"]');
  });

  it('treats 422 as estimate_unavailable without inventing macros', () => {
    expect(source).toContain('res.status === 422');
    expect(source).toContain('estimate_unavailable');
    expect(source).not.toContain('generateMacroTargets');
    expect(source).not.toMatch(/daily_kcal:\s*\d+/);
  });
});

describe('completeCAQAndTriggerEngines clinical height write-through', () => {
  const source = src('src/lib/caq/complete-caq.ts');
  const onboarding = src('src/app/(auth)/onboarding/[step]/page.tsx');

  it('upserts clinical_assessments from CAQ demographics without inventing 170', () => {
    expect(source).toContain('writeThroughCaqDemographicsToClinical');
    expect(source).toContain('backfillClinicalHeightIfMissing');
    expect(source).toContain('backfillClinicalWeightIfMissing');
    expect(source).not.toMatch(/height_cm:\s*170/);
    expect(source).not.toMatch(/weight_kg:\s*70/);
    expect(onboarding).toContain('writeThroughCaqDemographicsToClinical');
    expect(onboarding).not.toMatch(/height_cm:\s*170/);
  });
});

describe('CAQ Lifestyle save triggers generate-targets', () => {
  const source = src('src/app/(auth)/onboarding/[step]/page.tsx');

  it('EXERCISE_FREQ matches the mapped labels', () => {
    expect(source).toContain(
      'const EXERCISE_FREQ = ["Never", "1-2x/week", "3-4x/week", "5-6x/week", "Daily"]',
    );
  });

  it('POSTs generate-targets after phase 3 persist', () => {
    expect(source).toContain('void fetch("/api/nutrition/generate-targets"');
    expect(source).toContain('completeCAQAndTriggerEngines');
  });
});
