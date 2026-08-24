// Prompt 204 (2026-06-21): contract tests for the SAMPLE badge and its gated
// mounts. Source-as-text per the repo convention. The badge is a compliance
// guardrail (seeded demo data must be unmistakable), so these lock its presence,
// its neutral non-alarm styling, and that it only renders on the sample flag.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const BADGE = path.resolve(__dirname, "..", "SampleBadge.tsx");
const CARD = path.resolve(__dirname, "..", "..", "shop", "genex360", "EpigeneticInterpretationCard.tsx");
const VARIANTS = path.resolve(__dirname, "..", "hub", "YourVariantsCard.tsx");

describe("SampleBadge source", () => {
  const source = readFileSync(BADGE, "utf-8");

  it("renders the SAMPLE label with a Lucide flask icon at strokeWidth 1.5", () => {
    expect(source).toContain("Sample");
    expect(source).toContain("FlaskConical");
    expect(source).toContain("strokeWidth={1.5}");
  });

  it("is neutral: no alarm or severity color", () => {
    const lower = source.toLowerCase();
    expect(lower).not.toContain("bg-red");
    expect(lower).not.toContain("text-red");
    expect(source).not.toContain("#F87171");
    expect(source).not.toContain("severityToken");
  });

  it("contains no em or en dashes", () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe("SampleBadge is mounted gated on the sample flag", () => {
  it("Your Variants uses VariantRowChip instead of a lone Sample badge", () => {
    const source = readFileSync(VARIANTS, "utf-8");
    expect(source).toContain("import { VariantRowChip }");
    expect(source).toContain("<VariantRowChip");
    expect(source).not.toContain("import { SampleBadge }");
    expect(source).not.toContain("Your variant");
  });

  it("EpigenHQ Your reading renders the badge only when the result isSample", () => {
    const source = readFileSync(CARD, "utf-8");
    expect(source).toContain("import { SampleBadge }");
    expect(source).toContain("result.isSample ? <SampleBadge /> : null");
  });
});
