/**
 * Brief 66 — Hannah voice SSOT for App Intents + in-app Explain.
 * Verbatim locked copy. Parameterize braces only. Never invent score,
 * band, molecule, dose, CTA, or last-sync timestamps.
 */

export const BOS_BAND_LABELS = ['Ease up', 'Steady', 'Ready', 'Push'] as const;

export type BosBandLabel = (typeof BOS_BAND_LABELS)[number];

/** Brief 62 numeric cutoffs are not in this repo. Soft Ready rename hold. */
export const BOS_BAND_CUTOFFS = null;

export const HANNAH_APP_INTENT_VOICE = {
  bosKnown: (n: number): string => `Your Bio Optimization Score is ${n} today.`,
  bosKnownBand: (n: number, band: BosBandLabel): string =>
    `Your Bio Optimization Score is ${n} today. That's in the ${band} range.`,
  bosTopDriver: (chip: string): string =>
    `The strongest piece in it today is ${chip}.`,
  bosUnknown:
    "Your Bio Optimization Score isn't ready yet. Missing pieces stay out, not counted as zero.",
  bosPushEaseUnknown:
    "I don't have a Bio Optimization Score yet, so I can't say push or ease up.",
  bosPushEaseKnownBand: (n: number, band: BosBandLabel): string =>
    `Your Bio Optimization Score is ${n}. That's in the ${band} range.`,
  protocolNext: (title: string): string => `Next on today's protocol: ${title}.`,
  protocolNextCta: (title: string, cta: string): string =>
    `Next on today's protocol: ${title}. ${cta}.`,
  protocolComplete: "You're caught up on today's protocol.",
  protocolEmpty: 'No protocol item due today.',
  lastSyncSynced: (source: string, time: string): string =>
    `${source} last synced ${time}.`,
  lastSyncNotConnected: (source: string): string => `${source} isn't connected.`,
  lastSyncNoSyncYet: (source: string): string => `No sync yet for ${source}.`,
  lastSyncComingSoon: (source: string): string => `${source} is coming soon.`,
  explainDefault:
    'Bio Optimization Score blends only what you actually have today. Missing pieces are left out, not counted as zero.',
  explainTopDriver: (chip: string): string =>
    `Right now the strongest real piece is ${chip}.`,
  explainBandWhy: (band: BosBandLabel, n: number): string =>
    `You're in ${band} because today's Bio Optimization Score is ${n}.`,
} as const;
