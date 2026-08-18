import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { toSearchResponse } from "../location/search";

const selector = readFileSync(
  resolve(__dirname, "../../components/location/LocationSelector.tsx"),
  "utf8",
);

describe("location fail-open", () => {
  it("maps a timed-out lookup to failOpen with empty items", () => {
    const r = toSearchResponse({ timedOut: true });
    expect(r.failOpen).toBe(true);
    expect(r.items).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("treats failOpen as free-entry on the LocationSelector client path", () => {
    expect(selector).toContain("failOpen");
    expect(selector).toContain("allowFreeEntry");
    expect(selector).toMatch(/countryAllowsFree\s*=\s*failOpen\s*\|\|\s*countryFailOpen/);
    expect(selector).toContain("allowFreeEntry={countryAllowsFree}");
    expect(selector).toContain("allowFreeEntry={subdivisionAllowsFree}");
    expect(selector).toContain("allowFreeEntry={cityAllowsFree}");
  });
});
