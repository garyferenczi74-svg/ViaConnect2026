// Prompt 204 (2026-06-21): the EpigenHQ marker registry for the member-result
// pipeline. Each entry ties a canonical marker_key (the SAME key as the EpigenHQ
// interpretation in epigen-hq-interpretations.draft.ts) to its display name, its
// unit when the readout is numeric, and aliases used to match a raw label off an
// uploaded report. This is the single source the store, the read path, and the
// extraction (Slice 2) share, the way the lab biomarkerDictionary is shared.
//
// Standing rules honored: no em or en dashes, TypeScript strict (no any).

export interface EpigenMarkerEntry {
  /** Canonical key, matching the EpigenHQ interpretation key. */
  key: string;
  /** Display name, matching PanelMarker.symbol and interpretation.marker. */
  displayName: string;
  /** Unit when the readout is numeric, null when it is a level or score. */
  unit: string | null;
  /** Lowercased substrings used to match a raw label from an uploaded report. */
  aliases: string[];
}

export const EPIGEN_MARKERS: EpigenMarkerEntry[] = [
  {
    key: "epigenetic-age",
    displayName: "Epigenetic Age",
    unit: "years",
    aliases: ["epigenetic age", "dnam age", "methylation age", "biological age"],
  },
  {
    key: "biological-age-gap",
    displayName: "Biological Age Gap",
    unit: "years",
    aliases: ["biological age gap", "age gap", "age acceleration", "epigenetic age difference"],
  },
  {
    key: "pace-of-aging",
    displayName: "Pace of Aging",
    unit: "years per year",
    aliases: ["pace of aging", "dunedin", "pace", "rate of aging"],
  },
  {
    key: "inflammatory-methylation-index",
    displayName: "Inflammatory Methylation Index",
    unit: null,
    aliases: ["inflammatory methylation", "inflammation index", "inflammatory index"],
  },
  {
    key: "immune-cell-methylation-profile",
    displayName: "Immune Cell Methylation Profile",
    unit: null,
    aliases: ["immune cell", "immune methylation", "cell composition", "immune profile"],
  },
  {
    key: "metabolic-methylation-score",
    displayName: "Metabolic Methylation Score",
    unit: null,
    aliases: ["metabolic methylation", "metabolic score"],
  },
  {
    key: "glucose-insulin-regulation-methylation",
    displayName: "Glucose and Insulin Regulation Methylation",
    unit: null,
    aliases: ["glucose", "insulin", "glucose insulin", "glycemic methylation"],
  },
  {
    key: "ahrr-combustion-exposure",
    displayName: "AHRR Combustion Exposure Signature",
    unit: null,
    aliases: ["ahrr", "combustion", "smoke exposure", "smoking signature", "tobacco"],
  },
  {
    key: "alcohol-exposure-methylation",
    displayName: "Alcohol Exposure Methylation",
    unit: null,
    aliases: ["alcohol", "alcohol exposure", "ethanol"],
  },
  {
    key: "stress-cortisol-exposure-methylation",
    displayName: "Stress and Cortisol Exposure Methylation",
    unit: null,
    aliases: ["stress", "cortisol", "stress exposure", "cortisol exposure"],
  },
  {
    key: "global-dna-methylation-status",
    displayName: "Global DNA Methylation Status",
    unit: null,
    aliases: ["global methylation", "global dna methylation", "overall methylation"],
  },
  {
    key: "telomere-associated-methylation",
    displayName: "Telomere Associated Methylation",
    unit: null,
    aliases: ["telomere", "telomere methylation", "dnamtl"],
  },
];

export const EPIGEN_MARKER_KEYS: string[] = EPIGEN_MARKERS.map((m) => m.key);

const BY_KEY = new Map<string, EpigenMarkerEntry>(EPIGEN_MARKERS.map((m) => [m.key, m]));
const BY_DISPLAY_NAME = new Map<string, string>(EPIGEN_MARKERS.map((m) => [m.displayName, m.key]));

/** Look up a marker entry by its canonical key, or null. */
export function epigenMarkerByKey(key: string): EpigenMarkerEntry | null {
  return BY_KEY.get(key) ?? null;
}

/** Resolve a marker's canonical key from its exact display name, or null. */
export function epigenKeyForDisplayName(displayName: string): string | null {
  return BY_DISPLAY_NAME.get(displayName) ?? null;
}

/**
 * Resolve a raw marker label (from an uploaded report) to a canonical key via the
 * alias substrings, or null when no marker matches. The longest alias wins so a
 * specific label is preferred over a short generic one.
 */
export function epigenMarkerKeyFor(rawLabel: string): string | null {
  const label = rawLabel.trim().toLowerCase();
  if (!label) return null;
  let bestKey: string | null = null;
  let bestLen = 0;
  for (const entry of EPIGEN_MARKERS) {
    for (const alias of entry.aliases) {
      if (label.includes(alias) && alias.length > bestLen) {
        bestKey = entry.key;
        bestLen = alias.length;
      }
    }
  }
  return bestKey;
}
