import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = () =>
  readFileSync(
    resolve(__dirname, "../../src/app/(app)/(consumer)/plugins/page.tsx"),
    "utf8"
  );

const displayName = () =>
  readFileSync(resolve(__dirname, "../../src/lib/getDisplayName.ts"), "utf8");

describe("Connected Sources bento redesign (Prompt 205)", () => {
  it("imports and uses BentoTile and getDisplayName", () => {
    const src = page();
    expect(src).toContain("BentoTile");
    expect(src).toContain("@/components/ui/BentoTile");
    expect(src).toContain("getDisplayName");
    expect(src).toContain("@/lib/getDisplayName");
  });

  it("wraps agent names through getDisplayName and never prints a bare 'Powered by Jeffery'", () => {
    const src = page();
    expect(src).toContain("getDisplayName('jeffery')");
    expect(src).toContain("getDisplayName('aria')");
    expect(src).not.toContain("Powered by Jeffery");
  });

  it("preserves all category and management hrefs", () => {
    const src = page();
    expect(src).toContain("/plugins/wearables");
    expect(src).toContain("/plugins/apps");
    expect(src).toContain("/plugins/labs");
    expect(src).toContain("/plugins/manage");
  });

  it("uses a 12 column bento grid", () => {
    expect(page()).toContain("lg:grid-cols-12");
  });

  it("hardens the request persistence with withTimeout and safeLog", () => {
    const src = page();
    expect(src).toContain("withTimeout(");
    expect(src).toContain("safeLog");
  });

  it("contains no em-dash or en-dash characters", () => {
    const src = page();
    const emDash = String.fromCharCode(0x2014);
    const enDash = String.fromCharCode(0x2013);
    expect(src).not.toContain(emDash);
    expect(src).not.toContain(enDash);
  });

  it("preserves the live community state and hardcoded active connections", () => {
    const src = page();
    expect(src).toContain("communityPlugins");
    expect(src).toContain("activeConnections");
  });

  it("registers the aria entry in getDisplayName", () => {
    expect(displayName()).toContain("aria:");
  });
});
