import { describe, expect, it } from "vitest";
import { formatStructuredLocation } from "../location/format";

describe("formatStructuredLocation", () => {
  it("formats city, code, country", () => {
    expect(
      formatStructuredLocation({
        city: "Buffalo",
        subdivisionName: "New York",
        subdivisionCode: "US-NY",
        countryName: "United States",
        countryCode: "US",
        isFreeEntry: false,
      }),
    ).toBe("Buffalo, NY, United States");
  });
  it("omits missing subdivision", () => {
    expect(
      formatStructuredLocation({
        city: "Singapore",
        subdivisionName: null,
        subdivisionCode: null,
        countryName: "Singapore",
        countryCode: "SG",
        isFreeEntry: false,
      }),
    ).toBe("Singapore, Singapore");
  });
  it("returns empty string for null", () => {
    expect(formatStructuredLocation(null)).toBe("");
  });
});
