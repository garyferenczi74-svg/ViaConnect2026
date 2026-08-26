/**
 * Brief 40 — Jeffery Command Center presence from Live Feed rows.
 *
 * Status is the age of the newest real jeffery_messages.created_at.
 * No synthetic heartbeat, poll-invented tick, or healthier feed.
 */

export const JEFFERY_FEED_TIME_ZONE = "America/Edmonton";
export const JEFFERY_ONLINE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type JefferyFeedPresenceKind = "online" | "idle";

export interface JefferyFeedPresence {
  kind: JefferyFeedPresenceKind;
  label: string;
  newestCreatedAt: string | null;
}

export function newestFeedCreatedAt(
  rows: ReadonlyArray<{ created_at?: string | null }>,
): string | null {
  let best: string | null = null;
  let bestMs = Number.NEGATIVE_INFINITY;
  for (const row of rows) {
    const iso = row.created_at;
    if (!iso) continue;
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) continue;
    if (ms > bestMs) {
      bestMs = ms;
      best = iso;
    }
  }
  return best;
}

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((item) => item.type === type)?.value ?? "";
}

/**
 * America/Edmonton wall time, e.g. "Aug 19, 2026, 2:51 AM".
 */
export function formatJefferyFeedEventTime(
  iso: string,
  timeZone: string = JEFFERY_FEED_TIME_ZONE,
): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(ms));
  const stamp = `${part(parts, "month")} ${part(parts, "day")}, ${part(parts, "year")}, ${part(parts, "hour")}:${part(parts, "minute")} ${part(parts, "dayPeriod")}`;
  return stamp.replace(/\u202f/g, " ").replace(/\u00a0/g, " ");
}

export function deriveJefferyFeedPresence(
  newestCreatedAt: string | null | undefined,
  nowMs: number,
): JefferyFeedPresence {
  if (!newestCreatedAt) {
    return { kind: "idle", label: "Idle · no events", newestCreatedAt: null };
  }
  const eventMs = Date.parse(newestCreatedAt);
  if (Number.isNaN(eventMs)) {
    return { kind: "idle", label: "Idle · no events", newestCreatedAt: null };
  }
  const stamp = formatJefferyFeedEventTime(newestCreatedAt);
  if (nowMs - eventMs < JEFFERY_ONLINE_MAX_AGE_MS) {
    return {
      kind: "online",
      label: `Online · ${stamp}`,
      newestCreatedAt,
    };
  }
  return {
    kind: "idle",
    label: `Idle · last event ${stamp}`,
    newestCreatedAt,
  };
}
