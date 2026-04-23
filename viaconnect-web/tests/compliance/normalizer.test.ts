// Prompt #113 — Normalizer unit tests.

import { describe, it, expect } from "vitest";
import { normalize, expandContractions, stripHtml, splitSentences, tokenize } from "@/lib/compliance/detector/normalizer";

describe("stripHtml", () => {
  it("removes tags but preserves text", () => {
    expect(stripHtml("<p>hello <b>world</b></p>").trim()).toBe("hello  world");
  });
});

describe("expandContractions", () => {
  it("expands common contractions", () => {
    expect(expandContractions("don't treat it")).toBe("do not treat it");
    expect(expandContractions("can't cure")).toBe("cannot cure");
  });
});

describe("normalize", () => {
  it("lowercases + collapses whitespace", () => {
    expect(normalize("  Treats  Diabetes  ")).toBe("treats diabetes");
  });
  it("removes punctuation but keeps hyphens + apostrophes", () => {
    expect(normalize("it's; covid-19!")).toContain("covid-19");
  });
  it("normalizes em/en dashes to hyphens", () => {
    expect(normalize("covid—19")).toContain("covid-19");
  });
});

describe("splitSentences", () => {
  it("splits on terminal punctuation + uppercase start", () => {
    const s = splitSentences("Cures diabetes. Supports immune function. Prevents cancer.");
    expect(s.length).toBeGreaterThanOrEqual(2);
  });
});

describe("tokenize", () => {
  it("splits on whitespace", () => {
    expect(tokenize("a b c")).toEqual(["a", "b", "c"]);
  });
});
