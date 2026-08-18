/**
 * Prompt 221B: Hormone section for Doctor's Report composition.
 * Lab-mapped table front and center. Education disclaimer. No therapy dosing.
 */

import type { HormoneReportPayload } from "./types";

export interface DoctorsReportHormoneSection {
  title: string;
  disclaimer: string;
  track: "male" | "female";
  generated_at: string;
  lab_table: Array<{
    marker: string;
    value: string;
    lab_reference: string;
    note: string;
  }>;
  missing_markers: string[];
  practitioner_pathway: string;
}

export function buildDoctorsReportHormoneSection(
  report: HormoneReportPayload
): DoctorsReportHormoneSection {
  return {
    title: `${report.overview.track === "male" ? "Male" : "Female"} Hormone Report`,
    disclaimer: report.overview.disclaimer,
    track: report.overview.track,
    generated_at: report.overview.generated_at,
    lab_table: report.your_labs_mapped.map((m) => ({
      marker: m.display_name,
      value:
        m.lab.value == null
          ? "UNKNOWN"
          : `${m.lab.value}${m.lab.unit ? ` ${m.lab.unit}` : ""}`,
      lab_reference: m.lab_reference
        ? `${m.lab_reference.low ?? "UNKNOWN"} to ${m.lab_reference.high ?? "UNKNOWN"} (lab upload)`
        : "not on upload",
      note: "Educational typical published ranges are separate from the lab reference above.",
    })),
    missing_markers: report.labs_not_present.map((n) => n.display_name),
    practitioner_pathway: report.talk_to_your_practitioner.pathway,
  };
}
