/**
 * Brief 66 — glance honesty adapters (Expo).
 * UNKNOWN never 0. Coming soon never feeds BOS. Band appends only when
 * Brief 62 numeric cutoffs exist AND the score is known. native_health_bridge
 * stays off — do not mint last-sync / HRV / RHR from wearable_daily_vitals.
 */

import {
  BOS_BAND_CUTOFFS,
  BOS_BAND_LABELS,
  HANNAH_APP_INTENT_VOICE,
  type BosBandLabel,
} from '../hannah/app-intent-voice';
import { firstIncompleteProtocolAction, morningCtaTakeLabel } from './model';
import type { MorningProtocolItem } from './model';

export { BOS_BAND_CUTOFFS, BOS_BAND_LABELS, type BosBandLabel };

export interface BosBandCutoffs {
  easeUpMax: number;
  steadyMax: number;
  readyMax: number;
}

export interface BosGlance {
  score: number | null;
  band: BosBandLabel | null;
}

export const UNWIRED_COMING_SOON_SOURCE_IDS = [
  'whoop',
  'oura',
  'google_health',
  'garmin',
] as const;

export const WEARABLE_GLANCE_SOURCE_NAMES = {
  whoop: 'Whoop',
  oura: 'Oura',
  google_health: 'Google Health',
  garmin: 'Garmin',
  apple_health: 'Apple Health',
  hume: 'Hume Body Pod',
  clair: 'Clair Health',
} as const;

export type WearableGlanceSourceId = keyof typeof WEARABLE_GLANCE_SOURCE_NAMES;

export function isFiniteKnownScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function bosGlanceFromScore(
  score: number | null,
  cutoffs: BosBandCutoffs | null = BOS_BAND_CUTOFFS,
): BosGlance {
  if (!isFiniteKnownScore(score)) {
    return { score: null, band: null };
  }
  return { score, band: bandFromScore(score, cutoffs) };
}

export function bandFromScore(
  score: number | null,
  cutoffs: BosBandCutoffs | null = BOS_BAND_CUTOFFS,
): BosBandLabel | null {
  if (!isFiniteKnownScore(score) || cutoffs === null) return null;
  if (score <= cutoffs.easeUpMax) return 'Ease up';
  if (score <= cutoffs.steadyMax) return 'Steady';
  if (score <= cutoffs.readyMax) return 'Ready';
  return 'Push';
}

export type BosSpokenVariant = 'score' | 'push_ease';

export function speakBosGlance(args: {
  score: number | null;
  band?: BosBandLabel | null;
  topDriverChip?: string | null;
  variant?: BosSpokenVariant;
}): string {
  const glance = bosGlanceFromScore(args.score);
  const band = args.band === undefined ? glance.band : args.band;
  const variant = args.variant ?? 'score';

  if (glance.score === null) {
    return variant === 'push_ease'
      ? HANNAH_APP_INTENT_VOICE.bosPushEaseUnknown
      : HANNAH_APP_INTENT_VOICE.bosUnknown;
  }

  if (variant === 'push_ease') {
    return band
      ? HANNAH_APP_INTENT_VOICE.bosPushEaseKnownBand(glance.score, band)
      : `Your Bio Optimization Score is ${glance.score}.`;
  }

  const head = band
    ? HANNAH_APP_INTENT_VOICE.bosKnownBand(glance.score, band)
    : HANNAH_APP_INTENT_VOICE.bosKnown(glance.score);
  const chip = typeof args.topDriverChip === 'string' ? args.topDriverChip.trim() : '';
  if (!chip) return head;
  return `${head} ${HANNAH_APP_INTENT_VOICE.bosTopDriver(chip)}`;
}

export type ProtocolNextKind = 'next' | 'complete' | 'empty';

export interface ProtocolNextGlance {
  kind: ProtocolNextKind;
  title: string | null;
  cta: string | null;
  spoken: string;
}

export function protocolNextGlance(
  items: readonly Pick<MorningProtocolItem, 'name' | 'taken'>[],
): ProtocolNextGlance {
  if (items.length === 0) {
    return {
      kind: 'empty',
      title: null,
      cta: null,
      spoken: HANNAH_APP_INTENT_VOICE.protocolEmpty,
    };
  }
  const selected = firstIncompleteProtocolAction(items as readonly MorningProtocolItem[]);
  if (selected.kind === 'complete') {
    return {
      kind: 'complete',
      title: null,
      cta: null,
      spoken: HANNAH_APP_INTENT_VOICE.protocolComplete,
    };
  }
  if (selected.kind === 'empty' || !selected.item) {
    return {
      kind: 'empty',
      title: null,
      cta: null,
      spoken: HANNAH_APP_INTENT_VOICE.protocolEmpty,
    };
  }
  const title = selected.item.name.trim();
  if (!title) {
    return {
      kind: 'empty',
      title: null,
      cta: null,
      spoken: HANNAH_APP_INTENT_VOICE.protocolEmpty,
    };
  }
  if (selected.kind === 'action' && selected.label.trim().length > 0) {
    return {
      kind: 'next',
      title,
      cta: selected.label,
      spoken: HANNAH_APP_INTENT_VOICE.protocolNextCta(title, selected.label),
    };
  }
  const cta = morningCtaTakeLabel(title);
  return {
    kind: 'next',
    title,
    cta,
    spoken: HANNAH_APP_INTENT_VOICE.protocolNextCta(title, cta),
  };
}

export interface WearableLastSyncInput {
  sourceId: string;
  sourceName?: string | null;
  connected: boolean;
  lastSyncedAt: string | null;
  comingSoon?: boolean;
  now?: number;
}

export interface WearableLastSyncGlance {
  source: string;
  kind: 'synced' | 'not_connected' | 'no_sync_yet' | 'coming_soon';
  lastSyncedAt: string | null;
  spoken: string;
}

export function isUnwiredComingSoonSource(sourceId: string): boolean {
  return (UNWIRED_COMING_SOON_SOURCE_IDS as readonly string[]).includes(sourceId);
}

export function wearableDisplayName(sourceId: string, sourceName?: string | null): string {
  if (typeof sourceName === 'string' && sourceName.trim().length > 0) {
    return sourceName.trim();
  }
  if (sourceId in WEARABLE_GLANCE_SOURCE_NAMES) {
    return WEARABLE_GLANCE_SOURCE_NAMES[sourceId as WearableGlanceSourceId];
  }
  return sourceId;
}

function formatSyncedRelative(lastSyncAt: string, now = Date.now()): string | null {
  const then = new Date(lastSyncAt).getTime();
  if (!Number.isFinite(then)) return null;
  const deltaMs = Math.max(0, now - then);
  const minutes = Math.floor(deltaMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(lastSyncAt).toLocaleDateString();
}

export function wearableLastSyncGlance(input: WearableLastSyncInput): WearableLastSyncGlance {
  const source = wearableDisplayName(input.sourceId, input.sourceName);
  const comingSoon = input.comingSoon === true || isUnwiredComingSoonSource(input.sourceId);
  if (comingSoon) {
    return {
      source,
      kind: 'coming_soon',
      lastSyncedAt: null,
      spoken: HANNAH_APP_INTENT_VOICE.lastSyncComingSoon(source),
    };
  }
  if (!input.connected) {
    return {
      source,
      kind: 'not_connected',
      lastSyncedAt: null,
      spoken: HANNAH_APP_INTENT_VOICE.lastSyncNotConnected(source),
    };
  }
  const raw = input.lastSyncedAt;
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return {
      source,
      kind: 'no_sync_yet',
      lastSyncedAt: null,
      spoken: HANNAH_APP_INTENT_VOICE.lastSyncNoSyncYet(source),
    };
  }
  const time = formatSyncedRelative(raw, input.now);
  if (!time) {
    return {
      source,
      kind: 'no_sync_yet',
      lastSyncedAt: null,
      spoken: HANNAH_APP_INTENT_VOICE.lastSyncNoSyncYet(source),
    };
  }
  return {
    source,
    kind: 'synced',
    lastSyncedAt: raw,
    spoken: HANNAH_APP_INTENT_VOICE.lastSyncSynced(source, time),
  };
}

export function speakWearablesLastSync(tiles: readonly WearableLastSyncInput[]): string {
  return tiles.map((tile) => wearableLastSyncGlance(tile).spoken).join(' ');
}

export function shouldShowBosExplainChip(
  score: number | null,
  chips: readonly string[],
): boolean {
  if (!isFiniteKnownScore(score)) return false;
  return chips.some((chip) => typeof chip === 'string' && chip.trim().length > 0);
}

export function buildBosExplainLines(args: {
  score: number | null;
  chips: readonly string[];
  band?: BosBandLabel | null;
  topDriverChip?: string | null;
}): string[] {
  if (!shouldShowBosExplainChip(args.score, args.chips)) return [];
  const lines = [HANNAH_APP_INTENT_VOICE.explainDefault];
  const driver =
    typeof args.topDriverChip === 'string' && args.topDriverChip.trim().length > 0
      ? args.topDriverChip.trim()
      : args.chips.find((chip) => chip.trim().length > 0) ?? null;
  if (driver) {
    lines.push(HANNAH_APP_INTENT_VOICE.explainTopDriver(driver));
  }
  if (args.band && isFiniteKnownScore(args.score)) {
    lines.push(HANNAH_APP_INTENT_VOICE.explainBandWhy(args.band, args.score));
  }
  return lines;
}
