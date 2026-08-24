/**
 * Prompt 219F: per-user in-memory rate limit for /api/advisor/chat.
 * Soft limit suitable for serverless (per-instance). Keeps the endpoint
 * from being hammered; returns a polite message when exceeded.
 */

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_MESSAGES = 30; // per user per window

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
  remaining: number;
}

export function checkAdvisorRateLimit(userId: string, now = Date.now()): RateLimitResult {
  const bucket = buckets.get(userId) ?? { timestamps: [] };
  const cutoff = now - WINDOW_MS;
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= MAX_MESSAGES) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    buckets.set(userId, bucket);
    return { allowed: false, retryAfterSec, remaining: 0 };
  }

  bucket.timestamps.push(now);
  buckets.set(userId, bucket);
  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: Math.max(0, MAX_MESSAGES - bucket.timestamps.length),
  };
}

/** Test helper: clear all buckets. */
export function resetAdvisorRateLimitForTests(): void {
  buckets.clear();
}

export const ADVISOR_RATE_LIMIT = {
  windowMs: WINDOW_MS,
  maxMessages: MAX_MESSAGES,
} as const;
