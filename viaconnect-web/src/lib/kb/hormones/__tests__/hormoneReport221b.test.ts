/**
 * Prompt 221B: hormone report scaffolding unit tests (no live DB).
 */

import { describe, expect, it } from "vitest";
import { FLAGSHIP_HORMONE_DRAFTS } from "../flagshipDraft";
import {
  assertConsumerPayloadSafe,
  generateHormoneReport,
  stripPractitionerDepth,
} from "../generateHormoneReport";
import {
  isHormoneLikeBiomarker,
  matchLabMarkers,
  normalizeBiomarkerKey,
} from "../matchLabMarkers";
import { resolveReportSex } from "../resolveReportSex";

describe("221B resolveReportSex", () => {
  it("uses profile male/female without defaulting", () => {
    expect(resolveReportSex("male").needsSex).toBe(false);
    expect(resolveReportSex("male").track).toBe("male");
    expect(resolveReportSex("female").track).toBe("female");
  });

  it("prompts when unset and does not guess male", () => {
    const r = resolveReportSex(null);
    expect(r.needsSex).toBe(true);
    expect(r.sex).toBeNull();
    expect(r.track).toBeNull();
  });

  it("accepts explicit sex only when profile unset", () => {
    const r = resolveReportSex(undefined, "female");
    expect(r.needsSex).toBe(false);
    expect(r.track).toBe("female");
    expect(r.source).toBe("explicit");
  });

  it("rejects other/unknown as unset", () => {
    expect(resolveReportSex("other").needsSex).toBe(true);
    expect(resolveReportSex("prefer_not").needsSex).toBe(true);
  });
});

describe("221B matchLabMarkers", () => {
  const hormones = FLAGSHIP_HORMONE_DRAFTS.map((h) => ({ ...h }));

  it("maps total testosterone alias and keeps lab range authoritative", () => {
    const res = matchLabMarkers(
      [
        {
          biomarker: "Total Testosterone",
          value: 450,
          unit: "ng/dL",
          reference_low: 264,
          reference_high: 916,
          measured_at: "2026-08-01T12:00:00Z",
        },
      ],
      hormones,
      "male"
    );
    expect(res.mapped).toHaveLength(1);
    expect(res.mapped[0].hormone_slug).toBe("testosterone");
    expect(res.mapped[0].lab_reference).toEqual({ low: 264, high: 916 });
    expect(res.notInLabs.some((n) => n.hormone_slug === "estradiol")).toBe(
      true
    );
  });

  it("queues unmatched hormone-like biomarkers", () => {
    const res = matchLabMarkers(
      [
        {
          biomarker: "Free T3",
          value: 3.1,
          unit: "pg/mL",
          reference_low: 2.0,
          reference_high: 4.4,
          measured_at: null,
        },
      ],
      hormones,
      "female"
    );
    expect(res.mapped).toHaveLength(0);
    expect(res.unmatchedHormoneLike).toHaveLength(1);
    expect(isHormoneLikeBiomarker("Free T3")).toBe(true);
  });

  it("normalizes biomarker keys", () => {
    expect(normalizeBiomarkerKey("  Total  Testosterone ")).toBe(
      "total testosterone"
    );
  });
});

describe("221B generateHormoneReport", () => {
  const hormones = FLAGSHIP_HORMONE_DRAFTS.map((h) => ({ ...h }));

  it("returns needsSex when profile unset", () => {
    const r = generateHormoneReport({
      profileSex: null,
      labs: [],
      hormones,
      genetics: [],
      influences: [],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.needsSex).toBe(true);
      expect(r.report).toBeNull();
    }
  });

  it("builds male track with honest empty labs and no depth leak", () => {
    const r = generateHormoneReport({
      profileSex: "male",
      labs: [],
      hormones,
      genetics: [
        {
          rsid: "rs123",
          summary: "unsafe hormonal snp",
          evidence_grade: "C",
          consumer_safe: false,
        },
        {
          rsid: "rs999",
          summary: "safe hormonal snp",
          evidence_grade: "B",
          consumer_safe: true,
        },
      ],
      influences: [],
      nowIso: "2026-08-18T12:00:00.000Z",
    });
    expect(r.ok && !r.needsSex).toBe(true);
    if (!r.ok || r.needsSex || !r.report) throw new Error("expected report");
    expect(r.track).toBe("male");
    expect(r.report.overview.disclaimer.length).toBeGreaterThan(20);
    expect(r.report.labs_not_present.length).toBeGreaterThan(0);
    expect(r.report.genetics_context).toHaveLength(1);
    expect(r.report.genetics_context[0].rsid).toBe("rs999");
    // Flagship drafts are consumer_safe false → education_track empty until Marshall
    expect(r.report.education_track).toHaveLength(0);
    assertConsumerPayloadSafe(r.report);
    const blob = JSON.stringify(r.report);
    expect(blob).not.toMatch(/practitioner_depth/i);
    expect(blob).not.toMatch(/[\u2013\u2014]/);
  });

  it("female track includes cycle phase unknown note by default", () => {
    const r = generateHormoneReport({
      profileSex: "female",
      labs: [
        {
          biomarker: "estradiol",
          value: 80,
          unit: "pg/mL",
          reference_low: 15,
          reference_high: 350,
          measured_at: "2026-08-01T12:00:00Z",
        },
      ],
      hormones,
      genetics: [],
      influences: [],
    });
    if (!r.ok || r.needsSex || !r.report) throw new Error("expected report");
    expect(r.track).toBe("female");
    expect(r.report.cycle_phase_note).toMatch(/unknown/i);
    expect(r.report.your_labs_mapped).toHaveLength(1);
    expect(r.report.your_labs_mapped[0].lab_reference?.low).toBe(15);
  });

  it("stripPractitionerDepth removes depth field", () => {
    const row = stripPractitionerDepth({
      ...hormones[0],
      practitioner_depth_block: "secret TRT notes",
    });
    expect("practitioner_depth_block" in row).toBe(false);
  });

  it("therapy redirect copy is present", () => {
    const r = generateHormoneReport({
      profileSex: "male",
      labs: [],
      hormones,
      genetics: [],
      influences: [],
    });
    if (!r.ok || r.needsSex || !r.report) throw new Error("expected report");
    expect(r.report.talk_to_your_practitioner.therapy_note).toMatch(
      /practitioner/i
    );
    expect(r.report.talk_to_your_practitioner.therapy_note).not.toMatch(
      /take \d+ mg/i
    );
  });
});
