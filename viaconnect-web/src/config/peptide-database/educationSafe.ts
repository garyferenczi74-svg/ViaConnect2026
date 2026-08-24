/**
 * Prompt 225 quarantine helper: strip dose / cycle / price fields from legacy
 * PeptideProduct objects before any educational surface may touch them.
 * Prefer Collection 14 loaders. This exists only for residual legacy callers.
 */

import type { PeptideProduct } from './categories-1-3';

export type EducationSafePeptide = Omit<
  PeptideProduct,
  'dosingForms' | 'cycleProtocol' | 'priceRange' | 'onsetTimeline'
> & {
  dosingForms: [];
  cycleProtocol: '';
  priceRange: '';
  onsetTimeline: '';
};

export function toEducationSafePeptide(p: PeptideProduct): EducationSafePeptide {
  return {
    ...p,
    dosingForms: [],
    cycleProtocol: '',
    priceRange: '',
    onsetTimeline: '',
    practitionerNotes: undefined,
  };
}
