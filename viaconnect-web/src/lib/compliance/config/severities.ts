/**
 * Marshall severity + blocking posture configuration.
 */

import type { Severity } from "../engine/types";

export const SEVERITY_LABELS: Record<Severity, string> = {
  P0: "P0 Critical",
  P1: "P1 High",
  P2: "P2 Medium",
  P3: "P3 Low",
  ADVISORY: "Advisory",
};

// Which severities block the originating action (render, send, save, ship).
export const BLOCKING_SEVERITIES: ReadonlySet<Severity> = new Set(["P0", "P1"]);

// Auto-remediation is permitted only at/below this severity.
export const AUTO_REMEDIATE_CEILING: Severity = "P2";

// Global enforcement mode; default is 'enforce'. Kill-switch per §17.
export type EnforcementMode = "enforce" | "shadow" | "off";
export function getEnforcementMode(): EnforcementMode {
  const raw = (process.env.MARSHALL_GLOBAL_MODE ?? "enforce").toLowerCase();
  if (raw === "shadow" || raw === "off") return raw;
  return "enforce";
}

export function isBlocking(severity: Severity): boolean {
  if (getEnforcementMode() === "off") return false;
  if (getEnforcementMode() === "shadow") return severity === "P0";
  return BLOCKING_SEVERITIES.has(severity);
}
