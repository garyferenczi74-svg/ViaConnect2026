// Prompt: GeneX360 purchase seeding, Slice 2 Task 2. These tests prove the
// curated SAMPLE dataset is drawn ONLY from existing validated content: every
// seeded rsID is a real rsID that appears in that panel's marker data in
// src/data/genex360/panels.ts (no invented rsIDs), every epigenetic markerKey is
// a real EpigenHQ key with its real unit, and no display string carries an em or
// en dash.
//
// Standing rules honored: no em or en dashes, TypeScript strict (no any).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  SAMPLE_VARIANTS,
  SAMPLE_EPIGEN,
  SAMPLE_PANEL_KEYS,
  type SampleVariant,
} from "../samplePanelData";
import { PANEL_LABELS, type PanelKey } from "@/lib/genetics/panelLabels";
import { PANEL_BY_SLUG } from "@/data/genex360/panels";
import { EPIGEN_MARKER_KEYS, epigenMarkerByKey } from "@/lib/genetics/epigenMarkerMap";
import { severityFor } from "@/lib/genetics/variantSeverity";

// The five genotype panel_keys the sample variants cover. Epigenetic is measured,
// not a genotype, and is handled by SAMPLE_EPIGEN, so it MUST NOT appear here.
const GENOTYPE_PANEL_KEYS: PanelKey[] = [
  "methylation",
  "nutrition",
  "hormone",
  "peptide",
  "cannabis",
];

// Build the set of REAL rsIDs that appear in a panel's marker data (every
// marker.deepReport.keyVariants[].rsid). This is the authoritative source the
// sample data must draw from, so membership here proves no rsID was invented.
function realRsidsForSlug(slug: string): Set<string> {
  const panel = PANEL_BY_SLUG[slug as keyof typeof PANEL_BY_SLUG];
  const rsids = new Set<string>();
  if (!panel) return rsids;
  for (const group of panel.groups) {
    for (const marker of group.markers) {
      const keyVariants = marker.deepReport?.keyVariants ?? [];
      for (const kv of keyVariants) {
        if (kv.rsid) rsids.add(kv.rsid.toLowerCase());
      }
    }
  }
  return rsids;
}

describe("SAMPLE_VARIANTS", () => {
  it("covers exactly the five genotype panel_keys (never epigenetic)", () => {
    const covered = new Set(SAMPLE_VARIANTS.map((v) => v.panel_key));
    expect([...covered].sort()).toEqual([...GENOTYPE_PANEL_KEYS].sort());
    expect(covered.has("epigenetic")).toBe(false);
  });

  it("declares the covered panel_keys in SAMPLE_PANEL_KEYS", () => {
    expect([...SAMPLE_PANEL_KEYS].sort()).toEqual([...GENOTYPE_PANEL_KEYS].sort());
  });

  it("has roughly 3 to 5 variants per covered panel", () => {
    for (const key of GENOTYPE_PANEL_KEYS) {
      const count = SAMPLE_VARIANTS.filter((v) => v.panel_key === key).length;
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(5);
    }
  });

  it("uses only real rsIDs that appear in that panel's marker data", () => {
    for (const variant of SAMPLE_VARIANTS) {
      const slug = PANEL_LABELS[variant.panel_key as PanelKey].slug;
      const real = realRsidsForSlug(slug);
      // Format gate AND the stronger membership gate: the rsID must actually be in
      // the panel's validated marker data, proving it was not invented.
      expect(variant.rsid).toMatch(/^rs\d+$/);
      expect(real.has(variant.rsid.toLowerCase())).toBe(true);
    }
  });

  it("scores at least one severity tier across the dataset", () => {
    const scored = SAMPLE_VARIANTS.filter((variant) => {
      const slug = PANEL_LABELS[variant.panel_key as PanelKey].slug;
      return severityFor(slug, variant.rsid, variant.genotype) !== null;
    });
    expect(scored.length).toBeGreaterThan(0);
  });

  it("carries a non-empty gene symbol and a genotype on every variant", () => {
    for (const variant of SAMPLE_VARIANTS) {
      expect(variant.gene.trim().length).toBeGreaterThan(0);
      expect(variant.genotype.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("SAMPLE_EPIGEN", () => {
  it("covers all 12 EpigenHQ marker keys", () => {
    const keys = SAMPLE_EPIGEN.map((m) => m.markerKey).sort();
    expect(keys).toEqual([...EPIGEN_MARKER_KEYS].sort());
  });

  it("uses each marker's real unit from the EpigenHQ map", () => {
    for (const marker of SAMPLE_EPIGEN) {
      const entry = epigenMarkerByKey(marker.markerKey);
      expect(entry).not.toBeNull();
      expect(marker.unit).toEqual(entry?.unit ?? null);
    }
  });

  it("supplies a numeric value for numeric markers and a level word otherwise", () => {
    for (const marker of SAMPLE_EPIGEN) {
      const entry = epigenMarkerByKey(marker.markerKey);
      if (entry?.unit) {
        expect(typeof marker.valueNum).toBe("number");
      } else {
        expect(marker.valueNum).toBeNull();
        expect((marker.valueText ?? "").trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("uses a valid direction on every marker", () => {
    for (const marker of SAMPLE_EPIGEN) {
      expect(["higher", "lower", "typical"]).toContain(marker.direction);
    }
  });
});

describe("data file hygiene", () => {
  it("contains no em or en dashes", () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const dataPath = path.join(here, "..", "samplePanelData.ts");
    const text = readFileSync(dataPath, "utf8");
    expect(text.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(text.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

// Keep the imported type referenced so the test fails loudly if it is removed.
export type _SampleVariant = SampleVariant;
