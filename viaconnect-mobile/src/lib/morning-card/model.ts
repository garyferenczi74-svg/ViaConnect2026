export const MARKETING_CHIP_KEYS = [
  'recovery',
  'sleep',
  'strain',
  'regimen',
  'nutrients',
  'symptoms',
  'metabolic',
  'immune',
] as const;

export type MarketingChipKey = (typeof MARKETING_CHIP_KEYS)[number];

export const MARKETING_CHIP_LABELS: Record<MarketingChipKey, string> = {
  recovery: 'Recovery',
  sleep: 'Sleep',
  strain: 'Strain',
  regimen: 'Regimen',
  nutrients: 'Nutrients',
  symptoms: 'Symptoms',
  metabolic: 'Metabolic',
  immune: 'Immune',
};

export type MorningSourceStatus = 'pending' | 'named' | 'disagree';

export const MORNING_CARD_SCORE_LABEL = 'Bio Optimization Score';
export const MORNING_CARD_PENDING_SCORE = '--';
export const MORNING_CTA_EMPTY = 'Complete your assessment';
export const MORNING_CTA_COMPLETE = "Today's protocol is complete";
export const MORNING_CONTRIBUTOR_PENDING_NOTE =
  'Sources pending until wearable sync is confirmed.';
export const MORNING_CONTRIBUTOR_PENDING_VALUE = 'Pending';
export const MORNING_CONTRIBUTOR_DISAGREE = 'DISAGREE';

export function morningCtaTakeLabel(name: string): string {
  return `Take ${name}`;
}

export function sourceStatusUntilBrief12(): MorningSourceStatus {
  return 'pending';
}

export function classifySourceStatus(args: {
  hasNamedSource: boolean;
  devicesDisagree: boolean;
}): MorningSourceStatus {
  if (!args.hasNamedSource) return 'pending';
  if (args.devicesDisagree) return 'disagree';
  return 'named';
}

export interface MorningContributor {
  id: string;
  name: string;
  sourceStatus: MorningSourceStatus;
  displayValue: string;
}

export interface MorningChipView {
  key: MarketingChipKey;
  label: string;
  sourceStatus: MorningSourceStatus;
  contributors: MorningContributor[];
}

const CATALOG: Record<MarketingChipKey, readonly { id: string; name: string }[]> = {
  recovery: [
    { id: 'whoop', name: 'Whoop' },
    { id: 'oura', name: 'Oura' },
  ],
  sleep: [
    { id: 'whoop', name: 'Whoop' },
    { id: 'oura', name: 'Oura' },
    { id: 'apple_health', name: 'Apple Health' },
  ],
  strain: [{ id: 'whoop', name: 'Whoop' }],
  regimen: [{ id: 'protocol', name: 'Protocol' }],
  nutrients: [{ id: 'nutrition_log', name: 'Nutrition log' }],
  symptoms: [{ id: 'daily_checkin', name: 'Daily check-in' }],
  metabolic: [
    { id: 'hume', name: 'Hume' },
    { id: 'apple_health', name: 'Apple Health' },
  ],
  immune: [{ id: 'labs', name: 'Labs' }],
};

export function buildMorningChips(): MorningChipView[] {
  return MARKETING_CHIP_KEYS.map((key) => ({
    key,
    label: MARKETING_CHIP_LABELS[key],
    sourceStatus: sourceStatusUntilBrief12(),
    contributors: CATALOG[key].map((c) => ({
      id: c.id,
      name: c.name,
      sourceStatus: sourceStatusUntilBrief12(),
      displayValue: MORNING_CONTRIBUTOR_PENDING_VALUE,
    })),
  }));
}

export function chipByKey(
  chips: readonly MorningChipView[],
  key: MarketingChipKey,
): MorningChipView | null {
  return chips.find((c) => c.key === key) ?? null;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface MorningProtocolItem {
  slotId: string;
  name: string;
  dose: string | null;
  timeOfDay: TimeOfDay;
  taken: boolean;
}

export type MorningProtocolCtaKind = 'action' | 'complete' | 'empty';

export interface MorningProtocolCta {
  kind: MorningProtocolCtaKind;
  label: string;
  item: MorningProtocolItem | null;
}

export function firstIncompleteProtocolAction(
  items: readonly MorningProtocolItem[],
): MorningProtocolCta {
  if (items.length === 0) {
    return { kind: 'empty', label: MORNING_CTA_EMPTY, item: null };
  }
  const next = items.find((item) => item.taken === false) ?? null;
  if (!next) {
    return { kind: 'complete', label: MORNING_CTA_COMPLETE, item: null };
  }
  return { kind: 'action', label: morningCtaTakeLabel(next.name), item: next };
}

export interface BosCurrentPayload {
  score: number | null;
}

export const BOS_CURRENT_PATH = '/api/bos/current';

export function bosCurrentUrl(webOrigin?: string): string {
  const origin = (webOrigin ?? '').replace(/\/$/, '');
  return `${origin}${BOS_CURRENT_PATH}`;
}

export function readBosCurrentScore(payload: unknown): number | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const score = (payload as BosCurrentPayload).score;
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  return score;
}

export function colorForScore(score: number): string {
  if (score >= 91) return '#A855F7';
  if (score >= 76) return '#22C55E';
  if (score >= 51) return '#2DA5A0';
  if (score >= 26) return '#F59E0B';
  return '#EF4444';
}
