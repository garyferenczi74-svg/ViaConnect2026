// Prompt #85n: heat-map color logic shared by the body-tracker avatar
// indicators, the 12 callout cards, and (legacy) the heatmap fill.
//
// The hooks always report `direction` relative to the raw numeric sign of
// the change (gain when current > previous, loss when current < previous).
// The fat / muscle inversion lives here so the avatar indicators, the
// callout badges, and the callout trend text all stay in sync. A "gain"
// of fat is bad; a "gain" of muscle is good.
//
// Changes whose magnitude is below CHANGE_THRESHOLD are folded into the
// "neutral" direction. Missing previous data is also "neutral" (yellow).

export type ChangeDirection = 'gain' | 'loss' | 'neutral';
export type Metric = 'fat' | 'muscle';

// Prompt #85n v3: the avatar dropped its full-body color wash in favor
// of 12 oval status indicators. The oval color is one of three buckets;
// the same buckets recolor the callout-card status badges so the badge
// on the card matches the oval on the avatar pixel-for-pixel.
export type OvalColor = 'green' | 'yellow' | 'red';

export const OVAL_HEX: Record<OvalColor, string> = {
  green:  '#22C55E',
  yellow: '#FACC15',
  red:    '#EF4444',
};

export interface RegionChange {
  current: number | null;
  previous: number | null;
  change: number | null;
  direction: ChangeDirection;
}

export type RegionChangeData = Record<string, RegionChange>;

const HEATMAP_FILL = {
  good:    'rgba(45, 200, 120, 0.35)',
  neutral: 'rgba(255, 200, 50, 0.30)',
  bad:     'rgba(220, 50, 50, 0.35)',
} as const;

export const CHANGE_THRESHOLD = 0.2;

export function getChangeDirection(change: number | null): ChangeDirection {
  if (change === null) return 'neutral';
  if (Math.abs(change) < CHANGE_THRESHOLD) return 'neutral';
  return change > 0 ? 'gain' : 'loss';
}

type Tone = 'good' | 'neutral' | 'bad';

function classifyForMetric(direction: ChangeDirection, metric: Metric): Tone {
  if (direction === 'neutral') return 'neutral';
  if (metric === 'fat') {
    return direction === 'gain' ? 'bad' : 'good';
  }
  return direction === 'gain' ? 'good' : 'bad';
}

export function getRegionFill(
  regionId: string,
  changeData: RegionChangeData,
  metric: Metric,
): string {
  const data = changeData[regionId];
  const direction = data?.direction ?? 'neutral';
  return HEATMAP_FILL[classifyForMetric(direction, metric)];
}

export function getCalloutToneClass(direction: ChangeDirection, metric: Metric): string {
  const tone = classifyForMetric(direction, metric);
  if (tone === 'good') return 'text-green-400';
  if (tone === 'bad') return 'text-red-400';
  return 'text-yellow-400/80';
}

// Prompt #85n v3: convert a region's raw change value into the green /
// yellow / red bucket used by both the avatar oval indicators and the
// callout-card status badges. Routes through classifyForMetric so the
// fat / muscle inversion (gain bad for fat, gain good for muscle) stays
// consistent with the heat-fill and the trend-text helpers above.
export function getOvalColorFromChange(
  change: number | null,
  metric: Metric,
): OvalColor {
  const tone = classifyForMetric(getChangeDirection(change), metric);
  if (tone === 'good') return 'green';
  if (tone === 'bad') return 'red';
  return 'yellow';
}

// Prompt #85n v3: convert the body-fat callout's static SegmentStatus
// label (Very Low / Low / Standard / High / Very High) into the same
// green / yellow / red bucket. Used for body-fat section ovals + fat
// callout badges where the absolute fat percentile is what matters,
// not the week-over-week change. Less fat is the green direction.
type BadgeStatus = 'Very Low' | 'Low' | 'Standard' | 'High' | 'Very High';

export function getOvalColorFromStatus(status: BadgeStatus): OvalColor {
  if (status === 'Very Low' || status === 'Low') return 'green';
  if (status === 'High' || status === 'Very High') return 'red';
  return 'yellow';
}
