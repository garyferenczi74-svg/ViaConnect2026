// Prompt #118 — color-scale unit tests.

import { describe, it, expect } from "vitest";
import { colorFromValue, colorScale, alphaFill, STATUS_COLORS } from "@/components/body-tracker/body-graphic/utils/color-scale";

describe("colorFromValue", () => {
  it("returns slate for value 0 (no/low data)", () => {
    expect(colorFromValue(0)).toBe("#475569");
  });
  it("returns orange-adjacent for value 0.9+ (high, case-insensitive compare)", () => {
    expect(colorFromValue(0.9).toLowerCase()).toBe("#b75e18");
  });
  it("clamps values above 1", () => {
    expect(colorFromValue(1.5).toLowerCase()).toBe("#b75e18");
  });
  it("clamps values below 0", () => {
    expect(colorFromValue(-0.5)).toBe("#475569");
  });
  it("produces a hex string of length 7 for a mid value", () => {
    const c = colorFromValue(0.45);
    expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("colorScale with HealthStatus override", () => {
  it("prefers status over value when both given", () => {
    expect(colorScale(0.9, "healthy")).toBe(STATUS_COLORS.healthy);
    expect(colorScale(0.1, "alert")).toBe(STATUS_COLORS.alert);
  });
  it("falls back to no-data when value undefined + no status", () => {
    expect(colorScale(undefined)).toBe(STATUS_COLORS["no-data"]);
  });
  it("uses value when no status", () => {
    expect(colorScale(0.9).toLowerCase()).toBe("#b75e18");
  });
});

describe("alphaFill", () => {
  it("renders rgba with correct alpha", () => {
    expect(alphaFill("#2DA5A0", 0.5)).toBe("rgba(45, 165, 160, 0.500)");
  });
  it("clamps alpha to [0,1]", () => {
    expect(alphaFill("#FFFFFF", 2)).toContain("1.000");
    expect(alphaFill("#FFFFFF", -1)).toContain("0.000");
  });
});

describe("STATUS_COLORS palette", () => {
  it("healthy is teal", () => { expect(STATUS_COLORS.healthy).toBe("#2DA5A0"); });
  it("caution is orange", () => { expect(STATUS_COLORS.caution).toBe("#B75E18"); });
  it("alert is crimson", () => { expect(STATUS_COLORS.alert).toBe("#C94040"); });
  it("no-data is slate", () => { expect(STATUS_COLORS["no-data"]).toBe("#475569"); });
});
