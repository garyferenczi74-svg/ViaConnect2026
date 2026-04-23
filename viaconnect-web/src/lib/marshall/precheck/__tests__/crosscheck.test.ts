import { describe, it, expect } from "vitest";
import { shiftSeverity, JACCARD_THRESHOLD } from "../crosscheck";

describe("shiftSeverity", () => {
  it("softens one step down", () => {
    expect(shiftSeverity("P1", -1)).toBe("P2");
    expect(shiftSeverity("P0", -1)).toBe("P1");
  });
  it("raises one step up", () => {
    expect(shiftSeverity("P2", +1)).toBe("P1");
    expect(shiftSeverity("ADVISORY", +1)).toBe("P3");
  });
  it("clamps at bounds", () => {
    expect(shiftSeverity("ADVISORY", -5)).toBe("ADVISORY");
    expect(shiftSeverity("P0", +5)).toBe("P0");
  });
});

describe("JACCARD_THRESHOLD", () => {
  it("is 0.85 per the spec", () => {
    expect(JACCARD_THRESHOLD).toBe(0.85);
  });
});
