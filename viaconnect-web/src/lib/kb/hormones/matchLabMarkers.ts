/**
 * Prompt 221B: map uploaded lab biomarkers to kb_hormones via marker_mapping.
 * Lab reference ranges from the upload are authoritative.
 * typical_ranges are educational only and must be labeled as such.
 */

import type {
  KbHormoneRow,
  LabMarkerSnapshot,
  MappedLabMarker,
  MarkerAlias,
} from "./types";
import { UPLOAD_LABS_PATHWAY } from "./types";

/** Hormone-like biomarker heuristics for unmatched review queue (never silent drop). */
const HORMONE_LIKE =
  /\b(testosterone|estradiol|estrone|estriol|progesterone|shbg|dhea|dht|lh\b|fsh\b|prolactin|tsh|free\s*t[34]|cortisol|insulin|igf|melatonin|androstenedione|aldosterone|reverse\s*t3|vitamin\s*d|25[\s-]?oh)\b/i;

export function normalizeBiomarkerKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[®™]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildAliasIndex(
  hormones: Array<Pick<KbHormoneRow, "hormone_slug" | "display_name" | "marker_mapping" | "typical_ranges" | "consumer_safe">>
): Map<string, { hormone_slug: string; display_name: string; typical_ranges: KbHormoneRow["typical_ranges"]; consumer_safe: boolean }> {
  const idx = new Map<
    string,
    {
      hormone_slug: string;
      display_name: string;
      typical_ranges: KbHormoneRow["typical_ranges"];
      consumer_safe: boolean;
    }
  >();

  for (const h of hormones) {
    const aliases: MarkerAlias[] = Array.isArray(h.marker_mapping)
      ? h.marker_mapping
      : [];
    const keys = new Set<string>();
    keys.add(normalizeBiomarkerKey(h.hormone_slug));
    keys.add(normalizeBiomarkerKey(h.display_name));
    for (const a of aliases) {
      if (a?.alias) keys.add(normalizeBiomarkerKey(a.alias));
      if (a?.loinc) keys.add(normalizeBiomarkerKey(a.loinc));
    }
    for (const k of keys) {
      if (!k) continue;
      if (!idx.has(k)) {
        idx.set(k, {
          hormone_slug: h.hormone_slug,
          display_name: h.display_name,
          typical_ranges: h.typical_ranges ?? [],
          consumer_safe: Boolean(h.consumer_safe),
        });
      }
    }
  }
  return idx;
}

export interface MatchLabsResult {
  mapped: MappedLabMarker[];
  unmatchedHormoneLike: LabMarkerSnapshot[];
  notInLabs: Array<{
    hormone_slug: string;
    display_name: string;
    note: string;
    upload_labs_pathway: string;
  }>;
}

export function matchLabMarkers(
  labs: LabMarkerSnapshot[],
  hormones: Array<
    Pick<
      KbHormoneRow,
      | "hormone_slug"
      | "display_name"
      | "marker_mapping"
      | "typical_ranges"
      | "consumer_safe"
      | "sex_relevance"
    >
  >,
  track: "male" | "female"
): MatchLabsResult {
  const relevant = hormones.filter(
    (h) => h.sex_relevance === "both" || h.sex_relevance === track
  );
  const idx = buildAliasIndex(relevant);
  const mapped: MappedLabMarker[] = [];
  const unmatchedHormoneLike: LabMarkerSnapshot[] = [];
  const hitSlugs = new Set<string>();

  for (const lab of labs) {
    const key = normalizeBiomarkerKey(lab.biomarker);
    const hit = idx.get(key);
    if (hit) {
      hitSlugs.add(hit.hormone_slug);
      const hasLabRange =
        lab.reference_low != null || lab.reference_high != null;
      mapped.push({
        hormone_slug: hit.hormone_slug,
        display_name: hit.display_name,
        lab,
        lab_reference: hasLabRange
          ? { low: lab.reference_low, high: lab.reference_high }
          : null,
        typical_ranges_educational: hit.typical_ranges,
        education_available: true,
        consumer_safe_education: hit.consumer_safe,
      });
    } else if (HORMONE_LIKE.test(lab.biomarker)) {
      unmatchedHormoneLike.push(lab);
    }
  }

  const notInLabs = relevant
    .filter((h) => !hitSlugs.has(h.hormone_slug))
    .map((h) => ({
      hormone_slug: h.hormone_slug,
      display_name: h.display_name,
      note: "not in your labs yet",
      upload_labs_pathway: UPLOAD_LABS_PATHWAY,
    }));

  return { mapped, unmatchedHormoneLike, notInLabs };
}

export function isHormoneLikeBiomarker(biomarker: string): boolean {
  return HORMONE_LIKE.test(biomarker);
}
