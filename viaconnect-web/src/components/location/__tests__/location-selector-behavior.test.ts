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
    expect(next).not.toBeNull();
    expect(next?.city).toBe("Tiny Hamlet");
    expect(next?.isFreeEntry).toBe(true);
    expect(next?.countryCode).toBe("US");
    expect(next?.subdivisionCode).toBe("US-NY");
  });

  it("setCity with isFreeEntry false after a free city turns the flag off", () => {
    const freeCity = reduceLocationAction(filled, {
      type: "setCity",
      city: "Tiny Hamlet",
      isFreeEntry: true,
    });
    expect(freeCity?.isFreeEntry).toBe(true);
    const listed = reduceLocationAction(freeCity, {
      type: "setCity",
      city: "Buffalo",
      isFreeEntry: false,
    });
    expect(listed).not.toBeNull();
    expect(listed?.city).toBe("Buffalo");
    expect(listed?.isFreeEntry).toBe(false);
    expect(listed?.countryCode).toBe("US");
  });

  it("setCity and setSubdivision refuse to invent an empty country", () => {
    expect(
      reduceLocationAction(null, {
        type: "setCity",
        city: "Tiny Hamlet",
        isFreeEntry: true,
      }),
    ).toBeNull();
    expect(
      reduceLocationAction(null, {
        type: "setSubdivision",
        subdivision: { value: "US-NY", label: "New York" },
      }),
    ).toBeNull();
    expect(
      reduceLocationAction(
        {
          city: "",
          subdivisionName: null,
          subdivisionCode: null,
          countryName: "",
          countryCode: "",
          isFreeEntry: false,
        },
        { type: "setCity", city: "Buffalo", isFreeEntry: false },
      ),
    ).toBeNull();
  });

  it("keeps isFreeEntry when a listed city follows a free country", () => {
    const next = reduceLocationAction(
      { ...filled, isFreeEntry: true, countryIsFree: true },
      { type: "setCity", city: "Buffalo", isFreeEntry: false },
    );
    expect(next?.city).toBe("Buffalo");
    expect(next?.isFreeEntry).toBe(true);
  });
});

describe("LocationSelector uses reduce and keeps the a11y contract", () => {
  it("calls reduceLocationAction for country, subdivision, and city changes", () => {
    expect(selector).toContain("reduceLocationAction");
    expect(selector).toContain('type: "setCountry"');
    expect(selector).toContain('type: "setSubdivision"');
    expect(selector).toContain('type: "setCity"');
    expect(selector).toContain("if (!payload)");
    expect(selector).toContain("countryIsFree:");
    expect(selector).toContain("subdivisionIsFree:");
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

  it("selects the highlighted option on Tab, then skips typed blur commit", () => {
    const tabAt = combobox.indexOf('event.key === "Tab"');
    expect(tabAt).toBeGreaterThan(-1);
    const tabHandler = combobox.slice(tabAt, tabAt + 280);
    expect(tabHandler).toContain("selectOption(options[activeIndex])");
    expect(tabHandler).toContain("skipBlurCommitRef.current = true");
    expect(combobox).toContain("if (skipBlurCommitRef.current)");
  });
});
