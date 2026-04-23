/**
 * Local-only logger. Never ships to a remote sink; extension has zero
 * third-party analytics per Prompt #121 Section 8.6.
 */

export function extLog(level: "info" | "warn" | "error", event: string, payload?: Record<string, unknown>) {
  const line = `[marshall-ext] ${level.toUpperCase()} ${event} ${payload ? JSON.stringify(payload) : ""}`;
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(line);
  } else if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}
