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
  gemini: 'n/a', // adapter ignores; included so the record is exhaustive
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-7-20250520',
};

// Per-tier request deadline. Haiku stays tight; Sonnet a bit longer for the
// retry path; Opus a touch longer still because it is invoked only on
// genuinely ambiguous labels. Gemini matches the NutriVision Phase 1q
// hotfix budget (30s outer wrap with a 10s inner abort).
export const TIER_TIMEOUT_MS: Record<ModelTier, number> = {
  gemini: 30000,
  haiku: 20000,
  sonnet: 30000,
  opus: 40000,
};

// Prompt 175b (2026-06-04): Gemini primary provider config per master
// spec 5.3. Model id can be overridden via env at request time so a
// future Gemini build (gemini-2.5-pro-002 etc.) does not require a
// redeploy. Confidence threshold is the primary trigger for the Claude
// Sonnet fallback.
export const GEMINI_MODEL_ID_DEFAULT = 'gemini-2.5-pro';
export function getGeminiModelId(): string {
  const override = process.env.CAQ_SUPPLEMENT_GEMINI_MODEL;
  return typeof override === 'string' && override.length > 0 ? override : GEMINI_MODEL_ID_DEFAULT;
}
export const GEMINI_MIN_CONFIDENCE = 0.7;

// Claude Sonnet fallback gate. Master spec 5.3 caps the cross-check at
// 3 percent of total label scans per month, env config. This batch ships
// the on/off flag; the strict 3 percent counter lands in a follow-up
// batch alongside the observability counter table. Default ON: when
// Gemini is below threshold or fails, the route tries Sonnet once.
export function isClaudeFallbackEnabled(): boolean {
  const v = process.env.CAQ_SUPPLEMENT_CLAUDE_FALLBACK_ENABLED;
  if (typeof v !== 'string') return true;
  const lower = v.toLowerCase();
  return lower !== 'false' && lower !== '0' && lower !== 'off' && lower !== 'no';
}

// API key resolution. Gary set the Photo AI Anthropic backup key in
// Vercel as PHOTO_AI_ANTHROPIC_API_KEY (2026-06-04); we read that first
// and fall back to the legacy ANTHROPIC_API_KEY name so the route still
// works in environments that only define one or the other. Same pattern
// for Gemini in case Gary later splits the env vars by surface.
export function getPhotoAiAnthropicApiKey(): string | null {
  return process.env.PHOTO_AI_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || null;
}
export function getPhotoAiGeminiApiKey(): string | null {
  return process.env.PHOTO_AI_GEMINI_API_KEY || process.env.GEMINI_API_KEY || null;
}

// Prompt 175b hotfix Section 2.2: one retry with exponential backoff and
// jitter before failover, so a transient per-minute rate limit does not
// turn into a hard provider-out outcome. These bounds are intentionally
// short; the primary tier already has its own AbortController timeout
// (TIER_TIMEOUT_MS), and the retry must not push total request budget
// past the route's maxDuration.
export const PROVIDER_RETRY_BASE_MS = 400;
export const PROVIDER_RETRY_JITTER_MS = 300;
export const PROVIDER_RETRY_MAX_ATTEMPTS = 2; // first attempt + one retry

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
