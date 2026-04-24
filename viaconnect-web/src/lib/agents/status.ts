/**
 * Status derivation (Prompt #126 spec section 2.4).
 * Client computes 'stale' from last_heartbeat age so the server never has to
 * schedule a cron for staleness transitions.
 */

import type { AgentHeartbeat, AgentStatus } from "./types";

export const STALE_THRESHOLD_MS = 30_000;

export function deriveStatus(
  hb: AgentHeartbeat | null | undefined,
  now: number = Date.now(),
): AgentStatus {
  if (!hb) return "idle";
  if (hb.status === "paused") return "paused";
  const last = Date.parse(hb.last_heartbeat);
  if (Number.isFinite(last)) {
    const age = now - last;
    if (age > STALE_THRESHOLD_MS) return "stale";
  }
  return hb.status;
}

export const STATUS_COLOR: Record<AgentStatus, string> = {
  healthy:  "#2DA5A0",
  degraded: "#E6B800",
  error:    "#E05A4B",
  idle:     "#6B7A99",
  paused:   "#B75E18",
  stale:    "#8E6ED1",
};

export const STATUS_LABEL: Record<AgentStatus, string> = {
  healthy:  "Healthy",
  degraded: "Degraded",
  error:    "Error",
  idle:     "Idle",
  paused:   "Paused",
  stale:    "Stale",
};
