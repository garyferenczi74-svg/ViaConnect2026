/**
 * Prompt 219g durable Firecrawl day-cap.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  DAY_CAP_READ_FAILURE_MAX_CREDITS,
  createDayAwareBudget,
  getUtcDayCreditsUsed,
  type DayCapAdmin,
} from "../dayCap";

function mockAdmin(opts: {
  rows?: Array<{ credits_used: number }>;
  error?: { message: string } | null;
  throwOnSelect?: boolean;
}): DayCapAdmin {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: async () => {
            if (opts.throwOnSelect) throw new Error("network_down");
            return {
              data: opts.error ? null : (opts.rows ?? []),
              error: opts.error ?? null,
            };
          },
        }),
      }),
    }),
  };
}

describe("getUtcDayCreditsUsed", () => {
  const prevCredits = process.env.FIRECRAWL_MAX_CREDITS_PER_DAY;

  beforeEach(() => {
    process.env.FIRECRAWL_MAX_CREDITS_PER_DAY = "200";
  });

  afterEach(() => {
    if (prevCredits === undefined) delete process.env.FIRECRAWL_MAX_CREDITS_PER_DAY;
    else process.env.FIRECRAWL_MAX_CREDITS_PER_DAY = prevCredits;
  });

  it("sums ledger credits for the UTC day", async () => {
    const snap = await getUtcDayCreditsUsed(
      mockAdmin({ rows: [{ credits_used: 10 }, { credits_used: 5 }] }),
      "2026-08-22",
    );
    expect(snap.ok).toBe(true);
    expect(snap.used).toBe(15);
    expect(snap.ceiling).toBe(200);
    expect(snap.remaining).toBe(185);
  });

  it("returns remaining 0 when used >= ceiling", async () => {
    const snap = await getUtcDayCreditsUsed(
      mockAdmin({ rows: [{ credits_used: 200 }] }),
      "2026-08-22",
    );
    expect(snap.remaining).toBe(0);
    expect(snap.used).toBe(200);
  });

  it("clamps remaining on read error (never unlocks full ceiling)", async () => {
    const snap = await getUtcDayCreditsUsed(
      mockAdmin({ error: { message: "relation missing" } }),
      "2026-08-22",
    );
    expect(snap.ok).toBe(false);
    expect(snap.remaining).toBe(DAY_CAP_READ_FAILURE_MAX_CREDITS);
    expect(snap.remaining).toBeLessThanOrEqual(10);
  });
});

describe("createDayAwareBudget", () => {
  const prevCredits = process.env.FIRECRAWL_MAX_CREDITS_PER_DAY;
  const prevPages = process.env.FIRECRAWL_MAX_PAGES_PER_RUN;

  beforeEach(() => {
    process.env.FIRECRAWL_MAX_CREDITS_PER_DAY = "200";
    process.env.FIRECRAWL_MAX_PAGES_PER_RUN = "25";
  });

  afterEach(() => {
    if (prevCredits === undefined) delete process.env.FIRECRAWL_MAX_CREDITS_PER_DAY;
    else process.env.FIRECRAWL_MAX_CREDITS_PER_DAY = prevCredits;
    if (prevPages === undefined) delete process.env.FIRECRAWL_MAX_PAGES_PER_RUN;
    else process.env.FIRECRAWL_MAX_PAGES_PER_RUN = prevPages;
  });

  it("used=0 → maxCredits=200, hitBudget=false", async () => {
    const b = await createDayAwareBudget(mockAdmin({ rows: [] }), {
      dayKey: "2026-08-22",
    });
    expect(b.maxCredits).toBe(200);
    expect(b.maxPages).toBe(25);
    expect(b.hitBudget).toBe(false);
    expect(b.creditsUsed).toBe(0);
  });

  it("used=195 → maxCredits=5", async () => {
    const b = await createDayAwareBudget(
      mockAdmin({ rows: [{ credits_used: 100 }, { credits_used: 95 }] }),
      { dayKey: "2026-08-22" },
    );
    expect(b.maxCredits).toBe(5);
    expect(b.hitBudget).toBe(false);
  });

  it("used>=200 → maxCredits=0 and hitBudget=true", async () => {
    const b = await createDayAwareBudget(
      mockAdmin({ rows: [{ credits_used: 210 }] }),
      { dayKey: "2026-08-22" },
    );
    expect(b.maxCredits).toBe(0);
    expect(b.hitBudget).toBe(true);
  });

  it("read failure → maxCredits <= 10, never 200", async () => {
    const b = await createDayAwareBudget(
      mockAdmin({ throwOnSelect: true }),
      { dayKey: "2026-08-22" },
    );
    expect(b.maxCredits).toBeLessThanOrEqual(DAY_CAP_READ_FAILURE_MAX_CREDITS);
    expect(b.maxCredits).toBeLessThan(200);
    expect(b.dayCap.ok).toBe(false);
  });
});
