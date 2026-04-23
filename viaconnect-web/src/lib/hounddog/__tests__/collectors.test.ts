import { describe, it, expect } from "vitest";
import { collectors } from "../collectors";

describe("Collector stubs", () => {
  it("exposes all 14 platform collectors", () => {
    const ids = Object.keys(collectors).sort();
    expect(ids).toEqual(
      [
        "amazon", "ebay", "etsy", "facebook", "instagram", "linkedin", "podcast",
        "reddit", "substack", "tiktok", "walmart", "web", "x", "youtube",
      ].sort(),
    );
  });

  it("each collector returns COLLECTOR_DISABLED when ctx.enabled is false", async () => {
    for (const c of Object.values(collectors)) {
      const r = await c.tick({ enabled: false });
      expect(r.rawSignals).toEqual([]);
      expect(r.errors[0]?.code).toBe("COLLECTOR_DISABLED");
    }
  });

  it("each collector refuses to pretend to collect if flipped on without a real implementation", async () => {
    for (const c of Object.values(collectors)) {
      // Force-enable the stub: ctx.enabled = true + collector.enabled = true.
      (c as unknown as { enabled: boolean }).enabled = true;
      await expect(c.tick({ enabled: true })).rejects.toThrow(/not configured/);
      (c as unknown as { enabled: boolean }).enabled = false;
    }
  });
});
