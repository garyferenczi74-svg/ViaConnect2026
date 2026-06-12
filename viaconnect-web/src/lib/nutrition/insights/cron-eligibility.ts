// Prompt 192 Task 3: eligibility selection for the scheduled insight runs.
//
// Pure builders and reducers for the cron route. PostgREST exposes no
// SELECT DISTINCT, so the route pages thin meals projections (bounded by
// CRON_MAX_ROW_PAGES x CRON_ROW_PAGE_SIZE rows) and reduces them here.
// Day boundaries use the UTC date of logged_at: eligibility is a cheap
// pre filter only, the engine reloads per user data in the profile
// timezone. Users beyond the per invocation cap are picked up by the
// next cron tick.

export const CRON_USERS_PER_INVOCATION = 200;
export const CRON_ROW_PAGE_SIZE = 1000;
export const CRON_MAX_ROW_PAGES = 10;
export const CRON_CONCURRENCY = 3;
export const CRON_SOFT_BUDGET_MS = 50_000;
export const WEEKLY_MIN_SCORED_DAYS = 3;

const DAY_MS = 24 * 3_600_000;

/** Daily trigger window: meals scored within the last 24 hours. */
export function dailyEligibilitySinceIso(nowIso: string): string {
  return new Date(Date.parse(nowIso) - DAY_MS).toISOString();
}

/** Weekly trigger window: meals scored within the prior 7 days. */
export function weeklyEligibilitySinceIso(nowIso: string): string {
  return new Date(Date.parse(nowIso) - 7 * DAY_MS).toISOString();
}

/** Zero based page to a PostgREST .range(from, to) pair. */
export function pageRange(
  page: number,
  pageSize: number = CRON_ROW_PAGE_SIZE,
): { from: number; to: number } {
  const from = page * pageSize;
  return { from, to: from + pageSize - 1 };
}

/** Distinct user ids in first seen order, capped. */
export function distinctUserIds(
  rows: ReadonlyArray<{ user_id: string }>,
  cap: number = CRON_USERS_PER_INVOCATION,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    if (seen.has(row.user_id)) continue;
    seen.add(row.user_id);
    out.push(row.user_id);
    if (out.length >= cap) break;
  }
  return out;
}

/**
 * Weekly eligibility: users with at least minDays distinct scored days
 * (UTC dates of logged_at) among the supplied rows, capped.
 */
export function weeklyEligibleUserIds(
  rows: ReadonlyArray<{ user_id: string; logged_at: string }>,
  cap: number = CRON_USERS_PER_INVOCATION,
  minDays: number = WEEKLY_MIN_SCORED_DAYS,
): string[] {
  const daysByUser = new Map<string, Set<string>>();
  for (const row of rows) {
    const day = row.logged_at.slice(0, 10);
    const days = daysByUser.get(row.user_id);
    if (days) days.add(day);
    else daysByUser.set(row.user_id, new Set([day]));
  }
  const out: string[] = [];
  for (const [userId, days] of daysByUser) {
    if (days.size < minDays) continue;
    out.push(userId);
    if (out.length >= cap) break;
  }
  return out;
}
