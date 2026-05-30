// Shared controller type for the "Hide specific numbers" mode (Prompt #169b,
// spec section 3.2.4). This is the subset of useNumbersOptional's API that the
// results SURFACES (CompositionBreakdownCard, MeasurementGrid, avatar labels)
// consume. Passing it as a prop keeps those surfaces decoupled from the hook and
// lets a single useNumbersOptional instance in ScanResultsPanel drive all of
// them with one shared flag + one shared reveal state.

import type { MetricDisplayMode, MetricSurface } from '@/lib/body-tracker/numbers-optional';

export interface NumbersOptionalController {
  numbersOptional: boolean;
  isRevealed: (metricId: string) => boolean;
  toggleReveal: (metricId: string) => void;
  revealHold: (metricId: string) => void;
  hideHold: (metricId: string) => void;
  displayMode: (metricId: string, surface: MetricSurface) => MetricDisplayMode;
}
