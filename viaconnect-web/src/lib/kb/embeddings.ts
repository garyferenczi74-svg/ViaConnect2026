/**
 * src/lib/kb/embeddings.ts
 *
 * Single embedding producer for the Prompt 208 knowledge corpus.
 * Calls Google Gemini text-embedding-004 over raw REST (no SDK, no new dep).
 * Fails open: any error returns null so callers are never blocked by a missing
 * or misbehaving embedding service.
 *
 * Prompt 208 Phase 0 (2026-06-20).
 */

import { withAbortTimeout } from '@/lib/utils/with-timeout';
import { getCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { safeLog } from '@/lib/utils/safe-log';

export const EMBEDDING_MODEL = 'text-embedding-004';
export const EMBEDDING_DIMS = 768;

const EMBED_TIMEOUT_MS = 5000;
const EMBED_URL_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';

const breaker = getCircuitBreaker('gemini-embeddings', {
  failureThreshold: 5,
  resetTimeoutMs: 60_000,
  halfOpenMaxAttempts: 1,
});

/**
 * Embed a text string using Gemini text-embedding-004.
 * Returns a 768-length number[] on success.
 * Returns null on any timeout, network error, HTTP error, or missing API key.
 * Never throws.
 */
function geminiApiKey(): string | null {
  const k =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.Photo_AI_GEMINI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY_3?.trim() ||
    '';
  return k.length > 0 ? k : null;
}

export async function embedText(text: string): Promise<number[] | null> {
  const key = geminiApiKey();
  if (!key) {
    safeLog.error('kb.embedText', 'GEMINI_API_KEY not configured', {
      hint: 'Set GEMINI_API_KEY in environment to enable embeddings',
    });
    return null;
  }

  const url = `${EMBED_URL_BASE}?key=${key}`;
  const body = {
    model: `models/${EMBEDDING_MODEL}`,
    content: { parts: [{ text }] },
  };

  try {
    const res = await breaker.execute(() =>
      withAbortTimeout(
        (signal) =>
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal,
          }),
        EMBED_TIMEOUT_MS,
        'kb.embedText',
      ),
    );

    if (!res.ok) {
      safeLog.error('kb.embedText', 'Gemini embedding HTTP error', {
        status: res.status,
        model: EMBEDDING_MODEL,
      });
      return null;
    }

    const json = (await res.json()) as {
      embedding?: { values?: number[] };
    };

    const values = json.embedding?.values;
    if (!Array.isArray(values) || values.length !== EMBEDDING_DIMS) {
      safeLog.error('kb.embedText', 'Gemini embedding response malformed', {
        receivedLength: Array.isArray(values) ? values.length : null,
        expected: EMBEDDING_DIMS,
      });
      return null;
    }

    return values;
  } catch (err) {
    safeLog.error('kb.embedText', 'Gemini embedding failed', {
      error: err instanceof Error ? err.message : String(err),
      model: EMBEDDING_MODEL,
    });
    return null;
  }
}
