import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { reduceLocationAction } from "../../../lib/location/reduce";
import type { StructuredLocation } from "../../../lib/location/types";
import { freeEntryOptionLabel } from "../TypeaheadCombobox";

const filled: StructuredLocation = {
  city: "Buffalo",
  subdivisionName: "New York",
  subdivisionCode: "US-NY",
  countryName: "United States",
  countryCode: "US",
  isFreeEntry: false,
};

const selector = readFileSync(
  resolve(__dirname, "../LocationSelector.tsx"),
  "utf8",
);
const combobox = readFileSync(
  resolve(__dirname, "../TypeaheadCombobox.tsx"),
  "utf8",
);

describe("reduceLocationAction", () => {
  it("setCountry clears subdivision and city", () => {
    const next = reduceLocationAction(filled, {
      type: "setCountry",
      country: { value: "CA", label: "Canada" },
    });
    expect(next.countryCode).toBe("CA");
    expect(next.countryName).toBe("Canada");
    expect(next.subdivisionName).toBeNull();
    expect(next.subdivisionCode).toBeNull();
    expect(next.city).toBe("");
    expect(next.isFreeEntry).toBe(false);
  });

  it("setSubdivision clears city and keeps country", () => {
    const next = reduceLocationAction(filled, {
      type: "setSubdivision",
      subdivision: { value: "US-WY", label: "Wyoming" },
    });
    expect(next.subdivisionCode).toBe("US-WY");
    expect(next.subdivisionName).toBe("Wyoming");
    expect(next.city).toBe("");
    expect(next.countryCode).toBe("US");
    expect(next.countryName).toBe("United States");
  });

  it("choosing Use 'Tiny Hamlet' sets isFreeEntry true and city Tiny Hamlet", () => {
    const query = "Tiny Hamlet";
    expect(freeEntryOptionLabel(query)).toBe("Use 'Tiny Hamlet'");
    const next = reduceLocationAction(filled, {
      type: "setCity",
      city: query,
      isFreeEntry: true,
    });
    expect(next.city).toBe("Tiny Hamlet");
    expect(next.isFreeEntry).toBe(true);
    expect(next.countryCode).toBe("US");
    expect(next.subdivisionCode).toBe("US-NY");
  });
});

describe("LocationSelector uses reduce and keeps the a11y contract", () => {
  it("calls reduceLocationAction for country, subdivision, and city changes", () => {
    expect(selector).toContain("reduceLocationAction");
    expect(selector).toContain('type: "setCountry"');
    expect(selector).toContain('type: "setSubdivision"');
    expect(selector).toContain('type: "setCity"');
  });

  it("keeps combobox roles and Hannah free-entry copy", () => {
    expect(combobox).toContain('role="combobox"');
    expect(combobox).toContain('role="listbox"');
    expect(combobox).toContain('role="option"');
    expect(combobox).toContain("aria-expanded");
    expect(combobox).toContain("aria-controls");
    expect(combobox).toContain("aria-activedescendant");
    expect(combobox).toContain("freeEntryOptionLabel");
    expect(selector).not.toMatch(/\u2014|\u2013/);
    expect(combobox).not.toMatch(/\u2014|\u2013/);
  });
});
