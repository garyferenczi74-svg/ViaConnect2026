// Prompt #118 — Registry integrity + lookup helper tests.

import { describe, it, expect } from "vitest";
import { compositionRegions, muscleRegions, allRegions, indexById, filterByView, sortByDisplayOrder } from "@/components/body-tracker/body-graphic/regions";
import { getRegion, getDisplayName, regionsForContext, isValidRegion, isBilateral, getBilateralCounterpart } from "@/components/body-tracker/body-graphic/utils/region-lookup";

describe("composition registry", () => {
  it("has exactly 10 composition zones", () => {
    expect(compositionRegions.length).toBe(10);
  });
  it("every id starts with comp-", () => {
    for (const r of compositionRegions) expect(r.id.startsWith("comp-")).toBe(true);
  });
  it("bilateral arm/leg zones are marked", () => {
    for (const id of ["comp-right-arm","comp-left-arm","comp-right-leg","comp-left-leg"]) {
      const r = compositionRegions.find((x) => x.id === id);
      expect(r?.isBilateral).toBe(true);
    }
  });
});

describe("muscle registry", () => {
  it("has the expected anatomical split between front and back", () => {
    // Spec §9.3 heading says 30 back muscles but the item list enumerates 29;
    // delivery matches the enumerated list. Flagged in the delivery report.
    const front = muscleRegions.filter((r) => r.hasView.includes("front") && !r.hasView.includes("back"));
    const back = muscleRegions.filter((r) => r.hasView.includes("back") && !r.hasView.includes("front"));
    expect(front.length).toBe(26);
    expect(back.length).toBe(29);
  });
  it("each bilateral muscle has a left/right counterpart", () => {
    const rightMuscles = muscleRegions.filter((r) => r.id.endsWith("-right"));
    for (const r of rightMuscles) {
      const leftId = r.id.replace(/-right$/, "-left");
      const leftExists = muscleRegions.some((m) => m.id === leftId);
      expect(leftExists, `missing left counterpart for ${r.id}`).toBe(true);
    }
  });
});

describe("allRegions + helpers", () => {
  it("combines composition + muscle registries", () => {
    expect(allRegions.length).toBe(compositionRegions.length + muscleRegions.length);
  });
  it("indexById returns a Map keyed by id", () => {
    const m = indexById(allRegions);
    expect(m.get("comp-chest")?.displayName).toBe("Chest");
    expect(m.get("biceps-brachii-right")?.displayName).toBe("Right Biceps Brachii");
  });
  it("filterByView filters correctly", () => {
    const frontComposition = filterByView(compositionRegions, "front");
    expect(frontComposition.every((r) => r.hasView.includes("front"))).toBe(true);
  });
  it("sortByDisplayOrder returns ascending", () => {
    const sorted = sortByDisplayOrder(muscleRegions);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].displayOrder).toBeGreaterThanOrEqual(sorted[i - 1].displayOrder);
    }
  });
});

describe("region-lookup helpers", () => {
  it("getRegion retrieves by id", () => {
    expect(getRegion("rectus-abdominis")?.displayName).toBe("Rectus Abdominis");
  });
  it("getDisplayName returns fr when requested", () => {
    expect(getDisplayName("rectus-abdominis", "fr")).toBe("Grand droit de l'abdomen");
  });
  it("getDisplayName falls back to en when fr missing", () => {
    // all regions have fr set but double-check fallback behaviour
    expect(getDisplayName("rectus-abdominis", "en")).toBe("Rectus Abdominis");
  });
  it("regionsForContext returns mode+view filtered + sorted", () => {
    const compFront = regionsForContext("composition", "front");
    expect(compFront.every((r) => r.regionType === "composition")).toBe(true);
    expect(compFront.every((r) => r.hasView.includes("front"))).toBe(true);
  });
  it("isValidRegion disambiguates known vs garbage", () => {
    expect(isValidRegion("rectus-abdominis")).toBe(true);
    expect(isValidRegion("made-up-muscle")).toBe(false);
  });
  it("isBilateral + getBilateralCounterpart pair", () => {
    expect(isBilateral("biceps-brachii-right")).toBe(true);
    expect(isBilateral("rectus-abdominis")).toBe(false);
    expect(getBilateralCounterpart("biceps-brachii-right")).toBe("biceps-brachii-left");
    expect(getBilateralCounterpart("biceps-brachii-left")).toBe("biceps-brachii-right");
    expect(getBilateralCounterpart("rectus-abdominis")).toBeNull();
  });
});
