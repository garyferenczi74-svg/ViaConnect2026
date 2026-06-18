// Prompt 204c (2026-06-18): a lightweight per-key sliding-window limiter held in
// process memory. Best-effort defense-in-depth for an expensive route (PDF OCR):
// it bounds how often a single user can hammer one serverless instance. It is
// NOT a distributed limit (each instance keeps its own window), so it pairs with
// a maxDuration cap and the route's own size and page caps rather than replacing
// a shared store. A future shared limiter can swap in behind this signature.

const buckets = new Map<string, number[]>();

export function inMemoryRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  return true;
}
