// =============================================================================
// Prompt 175 Part C (2026-06-04): single source of truth for the tiered
// extraction router. Tuning the cadence, thresholds, or model ids touches
// this file only.
//
// Tiers locked by 175 spec:
//   Primary:        Claude Haiku 4.5  ($1 / $5 per 1M tokens)
//   Escalation:     Claude Sonnet 4.6 ($3 / $15)
//   Optional deep:  Claude Opus 4.8   ($5 / $25), behind OPUS_ENABLED, OFF default
//
// Escalation rules (175 Part C):
//   * Try Haiku.
//   * Escalate to Sonnet on Haiku error/timeout, any item conf < HAIKU_MIN_CONF,
//     or zero items for a non-empty image.
//   * Only escalate to Opus if OPUS_ENABLED is true AND any Sonnet item is
//     below SONNET_MIN_CONF.
//   * Every tier fails -> return empty result with typed outcome so the UI
//     drops to the existing manual search.
// =============================================================================

import type { ModelTier } from './types';

// Anthropic model ids. The dated suffix is the public API identifier and
// changes when Anthropic ships a new build of a tier; keep these literal
// so a future tuning pass updates the constants without touching call sites.
export const CLAUDE_MODEL_IDS: Record<ModelTier, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-7-20250520',
};

// Per-tier request deadline. Haiku stays tight; Sonnet a bit longer for the
// retry path; Opus a touch longer still because it is invoked only on
// genuinely ambiguous labels.
export const TIER_TIMEOUT_MS: Record<ModelTier, number> = {
  haiku: 20000,
  sonnet: 30000,
  opus: 40000,
};

// Confidence thresholds. Item confidence below the threshold escalates the
// request to the next tier. 0.7 / 0.6 are the locked defaults from 175 Part C.
export const HAIKU_MIN_CONFIDENCE = 0.7;
export const SONNET_MIN_CONFIDENCE = 0.6;

// Deep escalation kill switch. Reads at request time so a future flip via
// Vercel env var does not require a redeploy of the engine module.
export function isOpusEscalationEnabled(): boolean {
  return process.env.CAQ_SUPPLEMENT_OPUS_ESCALATION_ENABLED === 'true';
}

// Image validation bounds (175 Part B). Validation runs server-side BEFORE
// the model call so a bad image never burns a tier of budget.
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;     // 10 MB after decode
export const MAX_IMAGE_DIMENSION_PX = 4096;          // longest side
export const TARGET_RESIZE_DIMENSION_PX = 1800;      // for cost + EXIF strip
