/**
 * Hormones hub chip: lab dates only, never fabricate.
 */

import { describe, expect, it } from "vitest";
import {
  formatHormoneLabChipDate,
  pickLatestHormoneLabDate,
  resolveHormonesReportChip,
} from "../hormonesHubChip";

describe("hormonesHubChip", () => {
  it("picks the latest hormone-like measured_at", () => {
    const iso = pickLatestHormoneLabDate([
      { biomarker: "Glucose", measured_at: "2026-08-10T12:00:00Z" },
      { biomarker: "Total Testosterone", measured_at: "2026-07-01T12:00:00Z" },
      { biomarker: "Estradiol", measured_at: "2026-08-05T12:00:00Z" },
      { biomarker: "TSH", measured_at: null },
    ]);
    expect(iso).toBe("2026-08-05T12:00:00Z");
  });

  it("returns undefined when no hormone-like dated labs exist", () => {
    expect(
      resolveHormonesReportChip([
        { biomarker: "Glucose", measured_at: "2026-08-10T12:00:00Z" },
        { biomarker: "Estradiol", measured_at: null },
      ]),
    ).toBeUndefined();
  });

  it("formats UTC calendar date for the chip", () => {
    expect(formatHormoneLabChipDate("2026-08-01T23:30:00Z")).toBe("Aug 1");
    expect(formatHormoneLabChipDate("not-a-date")).toBeUndefined();
  });

  it("resolves chip value from hormone lab date only", () => {
    expect(
      resolveHormonesReportChip([
        { biomarker: "Free T3", measured_at: "2026-03-15T08:00:00Z" },
      ]),
    ).toBe("Mar 15");
  });
});
