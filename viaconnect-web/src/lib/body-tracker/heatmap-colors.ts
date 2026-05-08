// Prompt #85n: heat-map color logic shared by the avatar SVG overlay and
// the 12 body-part callout cards.
//
// The hooks always report `direction` relative to the raw numeric sign of
// the change (gain when current > previous, loss when current < previous).
// The fat / muscle inversion lives here so both the SVG fill and the
// callout text color stay in sync. A "gain" of fat is bad; a "gain" of
// muscle is good.
//
// Changes whose magnitude is below CHANGE_THRESHOLD are folded into the
// "neutral" direction. Missing previous data is also "neutral" (yellow).

export type ChangeDirection = 'gain' | 'loss' | 'neutral';
export type Metric = 'fat' | 'muscle';

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

// Prompt #85n fix: zone-level fill for the masked-avatar overlay. Each
// avatar zone groups several physical regions at the same vertical level
// (e.g. chest + both biceps fall in the upper-body band). The fill averages
// the raw change values across the zone's regions, drops null/missing
// entries, and routes through the same fat/muscle inversion as
// getRegionFill so the colors stay consistent with the callout cards.
export function getZoneFill(
  regionIds: readonly string[],
  changeData: RegionChangeData,
  metric: Metric,
): string {
  const changes = regionIds
    .map((id) => changeData[id]?.change)
    .filter((v): v is number => v !== null && v !== undefined);
  if (changes.length === 0) {
    return HEATMAP_FILL[classifyForMetric('neutral', metric)];
  }
  const avg = changes.reduce((a, b) => a + b, 0) / changes.length;
  return HEATMAP_FILL[classifyForMetric(getChangeDirection(avg), metric)];
}

export function getCalloutToneClass(direction: ChangeDirection, metric: Metric): string {
  const tone = classifyForMetric(direction, metric);
  if (tone === 'good') return 'text-green-400';
  if (tone === 'bad') return 'text-red-400';
  return 'text-yellow-400/80';
}
