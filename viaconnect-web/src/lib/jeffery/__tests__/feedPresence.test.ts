import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  JEFFERY_ONLINE_MAX_AGE_MS,
  deriveJefferyFeedPresence,
  formatJefferyFeedEventTime,
  newestFeedCreatedAt,
} from "../feedPresence";

const root = join(process.cwd());
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

/** 25 Aug 2026 walk: newest listed Live Feed row, 2:51:20 AM America/Edmonton (MDT = UTC-6). */
const WALK_NEWEST_ISO = "2026-08-19T08:51:20.000Z";
const WALK_NOW_MS = Date.parse("2026-08-25T18:00:00.000Z");

describe("Brief 40 Jeffery feed presence", () => {
  it("fresh event (age < 24h) is Online + that Edmonton timestamp", () => {
    const nowMs = Date.parse("2026-08-25T18:00:00.000Z");
    const newest = "2026-08-25T12:12:00.000Z"; // 6:12 AM MDT
    const presence = deriveJefferyFeedPresence(newest, nowMs);
    expect(presence.kind).toBe("online");
    expect(presence.label).toBe("Online · Aug 25, 2026, 6:12 AM");
    expect(presence.newestCreatedAt).toBe(newest);
  });

  it("25 Aug walk: newest 8/19 2:51 AM is Idle, not Online", () => {
    const presence = deriveJefferyFeedPresence(WALK_NEWEST_ISO, WALK_NOW_MS);
    expect(presence.kind).toBe("idle");
    expect(presence.label).toBe("Idle · last event Aug 19, 2026, 2:51 AM");
    expect(presence.label).not.toMatch(/Online/i);
    expect(WALK_NOW_MS - Date.parse(WALK_NEWEST_ISO)).toBeGreaterThan(JEFFERY_ONLINE_MAX_AGE_MS);
  });

  it("empty feed is Idle · no events", () => {
    expect(newestFeedCreatedAt([])).toBeNull();
    const presence = deriveJefferyFeedPresence(null, WALK_NOW_MS);
    expect(presence.kind).toBe("idle");
    expect(presence.label).toBe("Idle · no events");
    expect(presence.newestCreatedAt).toBeNull();
  });

  it("does not invent a tick when there is no row", () => {
    const presence = deriveJefferyFeedPresence(undefined, Date.now());
    expect(presence.newestCreatedAt).toBeNull();
    expect(presence.label).toBe("Idle · no events");
    expect(presence.kind).not.toBe("online");
  });

  it("exactly 24h old is Idle; one ms under is Online", () => {
    const newest = "2026-08-24T18:00:00.000Z";
    const atBoundary = Date.parse(newest) + JEFFERY_ONLINE_MAX_AGE_MS;
    expect(deriveJefferyFeedPresence(newest, atBoundary).kind).toBe("idle");
    expect(deriveJefferyFeedPresence(newest, atBoundary - 1).kind).toBe("online");
  });

  it("picks the newest created_at among the same rows Live Feed lists", () => {
    expect(
      newestFeedCreatedAt([
        { created_at: "2026-08-16T22:47:15.000Z" },
        { created_at: WALK_NEWEST_ISO },
        { created_at: "2026-04-08T20:56:38.000Z" },
      ]),
    ).toBe(WALK_NEWEST_ISO);
  });

  it("formats America/Edmonton without seconds", () => {
    expect(formatJefferyFeedEventTime(WALK_NEWEST_ISO)).toBe("Aug 19, 2026, 2:51 AM");
  });
});

describe("Brief 40 page locks", () => {
  it("header badge is derived from jeffery_messages rows, not a static Online pill", () => {
    const client = read("src/app/(app)/admin/jeffery/JefferyClient.tsx");
    const badge = read("src/components/admin/jeffery/JefferyPresenceBadge.tsx");
    const hook = read("src/components/admin/jeffery/useJefferyLiveFeedMessages.ts");
    const feed = read("src/components/admin/jeffery/LiveFeed.tsx");
    expect(client).toContain("JefferyPresenceBadge");
    expect(client).toContain("newestFeedCreatedAt");
    expect(client).toContain("useJefferyLiveFeedMessages");
    expect(client).not.toContain("Jeffery Online");
    expect(client).toContain("agentRegistry.length");
    expect(hook).toContain('from("jeffery_messages")');
    expect(hook).toContain('order("created_at", { ascending: false })');
    expect(hook).not.toMatch(/createTick|invent.*tick/i);
    expect(client).toContain("messages={messages}");
    expect(feed).toContain("onReload");
    expect(badge).toContain("deriveJefferyFeedPresence");
    expect(badge).not.toContain("Jeffery Online");
  });

  it("does not invent a heartbeat or Grok ops row to stay Online", () => {
    const presence = read("src/lib/jeffery/feedPresence.ts");
    expect(presence).toContain("No synthetic heartbeat");
    expect(presence).not.toMatch(/createTick|invent.*tick/i);
    expect(presence).not.toMatch(/grok/i);
  });
});
