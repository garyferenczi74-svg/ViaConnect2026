import { describe, it, expect } from "vitest";
import { computeStanding } from "../strikes";

describe("computeStanding", () => {
  it("0 active -> good_standing", () => {
    expect(computeStanding(0)).toBe("good_standing");
  });
  it("1 active -> one_active", () => {
    expect(computeStanding(1)).toBe("one_active");
  });
  it("2 active -> two_active", () => {
    expect(computeStanding(2)).toBe("two_active");
  });
  it("3+ active -> review_hold (never auto-terminate)", () => {
    expect(computeStanding(3)).toBe("review_hold");
    expect(computeStanding(4)).toBe("review_hold");
  });
});
