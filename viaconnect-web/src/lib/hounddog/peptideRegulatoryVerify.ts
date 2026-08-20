/**
 * Prompt 225 Phase 9: Hound Dog peptide FDA/WADA verification helpers.
 * Findings are evidence for Jeffery-gated field edits. Never auto-writes
 * not_prohibited. Primary source: WADA 2026 Prohibited List (in force 1 Jan 2026).
 */

export type WadaStatusHint =
  | "prohibited_all_times"
  | "prohibited_in_competition"
  | "monitoring_program"
  | "not_prohibited"
  | "captured_by_s0"
  | "unknown";

export interface PeptideRegulatoryFinding {
  slug: string;
  jurisdiction: "WADA" | "United States";
  field: "wada_status" | "fda_status" | "fda_503a_category";
  previousHint: string;
  recommendedStatus: string;
  wadaClass?: string | null;
  confidence: "high" | "medium" | "low";
  sourceUrl: string;
  sourceCitationId: string;
  notes: string;
  /** If true, safe to stage a Thanos regulatory event / Jeffery apply. */
  stageable: boolean;
}

/** Curated high-confidence findings from primary sources (2026-08-20 pass). */
export const PEPTIDE_225_HOUNDDOG_FINDINGS: ReadonlyArray<PeptideRegulatoryFinding> =
  [
    {
      slug: "ipamorelin-standalone",
      jurisdiction: "WADA",
      field: "wada_status",
      previousHint: "unknown",
      recommendedStatus: "prohibited_all_times",
      wadaClass: "S2.2.4",
      confidence: "high",
      sourceUrl: "https://www.wada-ama.org/en/prohibited-list",
      sourceCitationId: "wada_2026_prohibited_list_s2_2_4_ghs_ipamorelin",
      notes:
        "WADA 2026 S2.2.4 explicitly lists ipamorelin among growth hormone secretagogues and mimetics (prohibited at all times).",
      stageable: true,
    },
    {
      slug: "mk-677",
      jurisdiction: "WADA",
      field: "wada_status",
      previousHint: "unknown",
      recommendedStatus: "prohibited_all_times",
      wadaClass: "S2.2.4",
      confidence: "high",
      sourceUrl: "https://www.wada-ama.org/en/prohibited-list",
      sourceCitationId: "wada_2026_prohibited_list_s2_2_4_ghs_ibutamoren",
      notes:
        "WADA 2026 S2.2.4 lists ibutamoren (MK-677) among GHS and mimetics (prohibited at all times).",
      stageable: true,
    },
    {
      slug: "sermorelin",
      jurisdiction: "WADA",
      field: "wada_status",
      previousHint: "unknown",
      recommendedStatus: "prohibited_all_times",
      wadaClass: "S2.2.4",
      confidence: "high",
      sourceUrl: "https://www.wada-ama.org/en/prohibited-list",
      sourceCitationId: "wada_2026_prohibited_list_s2_2_4_ghrh_sermorelin",
      notes:
        "WADA 2026 S2.2.4 lists sermorelin among GHRH analogues (prohibited at all times).",
      stageable: true,
    },
    {
      slug: "cjc-1295-no-dac",
      jurisdiction: "WADA",
      field: "wada_status",
      previousHint: "unknown",
      recommendedStatus: "prohibited_all_times",
      wadaClass: "S2.2.4",
      confidence: "high",
      sourceUrl: "https://www.wada-ama.org/en/prohibited-list",
      sourceCitationId: "wada_2026_prohibited_list_s2_2_4_ghrh_cjc1295",
      notes:
        "WADA 2026 S2.2.4 lists CJC-1295 among GHRH analogues (prohibited at all times).",
      stageable: true,
    },
    {
      slug: "aod-9604",
      jurisdiction: "WADA",
      field: "wada_status",
      previousHint: "unknown",
      recommendedStatus: "prohibited_all_times",
      wadaClass: "S2.2.3",
      confidence: "high",
      sourceUrl: "https://www.wada-ama.org/en/prohibited-list",
      sourceCitationId: "wada_2026_prohibited_list_s2_2_3_aod9604",
      notes:
        "WADA 2026 S2.2.3 lists AOD-9604 among growth hormone fragments (prohibited at all times).",
      stageable: true,
    },
    {
      slug: "anamorelin",
      jurisdiction: "WADA",
      field: "wada_status",
      previousHint: "unknown",
      recommendedStatus: "prohibited_all_times",
      wadaClass: "S2.2.4",
      confidence: "high",
      sourceUrl: "https://www.wada-ama.org/en/prohibited-list",
      sourceCitationId: "wada_2026_prohibited_list_s2_2_4_anamorelin",
      notes:
        "WADA 2026 S2.2.4 lists anamorelin among GHS and mimetics (prohibited at all times).",
      stageable: true,
    },
    {
      slug: "macimorelin",
      jurisdiction: "WADA",
      field: "wada_status",
      previousHint: "unknown",
      recommendedStatus: "prohibited_all_times",
      wadaClass: "S2.2.4",
      confidence: "high",
      sourceUrl: "https://www.wada-ama.org/en/prohibited-list",
      sourceCitationId: "wada_2026_prohibited_list_s2_2_4_macimorelin",
      notes:
        "WADA 2026 S2.2.4 lists macimorelin among GHS and mimetics (prohibited at all times).",
      stageable: true,
    },
    {
      slug: "tabimorelin",
      jurisdiction: "WADA",
      field: "wada_status",
      previousHint: "unknown",
      recommendedStatus: "prohibited_all_times",
      wadaClass: "S2.2.4",
      confidence: "high",
      sourceUrl: "https://www.wada-ama.org/en/prohibited-list",
      sourceCitationId: "wada_2026_prohibited_list_s2_2_4_tabimorelin",
      notes:
        "WADA 2026 S2.2.4 lists tabimorelin among GHS and mimetics (prohibited at all times).",
      stageable: true,
    },
    {
      slug: "ghrp-1",
      jurisdiction: "WADA",
      field: "wada_status",
      previousHint: "unknown",
      recommendedStatus: "prohibited_all_times",
      wadaClass: "S2.2.4",
      confidence: "high",
      sourceUrl: "https://www.wada-ama.org/en/prohibited-list",
      sourceCitationId: "wada_2026_prohibited_list_s2_2_4_ghrp1",
      notes:
        "WADA 2026 S2.2.4 lists GHRP-1 among GH-releasing peptides (prohibited at all times).",
      stageable: true,
    },
    {
      slug: "edu-bpc157",
      jurisdiction: "United States",
      field: "fda_503a_category",
      previousHint: "unknown",
      recommendedStatus: "unknown",
      confidence: "medium",
      sourceUrl:
        "https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026",
      sourceCitationId: "fda_pcac_2026_07_23_bpc157_agenda",
      notes:
        "FDA PCAC July 23 2026 agenda includes BPC-157-related bulk substances for 503A bulks list discussion. Not a final listing decision; leave fda_503a_category unknown until committee outcome is published.",
      stageable: false,
    },
  ];

export function getStageableWadaFindings(): PeptideRegulatoryFinding[] {
  return PEPTIDE_225_HOUNDDOG_FINDINGS.filter(
    (f) => f.stageable && f.field === "wada_status" && f.confidence === "high",
  );
}

/** Fail-closed: never recommend consumer not_prohibited from this pass. */
export function assertsNoNotProhibitedRecommendations(
  findings: ReadonlyArray<PeptideRegulatoryFinding> = PEPTIDE_225_HOUNDDOG_FINDINGS,
): boolean {
  return findings.every((f) => f.recommendedStatus !== "not_prohibited");
}
