/**
 * src/lib/kb/embeddings.ts
 *
 * Single embedding producer for the knowledge corpus (208 + 221).
 * Google retired text-embedding-004 (2026-01); use gemini-embedding-001
 * with outputDimensionality 768 to match existing vector(768) columns.
 * Fails open: any error returns null.
 */

import { withAbortTimeout } from "@/lib/utils/with-timeout";
import { getCircuitBreaker } from "@/lib/utils/circuit-breaker";
import { safeLog } from "@/lib/utils/safe-log";

export const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-001";
export const EMBEDDING_DIMS = 768;

const EMBED_TIMEOUT_MS = 8000;

const breaker = getCircuitBreaker("gemini-embeddings", {
  failureThreshold: 5,
  resetTimeoutMs: 60_000,
  halfOpenMaxAttempts: 1,
});

function geminiApiKey(): string | null {
  const k =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.Photo_AI_GEMINI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY_3?.trim() ||
    "";
  return k.length > 0 ? k : null;
}

/**
 * Embed a text string using Gemini embedding REST.
 * Returns a 768-length number[] on success.
 * Returns null on any timeout, network error, HTTP error, or missing API key.
 * Never throws.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const key = geminiApiKey();
  if (!key) {
    safeLog.error("kb.embedText", "GEMINI_API_KEY not configured", {
      hint: "Set GEMINI_API_KEY in environment to enable embeddings",
    });
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${encodeURIComponent(key)}`;
  const body = {
    model: `models/${EMBEDDING_MODEL}`,
    content: { parts: [{ text }] },
    outputDimensionality: EMBEDDING_DIMS,
  };

  try {
    const res = await breaker.execute(() =>
      withAbortTimeout(
        (signal) =>
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal,
          }),
        EMBED_TIMEOUT_MS,
        "kb.embedText"
      )
    );

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      safeLog.error("kb.embedText", "Gemini embedding HTTP error", {
        status: res.status,
        model: EMBEDDING_MODEL,
        bodyPreview: errBody.slice(0, 160),
      });
      return null;
    }

    const json = (await res.json()) as {
      embedding?: { values?: number[] };
    };

    const values = json.embedding?.values;
    if (!Array.isArray(values) || values.length !== EMBEDDING_DIMS) {
      safeLog.error("kb.embedText", "Gemini embedding response malformed", {
        receivedLength: Array.isArray(values) ? values.length : null,
        expected: EMBEDDING_DIMS,
        model: EMBEDDING_MODEL,
      });
      return null;
    }

    return values;
  } catch (err) {
    safeLog.error("kb.embedText", "Gemini embedding failed", {
      error: err instanceof Error ? err.message : String(err),
      model: EMBEDDING_MODEL,
    });
    return null;
  }
}
