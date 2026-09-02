import { describe, expect, it } from 'vitest';
import { emptyMeasurements } from '@/lib/body-tracker/circumference';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import { shouldHoldScrubMorph } from '../shouldHoldScrubMorph';

const templateScrub = scanToParamVector({
  snapshot: null,
  circumferences: null,
  sex: 'male',
  unit: 'in',
});

const girthScrub = scanToParamVector({
  snapshot: null,
  circumferences: { ...emptyMeasurements(), waist: 40 },
  sex: 'male',
  unit: 'in',
});

const overlayCircs = { ...emptyMeasurements(), waist: 41, hip: 42 };

describe('shouldHoldScrubMorph', () => {
  it('does not hold when scrub is null (rest / play-end)', () => {
    expect(shouldHoldScrubMorph(null, overlayCircs)).toBe(false);
  });

  it('does not let a null-girth template scrub block finite overlay girths', () => {
    expect(shouldHoldScrubMorph(templateScrub, overlayCircs)).toBe(false);
  });

  it('holds when the scrub itself has finite girths', () => {
    expect(shouldHoldScrubMorph(girthScrub, overlayCircs)).toBe(true);
  });

  it('holds a template scrub only when there are no circumferences to apply', () => {
    expect(shouldHoldScrubMorph(templateScrub, emptyMeasurements())).toBe(true);
    expect(shouldHoldScrubMorph(templateScrub, null)).toBe(true);
  });
});
