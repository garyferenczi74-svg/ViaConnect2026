// FormaVision / body-scan-analyze vision model resolution.
// ARNOLD_VISION_MODEL must be a Claude model id, never an API key.
// Client-visible errors must never include secrets.

export const DEFAULT_FORMAVISION_VISION_MODEL = 'claude-sonnet-4-6';

export const VISION_MODEL_CONFIG_USER_ERROR = 'invalid vision model configuration';

const SK_TOKEN = /(?:^|[\s:"'`])sk-[A-Za-z0-9_-]{8,}/i;
const KEY_TOKEN = /(?:^|[\s:"'`])key-[A-Za-z0-9_-]{8,}/i;
const BEARER = /\bBearer\s+[A-Za-z0-9._\-+=]+/i;
const LONG_OPAQUE = /^[A-Za-z0-9+/=._-]{40,}$/;

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

/** Client JSON for a bad-model response. Never interpolates the raw env/model. */
export function clientSafeVisionModelError(_model?: string): string {
  return VISION_MODEL_CONFIG_USER_ERROR;
}

export function redactSecretsForLog(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{8,}/gi, '[redacted]')
    .replace(/key-[A-Za-z0-9_-]{8,}/gi, '[redacted]')
    .replace(/\bBearer\s+[A-Za-z0-9._\-+=]+/gi, 'Bearer [redacted]');
}

export function sanitizeAnalyzeUserError(message: string | null | undefined): string {
  if (!message || !message.trim()) return 'Analysis failed';
  if (isSecretLikeValue(message) || /invalid vision model:/i.test(message)) {
    return VISION_MODEL_CONFIG_USER_ERROR;
  }
  return message;
}
