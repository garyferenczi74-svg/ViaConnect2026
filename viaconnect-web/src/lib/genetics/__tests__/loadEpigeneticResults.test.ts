// Prompt 204 (2026-06-21): tests for loadEpigeneticResults. A small mock Supabase
// client returns the rows so the grouping (latest per marker), the trend build
// (numeric values across dates, only when more than one), and the fail-open empty
// are exercised without a database.

import { describe, it, expect } from "vitest";
import { loadEpigeneticResults } from "../loadEpigeneticResults";

// The store reads .from(...).select(...).eq(...).order(...) which awaits to
// { data, error }. Build a chain that resolves to the given rows.
function mockSupabase(rows: unknown, error: unknown = null) {
  const result = Promise.resolve({ data: rows, error });
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => result,
  };
  return { from: () => chain };
}

describe("loadEpigeneticResults", () => {
  it("returns the latest reading per marker and builds a numeric trend across dates", async () => {
    // Rows arrive newest first (the query orders measured_on desc).
    const rows = [
      { marker_key: "epigenetic-age", value_num: 52, value_text: null, unit: "years", direction: "higher", confidence: "high", measured_on: "2026-06-01" },
      { marker_key: "epigenetic-age", value_num: 54, value_text: null, unit: "years", direction: "higher", confidence: "high", measured_on: "2025-06-01" },
    ];
    const results = await loadEpigeneticResults(mockSupabase(rows), "u1");
    expect(results).toHaveLength(1);
    const age = results[0];
    expect(age.markerKey).toBe("epigenetic-age");
    // The newest (2026-06-01, value 52) is the current reading.
    expect(age.valueNum).toBe(52);
    expect(age.measuredOn).toBe("2026-06-01");
    // Trend is oldest first.
    expect(age.trend).toEqual([
      { measuredOn: "2025-06-01", valueNum: 54 },
      { measuredOn: "2026-06-01", valueNum: 52 },
    ]);
  });

  it("leaves trend null for a single reading or a non-numeric marker", async () => {
    const rows = [
      { marker_key: "ahrr-combustion-exposure", value_num: null, value_text: "low signal", unit: null, direction: "lower", confidence: "medium", measured_on: "2026-06-01" },
    ];
    const results = await loadEpigeneticResults(mockSupabase(rows), "u1");
    expect(results).toHaveLength(1);
    expect(results[0].valueText).toBe("low signal");
    expect(results[0].valueNum).toBeNull();
    expect(results[0].trend).toBeNull();
  });

  it("fails open to an empty list on a read error", async () => {
    const results = await loadEpigeneticResults(mockSupabase(null, { message: "boom" }), "u1");
    expect(results).toEqual([]);
  });
});
