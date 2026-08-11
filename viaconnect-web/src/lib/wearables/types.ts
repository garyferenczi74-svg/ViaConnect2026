// Prompt 212: shared wearable types. Null/UNKNOWN for missing metrics, never 0 fabrication.

export type WearableProvider = "whoop" | "health_kit" | "health_connect";

export type ConnectedSourceStatus = "connected" | "revoked" | "error" | "pending";

export type WearableEventStatus = "pending" | "processed" | "failed" | "duplicate";

export type MetricKey =
  | "hrv"
  | "sleep"
  | "resting_hr"
  | "body_composition"
  | "workouts"
  | "recovery"
  | "steps";

export const DEFAULT_PRECEDENCE: Record<MetricKey, WearableProvider> = {
  hrv: "whoop",
  sleep: "whoop",
  resting_hr: "whoop",
  recovery: "whoop",
  workouts: "whoop",
  body_composition: "health_kit",
  steps: "health_kit",
};

/** Coerce numeric fields: missing/invalid stays null (UNKNOWN). Never coerce to 0. */
export function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function formatUnknownMetric(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "UNKNOWN";
  return String(v);
}
