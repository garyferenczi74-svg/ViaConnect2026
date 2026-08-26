/**
 * Hounddog command-center honesty. Overview fixtures (847 / +12K / 2.1M /
 * 6.8% / 24.7% / "3 AGENTS RUNNING") are not a live social last-sync.
 * Same fail-closed rule as Connections: empty until a real last-sync exists.
 * Do not invent Connected, last-sync timestamps, or job rows.
 */

export const HOUNDDOG_EMPTY_COPY =
  "No connected social accounts. Hounddog stays empty until a live platform is wired.";

/** Content Scheduled / Scripts empty list. Not the Overview KPI banner. */
export const HOUNDDOG_CONTENT_EMPTY_COPY = "No scripts yet.";

export const STAGED_HOUNDDOG_MARKERS = [
  "847",
  "+12K",
  "2.1M",
  "6.8%",
  "24.7%",
  "3 AGENTS RUNNING",
  "AI replaced my team",
  "Morning Routine",
] as const;

export type HounddogAgentStatus = "live" | "idle";

/** Real agent job row. Never fabricate one for chrome. */
export interface HounddogLiveJobRow {
  id: string;
  agentName: string;
  status: HounddogAgentStatus;
  task: string;
}

/** Real connected-account row. lastSyncAt must come from a live platform. */
export interface HounddogSocialAccountRow {
  platform: string;
  lastSyncAt: string | null;
}

/**
 * True only when a real last-sync timestamp exists.
 * Never treat a missing stamp as Connected.
 */
export function hasLiveSocialLastSync(
  accounts: readonly HounddogSocialAccountRow[],
): boolean {
  return accounts.some(
    (account) =>
      typeof account.lastSyncAt === "string" && account.lastSyncAt.trim().length > 0,
  );
}

/** Live jobs only. Idle / empty ids are not "N AGENTS RUNNING". */
export function liveAgentJobs(
  jobs: readonly HounddogLiveJobRow[],
): readonly HounddogLiveJobRow[] {
  return jobs.filter((job) => job.status === "live" && job.id.trim().length > 0);
}

/**
 * Wired social accounts for the command center.
 * No OAuth last-sync exists. Do not invent Connected.
 */
export function loadHounddogLiveAccounts(): readonly HounddogSocialAccountRow[] {
  return [];
}

/**
 * Wired agent job rows for the command center.
 * No live job table is connected. Do not invent running agents.
 */
export function loadHounddogLiveJobs(): readonly HounddogLiveJobRow[] {
  return [];
}
