// Prompt #157k: Body region hover/peek/pin card system shared types.
// Region IDs match the snake_case keys used by the data layer
// (BODY_PARTS in composition/page.tsx, useFatChangeData /
// useMuscleChangeData hooks, mask filenames at public/body-tracker/
// masks/*/<region>.png), keeping a single canonical vocabulary across
// the heat map masks (#157), the score-card content, and this hover
// system.

export type Sex = 'male' | 'female';

export type ViewMode = 'composition' | 'muscle';

export type Classification = 'Low' | 'Standard' | 'Good' | 'High';

export type Trend = 'up' | 'down' | 'flat';

export type BodyRegionId =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'l_bicep'
  | 'r_bicep'
  | 'l_forearm'
  | 'r_forearm'
  | 'hip'
  | 'waist'
  | 'l_quad'
  | 'r_quad'
  | 'l_calf'
  | 'r_calf';

export type CardVariant = 'peek' | 'pinned';

export type CardPlacement = 'left' | 'right' | 'above' | 'below';

export interface BodyRegionData {
  readonly id: BodyRegionId;
  readonly label: string;
  readonly metric: { readonly value: number; readonly unit: '%' | 'lbs' };
  readonly classification: Classification;
  readonly trend?: Trend;
}

export interface RegionCentroid {
  readonly xPct: number;
  readonly yPct: number;
}

export interface RegionHitRect {
  readonly xPct: number;
  readonly yPct: number;
  readonly widthPct: number;
  readonly heightPct: number;
}

export interface CardPosition {
  readonly x: number;
  readonly y: number;
  readonly placement: CardPlacement;
  readonly leaderEnd: { readonly x: number; readonly y: number };
}

export interface OccupiedZone {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ContainerBounds {
  readonly width: number;
  readonly height: number;
}

export type TriggerSource = 'figure' | 'legend' | 'keyboard';
