// Prompt 204 (2026-06-21): tests for the EpigenHQ marker registry. The most
// important invariant is consistency with the interpretations: the result
// pipeline keys and display names MUST match the interpretation keys and marker
// names, or the per-marker result lookup silently misses.

import { describe, it, expect } from "vitest";
import {
  EPIGEN_MARKERS,
  EPIGEN_MARKER_KEYS,
  epigenMarkerByKey,
  epigenMarkerKeyFor,
  epigenKeyForDisplayName,
} from "../epigenMarkerMap";
import { EPIGEN_HQ_INTERPRETATIONS_DRAFT } from "@/data/genex360/epigen-hq-interpretations.draft";

describe("EPIGEN_MARKERS registry", () => {
  it("covers exactly the 12 EpigenHQ interpretation keys", () => {
    expect([...EPIGEN_MARKER_KEYS].sort()).toEqual(
      Object.keys(EPIGEN_HQ_INTERPRETATIONS_DRAFT).sort(),
    );
  });

  it("display names match the interpretation marker names (the lookup join)", () => {
    for (const entry of EPIGEN_MARKERS) {
      const interpretation = EPIGEN_HQ_INTERPRETATIONS_DRAFT[entry.key];
      expect(interpretation, `${entry.key} has an interpretation`).toBeDefined();
      expect(entry.displayName).toBe(interpretation.marker);
    }
  });

  it("every entry has at least one alias and a non-empty key", () => {
    for (const entry of EPIGEN_MARKERS) {
      expect(entry.key.length).toBeGreaterThan(0);
      expect(entry.aliases.length).toBeGreaterThan(0);
      for (const alias of entry.aliases) {
        expect(alias).toBe(alias.toLowerCase());
      }
    }
  });

  it("resolves a raw label to a key via aliases, longest alias winning", () => {
    expect(epigenMarkerKeyFor("Your Epigenetic Age")).toBe("epigenetic-age");
    expect(epigenMarkerKeyFor("AHRR combustion exposure signature")).toBe("ahrr-combustion-exposure");
    expect(epigenMarkerKeyFor("DunedinPACE pace of aging")).toBe("pace-of-aging");
    expect(epigenMarkerKeyFor("nothing relevant here")).toBeNull();
    expect(epigenMarkerKeyFor("")).toBeNull();
  });

  it("resolves a key from an exact display name", () => {
    expect(epigenKeyForDisplayName("Epigenetic Age")).toBe("epigenetic-age");
    expect(epigenKeyForDisplayName("Stress and Cortisol Exposure Methylation")).toBe(
      "stress-cortisol-exposure-methylation",
    );
    expect(epigenKeyForDisplayName("Not A Marker")).toBeNull();
  });

  it("epigenMarkerByKey round-trips", () => {
    expect(epigenMarkerByKey("telomere-associated-methylation")?.displayName).toBe(
      "Telomere Associated Methylation",
    );
    expect(epigenMarkerByKey("nope")).toBeNull();
  });
});
