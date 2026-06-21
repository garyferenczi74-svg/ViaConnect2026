// Prompt 204 (2026-06-20): contract tests for the EpigenHQ interpretation card and
// its mount in PanelMarkerGroup. Source-as-text per the repo convention.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const CARD = path.resolve(__dirname, "..", "EpigeneticInterpretationCard.tsx");
const GROUP = path.resolve(__dirname, "..", "PanelMarkerGroup.tsx");

describe("EpigeneticInterpretationCard source", () => {
  const source = readFileSync(CARD, "utf-8");

  it("renders all four interpretation fields", () => {
    expect(source).toContain("interpretation.measures");
    expect(source).toContain("interpretation.higherSuggests");
    expect(source).toContain("interpretation.lowerSuggests");
    expect(source).toContain("interpretation.wellnessNote");
  });

  it("labels the higher and lower readings as directions, not verdicts", () => {
    expect(source).toContain("A higher reading");
    expect(source).toContain("A lower reading");
  });

  it("carries the non-diagnostic qualifier and no genotype/severity framing", () => {
    expect(source).toContain("Educational reference, not a diagnosis");
    // It is the interpretation layer only: no genotype table, no severity tier.
    expect(source).not.toContain("severityToken");
    expect(source).not.toContain("StatusChip");
    expect(source).not.toContain("keyVariants");
  });

  it("uses Lucide icons at strokeWidth 1.5 and no alarm color", () => {
    expect(source).toContain("strokeWidth={1.5}");
    expect(source).toContain('from "lucide-react"');
    expect(source.toLowerCase()).not.toContain("bg-red");
    expect(source.toLowerCase()).not.toContain("text-red");
  });

  it("uses tokens only (teal accent, navy card), no inline severity hex", () => {
    expect(source).toContain("#2DA5A0");
    expect(source).not.toContain("#F87171");
    expect(source).not.toContain("#FBBF24");
    expect(source).not.toContain("#4ADE80");
  });

  it("contains no em or en dashes", () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe("PanelMarkerGroup mounts the interpretation card", () => {
  const source = readFileSync(GROUP, "utf-8");

  it("renders the EpigeneticInterpretationCard for a marker with an interpretation", () => {
    expect(source).toContain(
      'import { EpigeneticInterpretationCard } from "./EpigeneticInterpretationCard"',
    );
    expect(source).toContain("marker.epigeneticInterpretation ?");
    expect(source).toContain(
      "<EpigeneticInterpretationCard interpretation={marker.epigeneticInterpretation} />",
    );
  });

  it("keeps the order: deepReport tabs, else interpretation card, else description", () => {
    // The accordion body is the chain deepReport ? tabs : interpretation ? card :
    // description. Use lastIndexOf for the description so we match the accordion
    // fallback, not the earlier non-island static fallback.
    const deepIdx = source.indexOf("marker.deepReport ?");
    const interpIdx = source.indexOf("marker.epigeneticInterpretation ?");
    const descIdx = source.lastIndexOf("{marker.description}</p>");
    expect(deepIdx).toBeGreaterThan(-1);
    expect(interpIdx).toBeGreaterThan(deepIdx);
    expect(descIdx).toBeGreaterThan(interpIdx);
  });
});
