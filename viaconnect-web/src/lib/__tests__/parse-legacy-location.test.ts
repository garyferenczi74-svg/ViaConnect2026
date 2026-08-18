import { describe, expect, it } from "vitest";
import { parseLegacyLocation } from "../location/parse-legacy";

describe("parseLegacyLocation", () => {
  it("parses City, ST", () => {
    expect(parseLegacyLocation("Buffalo, NY")).toEqual({
      kind: "city_st",
      city: "Buffalo",
      st: "NY",
    });
  });
  it("treats a bare city as plain", () => {
    expect(parseLegacyLocation("Buffalo")).toEqual({ kind: "plain", city: "Buffalo" });
  });
  it("treats blank as empty", () => {
    expect(parseLegacyLocation("   ")).toEqual({ kind: "empty" });
  });
});
