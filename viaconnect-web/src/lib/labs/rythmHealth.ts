/**
 * Rythm Health (Rythm, no first h) lab import. Blood chemistry only.
 *
 * Rythm Health, Inc. sells an at-home capillary blood panel (Tasso+).
 * It is not a wrist wearable. There is no public developer API, OAuth,
 * webhook, FHIR, or Terra/Vital/Junction listing as of the locked audit.
 * Consumer export today is CSV (and PDF) from
 * https://app.rythmhealth.com/account/orders
 *
 * Do not wire Rhythm Software (docs.api.rhythmsoftware.com). Different company.
 * Do not mint Rythm Score or Biological Age into BOS or biological-age.
 * HormoneIQ DUTCH-only stays DUTCH. This source is lab_biomarkers blood work.
 *
 * Partner inquiry (not a live Connect path):
 * https://form.rythmhealth.com/provider and support@rythmhealth.com
 *
 * No RYTHM_HEALTH_CLIENT_ID / SECRET / REDIRECT_URI. Those would imply a
 * live OAuth contract that does not exist. Partner API is Coming soon,
 * fail-closed, lab card only.
 *
 * Standing rules: no em or en dashes. No scraped brand assets.
 */

import { matchBiomarker } from './biomarkerDictionary';

export const RYTHM_HEALTH_SOURCE = 'rythm_health' as const;
export const RYTHM_HEALTH_LAB_NAME = 'Rythm Health';
export const RYTHM_HEALTH_LEGAL_NAME = 'Rythm Health, Inc.';
export const RYTHM_HEALTH_SITE = 'https://rythmhealth.com';
export const RYTHM_HEALTH_APP = 'https://app.rythmhealth.com';
export const RYTHM_HEALTH_ORDERS_URL = 'https://app.rythmhealth.com/account/orders';
export const RYTHM_HEALTH_PARTNER_FORM = 'https://form.rythmhealth.com/provider';
export const RYTHM_HEALTH_SUPPORT = 'support@rythmhealth.com';

/** Persist provenance. lab_report_uploads.lab_name is the SSOT. */
export const RYTHM_HEALTH_PERSIST = {
  source: RYTHM_HEALTH_SOURCE,
  labName: RYTHM_HEALTH_LAB_NAME,
  sourceType: 'csv',
} as const;

/**
 * Documented panel names from the public product (not a CSV schema).
 * Public export column names are UNKNOWN. The parser matches these
 * aliases and skips rows it cannot read.
 */
export const RYTHM_HEALTH_DOCUMENTED_MARKERS: ReadonlyArray<{
  key: string;
  aliases: readonly string[];
}> = [
  { key: 'testosterone', aliases: ['total testosterone', 'testosterone', 'total t'] },
  { key: 'free_testosterone', aliases: ['free testosterone', 'free-t'] },
  { key: 'estradiol', aliases: ['estradiol', 'e2'] },
  { key: 'progesterone', aliases: ['progesterone', 'prog'] },
  { key: 'shbg', aliases: ['shbg', 'sex hormone binding'] },
  { key: 'cortisol', aliases: ['cortisol'] },
  { key: 'tsh', aliases: ['tsh', 'thyroid stimulating'] },
  { key: 'free_t3', aliases: ['free t3', 'ft3'] },
  { key: 'free_t4', aliases: ['free t4', 'ft4'] },
  { key: 'apob', aliases: ['apob', 'apolipoprotein b'] },
  { key: 'ldl', aliases: ['ldl'] },
  { key: 'hdl', aliases: ['hdl'] },
  { key: 'total_cholesterol', aliases: ['total cholesterol', 'cholesterol, total'] },
  { key: 'remnant_cholesterol', aliases: ['remnant cholesterol', 'remnant chol'] },
  { key: 'hscrp', aliases: ['hs-crp', 'hscrp', 'high sensitivity crp', 'hs crp'] },
  { key: 'vitamin_d', aliases: ['vitamin d', '25-oh', '25 oh'] },
  { key: 'ferritin', aliases: ['ferritin'] },
  { key: 'fructosamine', aliases: ['fructosamine'] },
  { key: 'albumin', aliases: ['albumin'] },
  { key: 'triglycerides', aliases: ['triglyceride'] },
  { key: 'uric_acid', aliases: ['uric acid', 'urate'] },
  { key: 'hematocrit', aliases: ['hematocrit', 'hct'] },
  { key: 'hemoglobin', aliases: ['hemoglobin', 'hgb'] },
  { key: 'creatinine', aliases: ['creatinine'] },
  { key: 'egfr', aliases: ['egfr'] },
  { key: 'alp', aliases: ['alkaline phosphatase', 'alp'] },
  { key: 'ggt', aliases: ['gamma glutamyl', 'ggt'] },
];

const DERIVED_SCORE_RE =
  /rythm\s*score|rhythm\s*score|biological\s*age|bio[\s-]*age/i;

export function isRythmDerivedScoreName(name: string): boolean {
  return DERIVED_SCORE_RE.test(name);
}

export function isRythmHealthLabName(labName: string | null | undefined): boolean {
  if (!labName) return false;
  return /rythm\s*health/i.test(labName) && !/rhythm\s*software/i.test(labName);
}

/** Brief 49: chip only when persisted lab rows exist. Never invent 0. */
export function rythmHealthFromLabChip(persistedRowCount: number | null): 'from lab' | null {
  if (typeof persistedRowCount !== 'number') return null;
  if (persistedRowCount <= 0) return null;
  return 'from lab';
}

export const RYTHM_HEALTH_COPY = {
  title: 'Rythm Health',
  category: 'At-home blood panel. Lab biomarkers, not a wearable.',
  lead:
    'Upload the CSV you download from your Rythm Health orders page. We save blood-test values to your lab record.',
  exportHelp:
    'In the Rythm Health app, open Account, then Orders (app.rythmhealth.com/account/orders). Download the CSV for the order you want to import.',
  partnerComingSoon:
    'A direct Rythm Health connection is coming soon. There is no public developer API today.',
  imported: 'Imported to your lab record',
  empty: 'No Rythm Health file imported yet.',
  unknown: 'Import status UNKNOWN.',
  disclaimer:
    'For informational and wellness purposes only. Not a diagnosis or medical advice.',
  uploadCta: 'Upload Rythm Health CSV',
  verifyLead: 'Check each blood-test value. Nothing is written until you confirm.',
} as const;

/**
 * Prefer documented aliases with exact or long-substring match.
 * Do not use short dictionary aliases such as hb, which would steal SHBG.
 */
export function matchRythmHealthMarker(raw: string): { key: string; displayName: string } | null {
  const n = (raw ?? '').trim().toLowerCase();
  if (!n) return null;

  for (const marker of RYTHM_HEALTH_DOCUMENTED_MARKERS) {
    if (marker.aliases.some((alias) => n === alias)) {
      const dict = matchBiomarker(marker.key === 'shbg' ? 'sex hormone binding globulin' : raw);
      return { key: marker.key, displayName: dict?.displayName ?? titleFromKey(marker.key) };
    }
  }

  const longHits = RYTHM_HEALTH_DOCUMENTED_MARKERS.filter((marker) =>
    marker.aliases.some((alias) => alias.length >= 4 && n.includes(alias)),
  );
  if (longHits.length === 1) {
    const marker = longHits[0];
    const dict = matchBiomarker(raw);
    return { key: marker.key, displayName: dict?.displayName ?? titleFromKey(marker.key) };
  }
  if (longHits.length > 1) {
    const best = longHits.sort((a, b) => longestAlias(b) - longestAlias(a))[0];
    const dict = matchBiomarker(raw);
    return { key: best.key, displayName: dict?.displayName ?? titleFromKey(best.key) };
  }

  const dict = matchBiomarker(raw);
  if (!dict) return null;
  if (!RYTHM_HEALTH_DOCUMENTED_MARKERS.some((m) => m.key === dict.key)) return null;
  return { key: dict.key, displayName: dict.displayName };
}

function longestAlias(marker: { aliases: readonly string[] }): number {
  return marker.aliases.reduce((max, alias) => Math.max(max, alias.length), 0);
}

function titleFromKey(key: string): string {
  const probe: Record<string, string> = {
    shbg: 'sex hormone binding globulin',
    free_testosterone: 'free testosterone',
    uric_acid: 'uric acid',
    remnant_cholesterol: 'remnant cholesterol',
    alp: 'alkaline phosphatase',
    ggt: 'gamma glutamyl',
    hscrp: 'hs-crp',
    vitamin_d: 'vitamin d',
    total_cholesterol: 'total cholesterol',
  };
  const dict = matchBiomarker(probe[key] ?? key.replace(/_/g, ' '));
  return dict?.displayName ?? key;
}

export function canonicalRythmMarkerName(raw: string): string {
  return matchRythmHealthMarker(raw)?.displayName ?? raw.trim();
}
