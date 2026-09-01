// Deno mirror of src/lib/body-tracker/composition/visionModel.ts.
// ARNOLD_VISION_MODEL must be a Claude model id, never an API key.
// Client-visible analyze errors are fail-closed copy only (Arnold SSOT).

export const DEFAULT_FORMAVISION_VISION_MODEL = 'claude-sonnet-4-6';

/** Fail-closed copy for Analyze failures that reach the member UI. */
export const ANALYZE_UNAVAILABLE_USER_ERROR = 'Analysis unavailable — try again';

/** @deprecated Use ANALYZE_UNAVAILABLE_USER_ERROR — same fail-closed string. */
export const VISION_MODEL_CONFIG_USER_ERROR = ANALYZE_UNAVAILABLE_USER_ERROR;

const SK_TOKEN = /(?:^|[\s:"'`])sk-[A-Za-z0-9_-]{8,}/i;
const KEY_TOKEN = /(?:^|[\s:"'`])key-[A-Za-z0-9_-]{8,}/i;
const BEARER = /\bBearer\s+[A-Za-z0-9._\-+=]+/i;
const LONG_OPAQUE = /^[A-Za-z0-9+/=._-]{40,}$/;
const ANALYZE_INTERNALS =
  /invalid vision model|claude-[a-z0-9]|ARNOLD_VISION|ANTHROPIC|API[_-]?KEY|sk-ant-|vision unavailable|not_found_error/i;

export function isSecretLikeValue(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (SK_TOKEN.test(v) || KEY_TOKEN.test(v) || BEARER.test(v)) return true;
  if (LONG_OPAQUE.test(v) && !/^claude-/i.test(v)) return true;
  return false;
}

export function isUsableVisionModelId(value: string): boolean {
  const v = value.trim();
  if (!v || isSecretLikeValue(v)) return false;
  return /^claude-[a-z0-9][a-z0-9._-]{1,62}$/i.test(v);
}

export function resolveVisionModel(
  raw: string | null | undefined,
  fallback: string = DEFAULT_FORMAVISION_VISION_MODEL,
): { model: string; usedFallback: boolean } {
  const v = raw?.trim() ?? '';
  if (isUsableVisionModelId(v)) {
    return { model: v, usedFallback: false };
  }
  return { model: fallback, usedFallback: v.length > 0 };
}

/** Client JSON for a bad-model / vision-config failure. Never interpolates env or model ids. */
export function clientSafeVisionModelError(_model?: string): string {
  return ANALYZE_UNAVAILABLE_USER_ERROR;
}

export function redactSecretsForLog(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{8,}/gi, '[redacted]')
    .replace(/key-[A-Za-z0-9_-]{8,}/gi, '[redacted]')
    .replace(/\bBearer\s+[A-Za-z0-9._\-+=]+/gi, 'Bearer [redacted]');
}

export function sanitizeAnalyzeUserError(message: string | null | undefined): string {
  if (!message || !message.trim()) return ANALYZE_UNAVAILABLE_USER_ERROR;
  if (isSecretLikeValue(message) || ANALYZE_INTERNALS.test(message)) {
    return ANALYZE_UNAVAILABLE_USER_ERROR;
  }
  return message;
}
