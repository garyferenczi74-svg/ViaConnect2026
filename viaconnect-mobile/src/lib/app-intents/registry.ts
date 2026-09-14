/**
 * Brief 66 — Expo / iOS App Intents registry.
 * Shortcuts-friendly exposure. Spoken replies come from Hannah SSOT
 * via glance adapters. Helix stays consumer-only and is not an intent.
 */

export const APP_INTENT_IDS = {
  bos: 'GetBioOptimizationScore',
  protocol: 'GetTodaysProtocolNext',
  lastSync: 'GetWearableLastSync',
} as const;

export type AppIntentId = (typeof APP_INTENT_IDS)[keyof typeof APP_INTENT_IDS];

export const APP_INTENT_TITLES = {
  GetBioOptimizationScore: 'Get Bio Optimization Score',
  GetTodaysProtocolNext: "Get today's protocol next",
  GetWearableLastSync: 'Get wearable last-sync',
} as const;

export const APP_INTENT_UTTERANCES = {
  GetBioOptimizationScore: [
    "What's my Bio Optimization Score?",
    "How's my ViaConnect score today?",
    'Am I ready to push or ease up?',
  ],
  GetTodaysProtocolNext: [
    "What's next on my protocol?",
    'What should I do next in ViaConnect?',
  ],
  GetWearableLastSync: [
    'When did my wearables last sync?',
    'Is Apple Health connected?',
    'Is Hume connected?',
  ],
} as const;

export const BOS_PUSH_EASE_UTTERANCE = 'Am I ready to push or ease up?';

export const APP_INTENT_SCHEME = 'viaconnect';

export const APP_INTENT_PATHS = {
  GetBioOptimizationScore: '/app-intent/bos',
  GetTodaysProtocolNext: '/app-intent/protocol',
  GetWearableLastSync: '/app-intent/last-sync',
} as const;

export function isPushEaseUtterance(utterance: string): boolean {
  return utterance.trim().toLowerCase() === BOS_PUSH_EASE_UTTERANCE.toLowerCase();
}

export function isAppIntentId(value: string): value is AppIntentId {
  return (
    value === APP_INTENT_IDS.bos
    || value === APP_INTENT_IDS.protocol
    || value === APP_INTENT_IDS.lastSync
  );
}
