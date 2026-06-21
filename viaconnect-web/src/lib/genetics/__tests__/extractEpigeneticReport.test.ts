// Prompt 204 (2026-06-21): unit tests for the EpigenHQ report extraction mapping.
// The Gemini vision call itself is I/O and not exercised here; these cover the pure
// normalization, mapping, and server-side re-derivation that protect a saved row.

import { describe, it, expect } from "vitest";
import {
  normalizeEpigenDirection,
  mapEpigeneticRows,
  buildEpigeneticMarkerInput,
  type EpigeneticReportRow,
} from "../extractEpigeneticReport";

describe("normalizeEpigenDirection", () => {
  it("maps higher synonyms to higher", () => {
    expect(normalizeEpigenDirection("Elevated")).toBe("higher");
    expect(normalizeEpigenDirection("above range")).toBe("higher");
    expect(normalizeEpigenDirection("Accelerated")).toBe("higher");
  });

  it("maps lower synonyms to lower", () => {
    expect(normalizeEpigenDirection("reduced")).toBe("lower");
    expect(normalizeEpigenDirection("Below the range")).toBe("lower");
    expect(normalizeEpigenDirection("decelerated")).toBe("lower");
  });

  it("maps typical synonyms to typical", () => {
    expect(normalizeEpigenDirection("Normal")).toBe("typical");
    expect(normalizeEpigenDirection("within range")).toBe("typical");
    expect(normalizeEpigenDirection("on track")).toBe("typical");
  });

  it("prefers higher or lower over typical when both words appear", () => {
    expect(normalizeEpigenDirection("above the typical range")).toBe("higher");
  });

  it("returns null for missing or unrecognized text", () => {
    expect(normalizeEpigenDirection(null)).toBeNull();
    expect(normalizeEpigenDirection("")).toBeNull();
    expect(normalizeEpigenDirection("indeterminate")).toBeNull();
  });
});

describe("mapEpigeneticRows", () => {
  it("maps a numeric row and takes the unit from the map, not the page", () => {
    const rows: EpigeneticReportRow[] = [
      { marker: "Epigenetic Age", value: "42.3", unit: "yrs", direction: "Accelerated" },
    ];
    expect(mapEpigeneticRows(rows)).toEqual([
      {
        markerKey: "epigenetic-age",
        displayName: "Epigenetic Age",
        valueNum: 42.3,
        valueText: null,
        unit: "years",
        direction: "higher",
      },
    ]);
  });

  it("keeps a non-numeric reading as text and respects a null-unit marker", () => {
    const rows: EpigeneticReportRow[] = [
      { marker: "Inflammatory Methylation Index", value: "Elevated", unit: null, direction: "higher" },
    ];
    const out = mapEpigeneticRows(rows);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      markerKey: "inflammatory-methylation-index",
      valueNum: null,
      valueText: "Elevated",
      unit: null,
      direction: "higher",
    });
  });

  it("drops unknown labels and rows with no reading", () => {
    const rows: EpigeneticReportRow[] = [
      { marker: "Some Unlisted Marker", value: "10", unit: null, direction: null },
      { marker: "Pace of Aging", value: "", unit: null, direction: null },
    ];
    expect(mapEpigeneticRows(rows)).toEqual([]);
  });

  it("dedupes by marker key, first reading wins", () => {
    const rows: EpigeneticReportRow[] = [
      { marker: "Epigenetic Age", value: "41", unit: null, direction: null },
      { marker: "DNAm Age", value: "99", unit: null, direction: null },
    ];
    const out = mapEpigeneticRows(rows);
    expect(out).toHaveLength(1);
    expect(out[0].valueNum).toBe(41);
  });
});

describe("buildEpigeneticMarkerInput (confirm re-derivation)", () => {
  it("builds an input with the unit from the map and a normalized direction", () => {
    expect(buildEpigeneticMarkerInput("pace-of-aging", 1.05, null, "Accelerated")).toEqual({
      markerKey: "pace-of-aging",
      valueNum: 1.05,
      valueText: null,
      unit: "years per year",
      direction: "higher",
    });
  });

  it("rejects an unknown key", () => {
    expect(buildEpigeneticMarkerInput("not-a-marker", 1, null, null)).toBeNull();
  });

  it("rejects a row with no numeric and no text reading", () => {
    expect(buildEpigeneticMarkerInput("epigenetic-age", null, "   ", null)).toBeNull();
  });

  it("ignores a non-finite value and keeps text instead", () => {
    expect(buildEpigeneticMarkerInput("global-dna-methylation-status", Number.NaN, "Hypomethylated", "lower")).toEqual({
      markerKey: "global-dna-methylation-status",
      valueNum: null,
      valueText: "Hypomethylated",
      unit: null,
      direction: "lower",
    });
  });
});
