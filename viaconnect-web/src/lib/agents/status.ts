/**
 * Status derivation (Prompt #126; Prompt 219J cadence-aware Stale).
 *
 * Stale definition (single source of truth):
 *   An agent is Stale when it has a last_heartbeat timestamp AND
 *   age(now, last_heartbeat) > expected_period_minutes * STALE_MULTIPLIER
 *   (default multiplier 2). Paused agents never become Stale.
 *   Missing heartbeat → Idle (not Stale). Epoch/null timestamps → Idle.
 *
 * expected_period_minutes comes from heartbeat.metadata.expected_period_minutes
 * or falls back to DEFAULT_EXPECTED_PERIOD_MINUTES (ops-tick interval).
 */

import type { AgentHeartbeat, AgentStatus } from "./types";

/** Multiplier on expected period before Stale fires (219J). */
export const STALE_MULTIPLIER = 2;

/**
 * Default expected period when registry does not supply one: 15 minutes
 * (ops-tick cadence). Stale after 30 minutes without a successful heartbeat.
 */
export const DEFAULT_EXPECTED_PERIOD_MINUTES = 15;

/**
 * @deprecated Prefer deriveStatus with expected period. Kept as 2x default period
 * so existing tests that import STALE_THRESHOLD_MS still mean "2x default period".
 */
export const STALE_THRESHOLD_MS =
  DEFAULT_EXPECTED_PERIOD_MINUTES * STALE_MULTIPLIER * 60_000;

export function staleThresholdMs(expectedPeriodMinutes?: number | null): number {
  const period =
    typeof expectedPeriodMinutes === "number" &&
    Number.isFinite(expectedPeriodMinutes) &&
    expectedPeriodMinutes > 0
      ? expectedPeriodMinutes
      : DEFAULT_EXPECTED_PERIOD_MINUTES;
  return period * STALE_MULTIPLIER * 60_000;
}

export function deriveStatus(
  hb: AgentHeartbeat | null | undefined,
  now: number = Date.now(),
  expectedPeriodMinutes?: number | null
): AgentStatus {
  if (!hb) return "idle";
  if (hb.status === "paused") return "paused";

  const last = Date.parse(hb.last_heartbeat);
  if (!Number.isFinite(last) || last <= 0) {
    // No real heartbeat yet: idle, never stale or cosmetic-healthy.
    return "idle";
  }

  const metaPeriod =
    typeof hb.metadata?.expected_period_minutes === "number"
      ? (hb.metadata.expected_period_minutes as number)
      : null;
  const threshold = staleThresholdMs(
    expectedPeriodMinutes ?? metaPeriod ?? DEFAULT_EXPECTED_PERIOD_MINUTES
  );
  const age = now - last;
  if (age > threshold) return "stale";

  return hb.status;
}

export const STATUS_COLOR: Record<AgentStatus, string> = {
  healthy: "#2DA5A0",
  degraded: "#E6B800",
  error: "#E05A4B",
  idle: "#6B7A99",
  paused: "#B75E18",
  stale: "#8E6ED1",
};

export const STATUS_LABEL: Record<AgentStatus, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  error: "Error",
  idle: "Idle",
  paused: "Paused",
  stale: "Stale",
};
