/**
 * Prompt 221B: sex for hormone report track selection.
 * Never default-guess. Distinct from useUserBiologicalSex (which defaults male).
 */

import type { BiologicalSexForReport, HormoneReportTrack } from "./types";

export type SexSource = "profile" | "explicit" | "unset";

export interface ResolvedReportSex {
  sex: BiologicalSexForReport | null;
  source: SexSource;
  track: HormoneReportTrack | null;
  needsSex: boolean;
}

/**
 * Resolve biological sex for hormone report generation.
 * @param profileSex - raw profile/CAQ value; may be male/female/other/null/unknown
 * @param explicitSex - user choice from the report sex prompt (only when profile unset)
 */
export function resolveReportSex(
  profileSex: string | null | undefined,
  explicitSex?: string | null
): ResolvedReportSex {
  const fromProfile = normalizeSex(profileSex);
  if (fromProfile) {
    return {
      sex: fromProfile,
      source: "profile",
      track: fromProfile,
      needsSex: false,
    };
  }

  const fromExplicit = normalizeSex(explicitSex);
  if (fromExplicit) {
    return {
      sex: fromExplicit,
      source: "explicit",
      track: fromExplicit,
      needsSex: false,
    };
  }

  return {
    sex: null,
    source: "unset",
    track: null,
    needsSex: true,
  };
}

function normalizeSex(raw: string | null | undefined): BiologicalSexForReport | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === "male" || v === "m") return "male";
  if (v === "female" || v === "f") return "female";
  // other / prefer_not / unknown / empty → unset (prompt required)
  return null;
}

export function trackFromSex(sex: BiologicalSexForReport): HormoneReportTrack {
  return sex;
}
