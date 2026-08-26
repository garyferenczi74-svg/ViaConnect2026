/**
 * Brief 54: Hounddog Overview social-count contract.
 *
 * hounddog_performance is views / likes / reach only. Sherlock allowlist
 * URL / title / score rows are not social counts (Watson reverted 129 of
 * them). Do not invent a KPI from URL-row count. Do not read
 * hounddog_analytics_rollup (no rollup yet). Do not call
 * getHounddogAnalyticsSummary (it coalesces missing to 0 / tiktok).
 */

import {
  HOUNDDOG_EMPTY_METRIC,
  HOUNDDOG_NO_SCRAPE_COPY,
  hasLiveSocialLastSync,
  loadHounddogLiveAccounts,
  type HounddogSocialAccountRow,
} from "@/lib/hounddog/honesty";

export type SocialCountField = "views" | "likes" | "reach";

/** Live scrape snapshot. Missing counts stay null — never coalesced to 0. */
export interface HounddogSocialCountRow {
  platform: string;
  views: number | null;
  likes: number | null;
  reach: number | null;
  saves: number | null;
  engRate: number | null;
  recordedAt: string | null;
  postUrl: string | null;
}

/**
 * Sherlock / Research Hub digest shape. Legal on the Research findings
 * list only. Never a performance row, script, hook, pipeline item, or
 * Overview last-sync.
 */
export interface SherlockDigestRow {
  title?: string | null;
  url?: string | null;
  platform?: string | null;
  score?: number | null;
  fetchedAt?: string | null;
}

export interface OverviewSocialCells {
  day30: string;
  posts: string;
  eng: string;
  reach: string;
  saves: string;
  growth: string;
}

export interface OverviewKpiBind {
  aiTasks: string;
  postsInQueue: string;
  avgEngagement: string;
  hint: string;
}

/** True when the value is a recorded social count. 0 / null / NaN are not. */
export function isRealSocialCount(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function hasRealSocialCount(
  row: Pick<HounddogSocialCountRow, SocialCountField>,
): boolean {
  return (
    isRealSocialCount(row.views) ||
    isRealSocialCount(row.likes) ||
    isRealSocialCount(row.reach)
  );
}

/**
 * URL / title / score without views / likes / reach is a digest row, not
 * a scrape. Counting these (the old 129) must never become a KPI.
 */
export function isUrlOnlyDigestRow(
  row: Pick<HounddogSocialCountRow, SocialCountField | "postUrl"> & {
    title?: string | null;
    score?: number | null;
  },
): boolean {
  const hasDigestMeta =
    (typeof row.postUrl === "string" && row.postUrl.trim().length > 0) ||
    (typeof row.title === "string" && row.title.trim().length > 0) ||
    (typeof row.score === "number" && Number.isFinite(row.score));
  return hasDigestMeta && !hasRealSocialCount(row);
}

export function normalizePlatformKey(platform: string): string {
  return platform.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

/**
 * Write guard for hounddog_performance. Rejects Sherlock title/score and
 * URL-only payloads so they cannot come back as "performance" rows.
 */
export function canWritePerformanceSnapshot(row: {
  views?: number | null;
  likes?: number | null;
  reach?: number | null;
  title?: unknown;
  score?: unknown;
}): boolean {
  if (row.title != null || row.score != null) return false;
  return hasRealSocialCount({
    views: row.views ?? null,
    likes: row.likes ?? null,
    reach: row.reach ?? null,
  });
}

/**
 * Rollup is social-count only. total_scripts / title / score are not a
 * reach scrape. Do not write a rollup that has no real reach.
 */
export function canWriteAnalyticsRollup(row: {
  total_reach?: number | null;
  title?: unknown;
  score?: unknown;
}): boolean {
  if (row.title != null || row.score != null) return false;
  return isRealSocialCount(row.total_reach);
}

export function formatSocialCount(value: number | null | undefined): string {
  if (!isRealSocialCount(value)) return HOUNDDOG_EMPTY_METRIC;
  return String(value);
}

export function formatEngRate(value: number | null | undefined): string {
  if (!isRealSocialCount(value)) return HOUNDDOG_EMPTY_METRIC;
  return `${value}%`;
}

/**
 * Empty until a live scrape writes views / likes / reach.
 * No OAuth. No fixture store. No parallel demo table.
 */
export function loadHounddogSocialCounts(): readonly HounddogSocialCountRow[] {
  return [];
}

export function selectRealSocialCounts(
  rows: readonly HounddogSocialCountRow[],
): readonly HounddogSocialCountRow[] {
  return rows.filter(hasRealSocialCount);
}

export function countUrlOnlyDigestRows(
  rows: readonly (Pick<HounddogSocialCountRow, SocialCountField | "postUrl"> & {
    title?: string | null;
    score?: number | null;
  })[],
): number {
  return rows.filter(isUrlOnlyDigestRow).length;
}

/**
 * Never treat URL-row cardinality as reach / views / likes / posts.
 */
export function socialCountFromUrlRowCount(
  urlRowCount: number,
): string {
  void urlRowCount;
  return HOUNDDOG_EMPTY_METRIC;
}

export function findCountForPlatform(
  rows: readonly HounddogSocialCountRow[],
  platformName: string,
): HounddogSocialCountRow | undefined {
  const key = normalizePlatformKey(platformName);
  return selectRealSocialCounts(rows).find(
    (row) => normalizePlatformKey(row.platform) === key,
  );
}

export function bindSocialTableCells(
  row: HounddogSocialCountRow | undefined,
): OverviewSocialCells {
  if (!row || !hasRealSocialCount(row)) {
    return {
      day30: HOUNDDOG_NO_SCRAPE_COPY,
      posts: HOUNDDOG_EMPTY_METRIC,
      eng: HOUNDDOG_EMPTY_METRIC,
      reach: HOUNDDOG_EMPTY_METRIC,
      saves: HOUNDDOG_EMPTY_METRIC,
      growth: HOUNDDOG_EMPTY_METRIC,
    };
  }
  return {
    day30: isRealSocialCount(row.views)
      ? formatSocialCount(row.views)
      : HOUNDDOG_NO_SCRAPE_COPY,
    // Posts is not views/likes/reach. URL-row count is not posts.
    posts: HOUNDDOG_EMPTY_METRIC,
    eng: formatEngRate(row.engRate),
    reach: formatSocialCount(row.reach),
    saves: formatSocialCount(row.saves),
    growth: HOUNDDOG_EMPTY_METRIC,
  };
}

function averageRealEngRate(
  rows: readonly HounddogSocialCountRow[],
): number | null {
  const rates = selectRealSocialCounts(rows)
    .map((row) => row.engRate)
    .filter(isRealSocialCount);
  if (rates.length === 0) return null;
  const sum = rates.reduce((acc, value) => acc + value, 0);
  return sum / rates.length;
}

/**
 * KPI numbers bind only from a real social-count row or a real
 * connected-account last-sync. Last-sync without counts still paints
 * -- (it is not a view/like/reach). AI Tasks / Queue are not social
 * counts and stay --.
 */
export function bindOverviewKpis(
  rows: readonly HounddogSocialCountRow[],
  accounts: readonly HounddogSocialAccountRow[] = loadHounddogLiveAccounts(),
): OverviewKpiBind {
  const real = selectRealSocialCounts(rows);
  const hasLastSync = hasLiveSocialLastSync(accounts);
  const canBind = real.length > 0 || hasLastSync;
  if (!canBind) {
    return {
      aiTasks: HOUNDDOG_EMPTY_METRIC,
      postsInQueue: HOUNDDOG_EMPTY_METRIC,
      avgEngagement: HOUNDDOG_EMPTY_METRIC,
      hint: HOUNDDOG_NO_SCRAPE_COPY,
    };
  }
  return {
    aiTasks: HOUNDDOG_EMPTY_METRIC,
    postsInQueue: HOUNDDOG_EMPTY_METRIC,
    avgEngagement: formatEngRate(averageRealEngRate(real)),
    hint: real.length > 0 ? "" : HOUNDDOG_NO_SCRAPE_COPY,
  };
}

/**
 * Digest fetch-time is not a connected-account last-sync.
 */
export function lastSyncFromDigestRows(
  rows: readonly SherlockDigestRow[],
): string | null {
  void rows;
  return null;
}
