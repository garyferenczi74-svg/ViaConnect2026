// Prompt #170a supplement §20.B: map AIRouteError codes (+ optional message
// hints) to the six client-side NutriVision error_class buckets Hannah locked
// per-error copy against.
//
// Mapping table:
//   BUDGET_HIT                            -> budget_hard_stop
//   INVALID_INPUT (with 'too large'/413)  -> image_too_large
//   INVALID_INPUT (with 'corrupt'/decode) -> image_corrupt
//   INVALID_INPUT (other)                 -> unknown
//   API_DOWN (with 'timeout'/504)         -> provider_timeout
//   API_DOWN (other)                      -> provider_outage
//   CONFIG_MISSING                        -> unknown
//   MALFORMED_RESPONSE                    -> unknown
//   NO_RECOGNITION                        -> unknown
//   UNAUTHENTICATED                       -> unknown (auth wall is upstream)
//   TIMEOUT                               -> provider_timeout
//   RATE_LIMITED                          -> provider_outage
//   AUTH_MISSING / AUTH_INVALID           -> unknown
//   anything else                         -> unknown
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import type { AIErrorCode } from '@/lib/errors/classify-ai';

export type NutriVisionErrorClass =
  | 'provider_timeout'
  | 'provider_outage'
  | 'image_too_large'
  | 'image_corrupt'
  | 'budget_hard_stop'
  | 'unknown';

function messageHints(message: string | undefined): string {
  if (typeof message !== 'string') return '';
  return message.toLowerCase();
}

export function mapAIErrorToClass(
  code: AIErrorCode,
  message?: string,
): NutriVisionErrorClass {
  if (code === 'BUDGET_HIT') return 'budget_hard_stop';

  const hint = messageHints(message);

  if (code === 'INVALID_INPUT') {
    if (hint.includes('too large') || hint.includes('413')) return 'image_too_large';
    if (
      hint.includes('corrupt') ||
      hint.includes('decode') ||
      hint.includes('heic')
    ) {
      return 'image_corrupt';
    }
    return 'unknown';
  }

  if (code === 'API_DOWN') {
    if (hint.includes('timeout') || hint.includes('504')) return 'provider_timeout';
    return 'provider_outage';
  }

  if (code === 'TIMEOUT') return 'provider_timeout';
  if (code === 'RATE_LIMITED') return 'provider_outage';

  // CONFIG_MISSING, MALFORMED_RESPONSE, NO_RECOGNITION, UNAUTHENTICATED,
  // AUTH_MISSING, AUTH_INVALID, UNKNOWN all collapse to the generic bucket.
  return 'unknown';
}
