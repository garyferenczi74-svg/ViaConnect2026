// Prompt #118 — feature-flags unit tests.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isFeatureEnabled, FEATURE_FLAG_DEFAULTS } from "@/lib/feature-flags";

describe("isFeatureEnabled — defaults", () => {
  it("BODY_GRAPHICS_V2_ENABLED defaults TRUE", () => {
    expect(FEATURE_FLAG_DEFAULTS.BODY_GRAPHICS_V2_ENABLED).toBe(true);
  });
});

describe("isFeatureEnabled — env override", () => {
  const originalEnv = { ...process.env };
  afterEach(() => { process.env = { ...originalEnv }; });

  it("env 'false' disables", () => {
    process.env.BODY_GRAPHICS_V2_ENABLED = "false";
    expect(isFeatureEnabled("BODY_GRAPHICS_V2_ENABLED")).toBe(false);
  });
  it("env '0' disables", () => {
    process.env.BODY_GRAPHICS_V2_ENABLED = "0";
    expect(isFeatureEnabled("BODY_GRAPHICS_V2_ENABLED")).toBe(false);
  });
  it("env 'true' enables", () => {
    process.env.BODY_GRAPHICS_V2_ENABLED = "true";
    expect(isFeatureEnabled("BODY_GRAPHICS_V2_ENABLED")).toBe(true);
  });
  it("malformed env falls back to default", () => {
    process.env.BODY_GRAPHICS_V2_ENABLED = "banana";
    expect(isFeatureEnabled("BODY_GRAPHICS_V2_ENABLED")).toBe(true);
  });
  it("NEXT_PUBLIC_ prefix also works", () => {
    delete process.env.BODY_GRAPHICS_V2_ENABLED;
    process.env.NEXT_PUBLIC_BODY_GRAPHICS_V2_ENABLED = "false";
    expect(isFeatureEnabled("BODY_GRAPHICS_V2_ENABLED")).toBe(false);
  });
});
