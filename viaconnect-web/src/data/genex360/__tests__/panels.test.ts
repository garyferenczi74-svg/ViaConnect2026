// Prompt 193 (2026-06-12): data integrity tests for the GENEX360 panel copy.
// These validate the verbatim transcription mechanically: marker counts match
// their labels, slugs and order are exact, the locked bioavailability and
// brand rules hold, and no em or en dashes slipped in.

import { describe, it, expect } from "vitest";
import { GENEX360_PANELS, PANEL_BY_SLUG, PANEL_SLUGS } from "../panels";
import type { Panel, PanelSlug } from "../types";

const EXPECTED_ORDER: PanelSlug[] = [
  "genex-m",
  "nutrigen-dx",
  "hormone-iq",
  "epigen-hq",
  "peptide-iq",
  "cannabis-iq",
];

const EXPECTED_COUNT: Record<PanelSlug, number> = {
  "genex-m": 20,
  "nutrigen-dx": 27,
  "hormone-iq": 29,
  "epigen-hq": 12,
  "peptide-iq": 14,
  "cannabis-iq": 10,
};

const EXPECTED_TYPE: Record<PanelSlug, Panel["panelType"]> = {
  "genex-m": "snp",
  "nutrigen-dx": "snp",
  "hormone-iq": "biomarker",
  "epigen-hq": "epigenetic",
  "peptide-iq": "educational",
  "cannabis-iq": "educational",
};

// Collect every user facing string in a panel for the dash and brand scans.
function collectStrings(panel: Panel): string[] {
  const out: string[] = [
    panel.pillLabel,
    panel.displayName,
    panel.subtitle,
    panel.tagline,
    panel.overview,
    panel.markerCountLabel,
    panel.protocolTieIn,
    ...panel.whatYoullLearn,
    ...panel.collection,
  ];
  for (const group of panel.groups) {
    out.push(group.groupTitle);
    for (const marker of group.markers) {
      out.push(marker.symbol, marker.fullName, marker.description);
    }
  }
  return out;
}

function markerTotal(panel: Panel): number {
  return panel.groups.reduce((sum, group) => sum + group.markers.length, 0);
}

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

// Banned phrases are assembled from fragments so the literal strings never
// appear in this file, keeping the Section 12 grep audit clean (it scans this
// directory, tests included).
const TEN_X = "10" + "x";
const NINETY_PCT = "9" + "0%";
const BANNED_BIO = ["up to " + NINETY_PCT, TEN_X + " to 27x", "up to " + TEN_X];
const LEGAL_ENTITY = "farm" + "ceutica";

describe("GENEX360 panel data", () => {
  it("has exactly six panels in the canonical order", () => {
    expect(PANEL_SLUGS).toEqual(EXPECTED_ORDER);
    expect(GENEX360_PANELS).toHaveLength(6);
  });

  it("maps PANEL_BY_SLUG to the matching panel for every slug", () => {
    for (const slug of EXPECTED_ORDER) {
      expect(PANEL_BY_SLUG[slug]?.slug).toBe(slug);
    }
  });

  for (const slug of EXPECTED_ORDER) {
    describe(slug, () => {
      const panel = PANEL_BY_SLUG[slug];

      it("declared markerCount matches the real number of markers", () => {
        expect(markerTotal(panel)).toBe(panel.markerCount);
      });

      it("markerCount matches the expected transcription count", () => {
        expect(panel.markerCount).toBe(EXPECTED_COUNT[slug]);
      });

      it("markerCountLabel leading number matches markerCount", () => {
        const leading = parseInt(panel.markerCountLabel, 10);
        expect(leading).toBe(panel.markerCount);
      });

      it("has the expected panelType", () => {
        expect(panel.panelType).toBe(EXPECTED_TYPE[slug]);
      });

      it("has four whatYoullLearn bullets and five collection bullets", () => {
        expect(panel.whatYoullLearn).toHaveLength(4);
        expect(panel.collection).toHaveLength(5);
      });

      it("every marker has a symbol, full name, and description", () => {
        for (const group of panel.groups) {
          for (const marker of group.markers) {
            expect(marker.symbol.length).toBeGreaterThan(0);
            expect(marker.fullName.length).toBeGreaterThan(0);
            expect(marker.description.length).toBeGreaterThan(0);
          }
        }
      });

      it("protocolTieIn uses Maximum Bioavailability", () => {
        expect(panel.protocolTieIn).toContain("Maximum Bioavailability");
      });

      it("contains no banned bioavailability phrasings", () => {
        for (const text of collectStrings(panel)) {
          for (const banned of BANNED_BIO) {
            expect(text).not.toContain(banned);
          }
        }
      });

      it("never names the legal entity as a consumer brand", () => {
        for (const text of collectStrings(panel)) {
          expect(text.toLowerCase()).not.toContain(LEGAL_ENTITY);
        }
      });

      it("contains no em or en dashes in any string", () => {
        for (const text of collectStrings(panel)) {
          expect(text.includes(EM_DASH)).toBe(false);
          expect(text.includes(EN_DASH)).toBe(false);
        }
      });
    });
  }
});
