/**
 * Prompt 221B: Male/Female hormone report generator (honest empty states).
 * Strips practitioner_depth. Never fabricates labs, genetics, or ranges.
 */

import {
  buildHormoneIqCrossRef,
  type HormoneIqVariantRow,
} from "./hormoneIqCrossRef";
import { matchLabMarkers } from "./matchLabMarkers";
import { resolveReportSex } from "./resolveReportSex";
import type {
  HormoneReportPayload,
  HormoneReportResult,
  HormoneReportTrack,
  KbHormoneRow,
  LabMarkerSnapshot,
} from "./types";
import {
  CYCLE_PHASE_UNKNOWN_NOTE,
  HORMONE_DISCLAIMER,
  THERAPY_REDIRECT,
} from "./types";

export interface GeneticHormoneHit {
  rsid: string;
  summary: string;
  evidence_grade: string | null;
  consumer_safe: boolean;
}

export interface InfluenceSignal {
  factor: string;
  note: string;
  /** True only when backed by user digest data. */
  personalized: boolean;
}

export interface GenerateHormoneReportInput {
  profileSex: string | null | undefined;
  explicitSex?: string | null;
  labs: LabMarkerSnapshot[];
  hormones: KbHormoneRow[];
  genetics: GeneticHormoneHit[];
  influences: InfluenceSignal[];
  /** HormoneIQ panel variants from user_variants (panel_key=hormone). */
  hormoneIqVariants?: HormoneIqVariantRow[];
  /** Female track: whether cycle phase of the draw is known. */
  cyclePhaseKnown?: boolean;
  nowIso?: string;
}

/** Consumer-safe view: never expose practitioner_depth_block. */
export function stripPractitionerDepth<T extends { practitioner_depth_block?: string }>(
  row: T
): Omit<T, "practitioner_depth_block"> {
  const { practitioner_depth_block: _drop, ...rest } = row;
  return rest;
}

export function generateHormoneReport(
  input: GenerateHormoneReportInput
): HormoneReportResult {
  const sexRes = resolveReportSex(input.profileSex, input.explicitSex);
  if (sexRes.needsSex || !sexRes.track) {
    return { ok: true, needsSex: true, track: null, report: null };
  }

  const track: HormoneReportTrack = sexRes.track;
  const generatedAt = input.nowIso ?? new Date().toISOString();

  const safeHormones = input.hormones.map((h) => stripPractitionerDepth(h));
  const match = matchLabMarkers(input.labs, safeHormones, track);

  const genetics = input.genetics
    .filter((g) => g.consumer_safe)
    .map((g) => ({
      rsid: g.rsid,
      summary: g.summary,
      evidence_grade: g.evidence_grade,
    }));

  const hormoneiq_crossref = buildHormoneIqCrossRef(
    input.hormoneIqVariants ?? [],
    input.labs
  );

  // Merge HormoneIQ SNP education into genetics_context when consumer-safe draft text exists
  for (const snp of hormoneiq_crossref.snp_results) {
    if (!snp.genotype_interpretation) continue;
    if (genetics.some((g) => g.rsid.toLowerCase() === snp.rsid.toLowerCase())) {
      continue;
    }
    genetics.push({
      rsid: snp.rsid,
      summary: `${snp.gene} (${snp.genotype ?? "genotype UNKNOWN"}): ${snp.genotype_label ?? "HormoneIQ result"}. ${snp.genotype_interpretation}`,
      evidence_grade: null,
    });
  }

  const education = safeHormones
    .filter(
      (h) =>
        h.consumer_safe &&
        (h.sex_relevance === "both" || h.sex_relevance === track)
    )
    .map((h) => ({
      hormone_slug: h.hormone_slug,
      display_name: h.display_name,
      sex_block:
        track === "male" ? h.male_content_block : h.female_content_block,
      life_stage_notes: h.life_stage_notes ?? {},
    }));

  // Education for mapped markers that are not yet consumer_safe: omit body, keep lab honesty
  const mappedForConsumer = match.mapped.map((m) => ({
    ...m,
    // Do not surface typical ranges from unsafe education as if approved
    typical_ranges_educational: m.consumer_safe_education
      ? m.typical_ranges_educational
      : [],
  }));

  const influences =
    input.influences.length > 0
      ? input.influences
      : [
          {
            factor: "sleep",
            note: "Sleep timing and duration can influence hormone patterns. Personalized sleep signals are not available yet.",
            personalized: false,
          },
          {
            factor: "body composition",
            note: "Body composition context can inform educational hormone patterns. Personalized composition signals are not available yet.",
            personalized: false,
          },
          {
            factor: "nutrition",
            note: "Nutrition patterns can influence hormone education topics. Personalized nutrition digests are not available yet.",
            personalized: false,
          },
        ];

  const dataSources: string[] = [];
  if (input.labs.length > 0) dataSources.push("uploaded_labs");
  if (genetics.length > 0) dataSources.push("genetic_hormonal_c11");
  if (hormoneiq_crossref.summary.has_any_data) dataSources.push("hormoneiq_genex360");
  dataSources.push("hormone_education_c13");
  if (input.influences.some((i) => i.personalized)) {
    dataSources.push("user_digests");
  }

  const cycleNote =
    track === "female" && input.cyclePhaseKnown !== true
      ? CYCLE_PHASE_UNKNOWN_NOTE
      : null;

  const provenance = education.map((e) => ({
    claim_ref: e.hormone_slug,
    grade: null as string | null,
    sources: [] as string[],
  }));

  const report: HormoneReportPayload = {
    overview: {
      what_this_is:
        "An educational Hormone Report that maps your labs and genetics to ViaConnect hormone education.",
      what_this_is_not:
        "Not a diagnosis, not a treatment plan, and not hormone therapy guidance.",
      generated_at: generatedAt,
      track,
      data_sources: dataSources,
      disclaimer: HORMONE_DISCLAIMER,
    },
    your_labs_mapped: mappedForConsumer,
    labs_not_present: match.notInLabs,
    genetics_context: genetics,
    hormoneiq_crossref,
    education_track: education,
    influences_you_control: influences,
    talk_to_your_practitioner: {
      pathway: "Share this report with your licensed practitioner.",
      therapy_note: THERAPY_REDIRECT,
    },
    provenance_footer: provenance,
    cycle_phase_note: cycleNote,
  };

  // Dash ban: generated copy must not contain em/en dashes
  assertNoDashes(JSON.stringify(report));

  return {
    ok: true,
    needsSex: false,
    track,
    report,
  };
}

export function assertNoDashes(text: string): void {
  if (text.includes("\u2013") || text.includes("\u2014")) {
    throw new Error("hormone_report_contains_em_or_en_dash");
  }
}

export function assertConsumerPayloadSafe(
  payload: HormoneReportPayload
): void {
  const blob = JSON.stringify(payload);
  if (/practitioner_depth/i.test(blob)) {
    throw new Error("practitioner_depth_leaked_to_consumer");
  }
  if (/\b(trt|hrt)\b.*\b(dose|mg\/|iu\/day|protocol)\b/i.test(blob)) {
    throw new Error("therapy_dosing_language_in_consumer_payload");
  }
}
