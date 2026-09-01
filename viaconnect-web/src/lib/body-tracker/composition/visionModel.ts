// FormaVision / body-scan-analyze vision model resolution.
// ARNOLD_VISION_MODEL must be a Claude model id, never an API key.
// Client-visible errors must never include secrets.

export const DEFAULT_FORMAVISION_VISION_MODEL = 'claude-sonnet-4-6';

export const VISION_MODEL_CONFIG_USER_ERROR =
  'Analysis unavailable — model configuration error. Try again later.';

const SECRET_TOKEN = /sk-ant-[A-Za-z0-9_-]+/i;
const GENERIC_SK = /\bsk-[A-Za-z0-9_-]{16,}\b/i;
const BEARER = /\bBearer\s+[A-Za-z0-9._\-+=]+\b/i;

export function isSecretLikeValue(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return SECRET_TOKEN.test(v) || GENERIC_SK.test(v) || BEARER.test(v);
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

export function redactSecretsForLog(text: string): string {
  return text
    .replace(/sk-ant-[A-Za-z0-9_-]+/gi, '[redacted]')
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/gi, '[redacted]')
    .replace(/\bBearer\s+[A-Za-z0-9._\-+=]+\b/gi, 'Bearer [redacted]');
}

export function sanitizeAnalyzeUserError(message: string | null | undefined): string {
  if (!message || !message.trim()) return 'Analysis failed';
  if (isSecretLikeValue(message) || /invalid vision model/i.test(message)) {
    return VISION_MODEL_CONFIG_USER_ERROR;
  }
  return message;
}
