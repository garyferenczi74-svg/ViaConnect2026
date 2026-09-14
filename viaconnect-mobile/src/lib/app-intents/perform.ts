/**
 * Brief 66 — live App Intent perform path.
 * Builds Hannah spoken replies from in-memory glance inputs only.
 * Never stores PHI. Never invents score, band, molecule, dose, CTA,
 * or last-sync. Coming soon never feeds BOS.
 */

import {
  UNWIRED_COMING_SOON_SOURCE_IDS,
  protocolNextGlance,
  speakBosGlance,
  speakWearablesLastSync,
  wearableLastSyncGlance,
  type WearableLastSyncInput,
} from '../morning-card/glance';
import type { MorningProtocolItem } from '../morning-card/model';
import {
  APP_INTENT_IDS,
  isPushEaseUtterance,
  type AppIntentId,
} from './registry';

export interface AppIntentPerformInput {
  intentId: AppIntentId;
  utterance?: string;
  score?: number | null;
  topDriverChip?: string | null;
  protocolItems?: readonly Pick<MorningProtocolItem, 'name' | 'taken'>[];
  wearables?: readonly WearableLastSyncInput[];
  lastSyncSourceId?: string;
}

export interface AppIntentPerformResult {
  intentId: AppIntentId;
  spoken: string;
}

export function performAppIntent(input: AppIntentPerformInput): AppIntentPerformResult {
  if (input.intentId === APP_INTENT_IDS.bos) {
    const variant = isPushEaseUtterance(input.utterance ?? '') ? 'push_ease' : 'score';
    return {
      intentId: input.intentId,
      spoken: speakBosGlance({
        score: input.score ?? null,
        topDriverChip: input.topDriverChip ?? null,
        variant,
      }),
    };
  }

  if (input.intentId === APP_INTENT_IDS.protocol) {
    const glance = protocolNextGlance(input.protocolItems ?? []);
    return { intentId: input.intentId, spoken: glance.spoken };
  }

  const sourceId = input.lastSyncSourceId;
  if (typeof sourceId === 'string' && sourceId.trim().length > 0) {
    const match = (input.wearables ?? []).find((tile) => tile.sourceId === sourceId);
    const glance = wearableLastSyncGlance(
      match ?? {
        sourceId,
        connected: false,
        lastSyncedAt: null,
      },
    );
    return { intentId: input.intentId, spoken: glance.spoken };
  }

  const tiles = input.wearables ?? [];
  const spoken = speakWearablesLastSync(
    tiles.length > 0
      ? tiles
      : UNWIRED_COMING_SOON_SOURCE_IDS.map((sourceId) => ({
          sourceId,
          connected: false,
          lastSyncedAt: null,
        })),
  );
  return { intentId: input.intentId, spoken };
}
