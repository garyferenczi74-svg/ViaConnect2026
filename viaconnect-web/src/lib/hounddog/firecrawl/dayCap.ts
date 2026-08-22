/**
 * Prompt 219g follow-up: durable Firecrawl day-cap from firecrawl_run_ledger.
 * Soft gate across Vercel instances. Concurrent races may slightly overshoot;
 * atomic reserve RPC is a later hardening, not this change.
 *
 * On ledger read failure: clamp maxCredits to DAY_CAP_READ_FAILURE_MAX_CREDITS
 * so a blind gate never unlocks a full 200-credit runaway.
 */

import { safeLog } from "@/lib/utils/safe-log";
import { type FirecrawlBudget } from "./client";

/** Credits allowed when the ledger read fails (fail-closed-ish). */
export const DAY_CAP_READ_FAILURE_MAX_CREDITS = 10;

export function firecrawlDailyCreditCeiling(): number {
  const n = Number(process.env.FIRECRAWL_MAX_CREDITS_PER_DAY ?? "200");
  return Number.isFinite(n) && n > 0 ? n : 200;
}

export function firecrawlMaxPagesPerRun(): number {
  const n = Number(process.env.FIRECRAWL_MAX_PAGES_PER_RUN ?? "25");
  return Number.isFinite(n) && n > 0 ? n : 25;
}

export function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Minimal client surface so unit tests can mock without full Supabase types. */
export type DayCapAdmin = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        limit: (n: number) => PromiseLike<{
          data: Array<{ credits_used?: number | string | null }> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

export interface DayCreditSnapshot {
  dayKey: string;
  used: number;
  ceiling: number;
  remaining: number;
  ok: boolean;
  error?: string;
}

export async function getUtcDayCreditsUsed(
  admin: DayCapAdmin,
  dayKey = utcDayKey(),
): Promise<DayCreditSnapshot> {
  const ceiling = firecrawlDailyCreditCeiling();
  try {
    const { data, error } = await admin
      .from("firecrawl_run_ledger")
      .select("credits_used")
      .eq("run_date", dayKey)
      .limit(5000);

    if (error) {
      safeLog.warn("firecrawl.dayCap", "day_cap_read_failed", {
        dayKey,
        error: error.message,
      });
      return {
        dayKey,
        used: 0,
        ceiling,
        remaining: Math.min(DAY_CAP_READ_FAILURE_MAX_CREDITS, ceiling),
        ok: false,
        error: error.message,
      };
    }

    const used = (data ?? []).reduce(
      (sum, row) => sum + Number(row.credits_used ?? 0),
      0,
    );
    const safeUsed = Number.isFinite(used) && used > 0 ? used : 0;
    const remaining = Math.max(0, ceiling - safeUsed);
    return { dayKey, used: safeUsed, ceiling, remaining, ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.warn("firecrawl.dayCap", "day_cap_read_failed", {
      dayKey,
      error: message,
    });
    return {
      dayKey,
      used: 0,
      ceiling,
      remaining: Math.min(DAY_CAP_READ_FAILURE_MAX_CREDITS, ceiling),
      ok: false,
      error: message,
    };
  }
}

/**
 * Build a per-run budget whose maxCredits is the remaining shared daily ceiling.
 * Per-run page cap stays independent (FIRECRAWL_MAX_PAGES_PER_RUN).
 */
export async function createDayAwareBudget(
  admin: DayCapAdmin,
  opts?: { maxPages?: number; dayKey?: string },
): Promise<FirecrawlBudget & { dayCap: DayCreditSnapshot }> {
  const snap = await getUtcDayCreditsUsed(admin, opts?.dayKey);
  const maxPages = opts?.maxPages ?? firecrawlMaxPagesPerRun();
  const maxCredits = snap.ok
    ? snap.remaining
    : Math.min(DAY_CAP_READ_FAILURE_MAX_CREDITS, snap.ceiling);

  return {
    pagesUsed: 0,
    creditsUsed: 0,
    maxPages,
    maxCredits,
    hitBudget: maxCredits <= 0,
    dayCap: snap,
  };
}
