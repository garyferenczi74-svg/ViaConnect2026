// Prompt #164 (#163 fold-in): provider-agnostic AI error taxonomy.
// Routes catch errors and throw an AIRouteError so the JSON response has a
// consistent { code, message, requestId } shape regardless of provider.

export type AIErrorCode =
  | 'AUTH_MISSING'
  | 'AUTH_INVALID'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'API_DOWN'
  | 'INVALID_INPUT'
  | 'MALFORMED_RESPONSE'
  | 'UNAUTHENTICATED'
  | 'CONFIG_MISSING'
  | 'BUDGET_HIT'
  | 'NO_RECOGNITION'
  | 'UNKNOWN';

export class AIRouteError extends Error {
  readonly code: AIErrorCode;
  readonly httpStatus: number;
  readonly userMessage: string;
  readonly cause?: unknown;

  constructor(code: AIErrorCode, internalMessage: string, httpStatus: number, userMessage: string, cause?: unknown) {
    super(internalMessage);
    this.name = 'AIRouteError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.userMessage = userMessage;
    this.cause = cause;
  }
}

interface Classified {
  code: AIErrorCode;
  httpStatus: number;
  userMessage: string;
}

export function classifyGeminiResponse(status: number): Classified {
  if (status === 400) return { code: 'INVALID_INPUT', httpStatus: 400, userMessage: 'We could not understand that meal description. Try being more specific.' };
  if (status === 401 || status === 403) return { code: 'AUTH_INVALID', httpStatus: 500, userMessage: 'AI is misconfigured. Please contact support.' };
  if (status === 429) return { code: 'RATE_LIMITED', httpStatus: 503, userMessage: 'AI is busy. Try again in a moment or enter manually.' };
  if (status >= 500) return { code: 'API_DOWN', httpStatus: 503, userMessage: 'AI is temporarily unavailable. Try again or enter manually.' };
  return { code: 'UNKNOWN', httpStatus: 502, userMessage: 'Something went wrong. Try again or enter manually.' };
}

export function classifyUSDAResponse(status: number): Classified {
  if (status === 403) return { code: 'AUTH_INVALID', httpStatus: 500, userMessage: 'Nutrition database is misconfigured. Please contact support.' };
  if (status === 429) return { code: 'RATE_LIMITED', httpStatus: 503, userMessage: 'Nutrition database is busy. Try again in a moment.' };
  if (status === 404) return { code: 'INVALID_INPUT', httpStatus: 404, userMessage: 'Food not found in the nutrition database.' };
  if (status >= 500) return { code: 'API_DOWN', httpStatus: 503, userMessage: 'Nutrition database is temporarily unavailable.' };
  return { code: 'UNKNOWN', httpStatus: 502, userMessage: 'Nutrition lookup failed.' };
}

export function classifyFetchError(error: unknown): Classified {
  if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'TimeoutError') {
    return { code: 'TIMEOUT', httpStatus: 504, userMessage: 'The request took too long. Try again.' };
  }
  return { code: 'UNKNOWN', httpStatus: 502, userMessage: 'Something went wrong. Try again or enter manually.' };
}

export function toAIRouteError(error: unknown, fallbackInternal = 'unexpected'): AIRouteError {
  if (error instanceof AIRouteError) return error;
  const cls = classifyFetchError(error);
  return new AIRouteError(cls.code, fallbackInternal, cls.httpStatus, cls.userMessage, error);
}
