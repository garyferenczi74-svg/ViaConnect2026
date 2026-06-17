import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const middleware = readFileSync(
  resolve(__dirname, "../../src/lib/supabase/middleware.ts"),
  "utf8"
);
const nextConfig = readFileSync(
  resolve(__dirname, "../../next.config.mjs"),
  "utf8"
);

describe("Prompt 204 legal routes", () => {
  it("allowlists the legal routes and their redirect sources", () => {
    for (const path of [
      "/privacy",
      "/terms",
      "/privacy-policy",
      "/terms-of-service",
      "/tos",
    ]) {
      expect(middleware).toContain(`"${path}"`);
    }
  });

  it("adds permanent redirects to the canonical routes", () => {
    expect(nextConfig).toContain("'/privacy-policy'");
    expect(nextConfig).toContain("'/terms-of-service'");
    expect(nextConfig).toContain("'/tos'");
    expect(nextConfig).toMatch(/destination:\s*'\/privacy'/);
    expect(nextConfig).toMatch(/destination:\s*'\/terms'/);
  });
});
