/**
 * Per-practitioner sliding-window rate limiter.
 * Backed by precheck_sessions.created_at counts (no new dep).
 * Default: 60 / hour for portal, 120 / hour for extension.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface RateLimitConfig {
  windowMinutes: number;
  maxPerWindow: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  portal: { windowMinutes: 60, maxPerWindow: 60 },
  extension: { windowMinutes: 60, maxPerWindow: 120 },
  mobile_app: { windowMinutes: 60, maxPerWindow: 60 },
  scheduler_webhook: { windowMinutes: 60, maxPerWindow: 240 },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  windowMinutes: number;
  maxPerWindow: number;
}

export async function checkRateLimit(
  db: SupabaseClient,
  practitionerId: string,
  source: keyof typeof RATE_LIMITS,
): Promise<RateLimitResult> {
  const cfg = RATE_LIMITS[source] ?? RATE_LIMITS.portal;
  const since = new Date(Date.now() - cfg.windowMinutes * 60 * 1000).toISOString();
  const { count } = await db
    .from("precheck_sessions")
    .select("id", { count: "exact", head: true })
    .eq("practitioner_id", practitionerId)
    .gte("created_at", since);
  const used = count ?? 0;
  const resetAt = new Date(Date.now() + cfg.windowMinutes * 60 * 1000).toISOString();
  return {
    allowed: used < cfg.maxPerWindow,
    remaining: Math.max(0, cfg.maxPerWindow - used),
    resetAt,
    windowMinutes: cfg.windowMinutes,
    maxPerWindow: cfg.maxPerWindow,
  };
}
