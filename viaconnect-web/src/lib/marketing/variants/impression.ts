/**
 * Impression-write helper (Prompt #138a §6.2).
 *
 * Async write with retry. Drops to error log after the configured retry
 * budget so a Supabase blip never blocks page rendering. Failure rate
 * above 1% is itself a flagged condition (operational telemetry, not
 * gated here — that lives in the SOC2 collector for #138 evidence).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReferrerCategory, Viewport } from "./types";

export interface RecordImpressionArgs {
  visitorId: string;
  slotId: string;
  viewport?: Viewport;
  referrerCategory?: ReferrerCategory;
  isReturningVisitor?: boolean;
}

export interface RecordImpressionResult {
  ok: boolean;
  attempts: number;
  error?: string;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 50;

/**
 * Categorize a referrer string into the controlled vocabulary used by
 * marketing_copy_impressions.referrer_category. Defensive against malformed
 * referrer URLs.
 */
export function categorizeReferrer(referrer: string | null | undefined): ReferrerCategory {
  if (!referrer) return "direct";
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (/^(?:www\.)?(?:google|bing|duckduckgo|yahoo|baidu|yandex)\./.test(host)) {
    return "organic_search";
  }
  if (/^(?:www\.)?(?:facebook|instagram|linkedin|twitter|x\.com|tiktok|pinterest|reddit|youtube|t\.co|fb\.me|lnkd\.in)\./.test(host)) {
    return "social";
  }
  if (/^(?:www\.)?(?:mail\.|outlook|gmail|sendgrid|mailchimp|substack)/.test(host)) {
    return "email";
  }
  return "referral";
}

/** Map a viewport width (px) to the impression viewport bucket. */
export function viewportFromWidth(widthPx: number): Viewport {
  if (widthPx < 768) return "mobile";
  if (widthPx < 1024) return "tablet";
  return "desktop";
}

/**
 * Insert one impression row. Retries up to maxAttempts on transient errors;
 * on final failure logs to console and returns ok=false. Never throws.
 */
export async function recordImpression(
  client: SupabaseClient,
  args: RecordImpressionArgs,
  opts: { maxAttempts?: number; backoffMs?: number } = {},
): Promise<RecordImpressionResult> {
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const backoffMs = opts.backoffMs ?? DEFAULT_BACKOFF_MS;
  const row = {
    visitor_id: args.visitorId,
    slot_id: args.slotId,
    viewport: args.viewport ?? null,
    referrer_category: args.referrerCategory ?? null,
    is_returning_visitor: args.isReturningVisitor ?? false,
  };

  let lastError: string | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (client as any)
        .from("marketing_copy_impressions")
        .insert(row);
      if (!error) return { ok: true, attempts: attempt };
      lastError = error.message;
    } catch (err) {
      lastError = (err as Error)?.message ?? "unknown";
    }
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, backoffMs * attempt));
    }
  }
  // eslint-disable-next-line no-console
  console.warn(`[marketing/impression] insert failed after ${maxAttempts} attempts: ${lastError}`);
  return { ok: false, attempts: maxAttempts, error: lastError };
}
