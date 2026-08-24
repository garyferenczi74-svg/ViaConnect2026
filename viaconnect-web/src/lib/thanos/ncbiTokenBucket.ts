/**
 * Prompt 225a: shared NCBI E-utilities token bucket.
 * Rate limit is per IP across all E-utility endpoints (3 rps without key, 10 with).
 */

function hasNcbiKey(): boolean {
  return Boolean(
    process.env.NCBI_API_KEY?.trim() || process.env.NCBI_API_Key?.trim(),
  );
}

/** Conservative: 8/s with key, 2.5/s without. */
function targetRps(): number {
  return hasNcbiKey() ? 8 : 2.5;
}

let tokens = targetRps();
let lastRefill = Date.now();
const maxTokens = targetRps();

function refill(): void {
  const now = Date.now();
  const elapsed = (now - lastRefill) / 1000;
  if (elapsed <= 0) return;
  tokens = Math.min(maxTokens, tokens + elapsed * targetRps());
  lastRefill = now;
}

/**
 * Wait until one request token is available, then consume it.
 * Use before every E-utilities call (shared across workers in-process).
 */
export async function acquireNcbiToken(): Promise<{ waitedMs: number }> {
  const start = Date.now();
  for (;;) {
    refill();
    if (tokens >= 1) {
      tokens -= 1;
      return { waitedMs: Date.now() - start };
    }
    await new Promise((r) => setTimeout(r, 40));
  }
}

export function ncbiBucketSnapshot(): {
  tokens: number;
  maxTokens: number;
  rps: number;
  hasKey: boolean;
} {
  refill();
  return {
    tokens,
    maxTokens,
    rps: targetRps(),
    hasKey: hasNcbiKey(),
  };
}
