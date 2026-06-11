import { describe, it, expect } from "vitest";
import { getDisplayName, isKnownSlug } from "../getDisplayName";

describe("getDisplayName", () => {
  it("resolves the canonical gordon slug to Gordon", () => {
    expect(getDisplayName("gordon")).toBe("Gordon");
  });

  it("is case insensitive for gordon", () => {
    expect(getDisplayName("GORDON")).toBe("Gordon");
  });

  it("returns the raw slug for an unknown key", () => {
    expect(getDisplayName("nobody")).toBe("nobody");
  });
});

describe("isKnownSlug", () => {
  it("recognizes gordon as a known slug", () => {
    expect(isKnownSlug("gordon")).toBe(true);
  });
});
